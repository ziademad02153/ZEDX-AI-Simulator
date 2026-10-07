import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('payment migration protects entitlements and processes receipts atomically', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  const user = '11111111-1111-4111-8111-111111111111';
  const legacy1 = '22222222-2222-4222-8222-222222222222';
  const legacy2 = '33333333-3333-4333-8333-333333333333';
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TYPE public.user_tier AS ENUM ('free','pro','ultra');
    CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected');
    CREATE TABLE public.profiles (id uuid PRIMARY KEY, email text, full_name text, profession text,
      country text, tier public.user_tier DEFAULT 'free', questions_asked integer DEFAULT 0,
      subscription_expires_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz);
    CREATE TABLE public.pending_approvals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid,
      transaction_id text, payment_method text, amount numeric, currency text,
      status public.approval_status DEFAULT 'pending', created_at timestamptz DEFAULT now());
    CREATE FUNCTION public.increment_questions(uuid) RETURNS void LANGUAGE plpgsql AS 'BEGIN RETURN; END';
    CREATE FUNCTION public.check_rate_limit(uuid, integer) RETURNS boolean LANGUAGE sql AS 'SELECT true';
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT UPDATE (tier), INSERT (tier) ON public.profiles TO authenticated;
    INSERT INTO public.profiles(id,email) VALUES ('${user}', 'buyer@example.test');
    INSERT INTO public.pending_approvals(id,user_id,transaction_id,payment_method,amount,currency,status)
      VALUES ('${legacy1}','${user}',' SAME-REF ','instapay',300,'EGP','approved'),
        ('${legacy2}','${user}','same-ref','instapay',300,'EGP','rejected');
  `);
  const migration = await readFile(new URL('../supabase/migrations/202610070001_payment_integrity.sql', import.meta.url), 'utf8');
  try { await db.exec(migration); } catch (error) {
    console.error('Migration error:', error.message, error.position, error.internalPosition, error.internalQuery);
    throw error;
  }
  const query = async (sql, args = []) => (await db.query(sql, args)).rows;
  const profile = async () => (await query('SELECT tier, subscription_expires_at FROM public.profiles WHERE id=$1', [user]))[0];
  const approve = async id => query(`SELECT public.process_instapay_payment($1,'approve') AS result`, [id]);
  const sale = async (id, product = 'hkfdfv', refund = false, email = 'buyer@example.test') =>
    query('SELECT public.process_gumroad_payment($1,$2,$3,$4) AS result', [id, email, product, refund]);
  const submit = async (ref, amount = 300) => (await query(`INSERT INTO public.pending_approvals
    (user_id,transaction_id,payment_method,amount,currency) VALUES ($1,$2,'instapay',$3,'EGP') RETURNING id`, [user, ref, amount]))[0].id;

  await t.test('migration retains historical duplicates and never changes existing entitlements', async () => {
    assert.equal((await query('SELECT count(*)::int AS n FROM pending_approvals'))[0].n, 2);
    assert.equal((await profile()).tier, 'free');
    assert.equal((await query('SELECT state FROM payment_receipts'))[0].state, 'applied');
    await assert.rejects(submit('  SAME-REF  '), /duplicate key/);
  });
  await t.test('clients cannot change tier, expiry, usage or bypass it during profile creation', async () => {
    const [grants] = await query(`SELECT
      has_column_privilege('authenticated','public.profiles','tier','UPDATE') AS tier,
      has_column_privilege('authenticated','public.profiles','subscription_expires_at','UPDATE') AS expiry,
      has_column_privilege('authenticated','public.profiles','questions_asked','UPDATE') AS usage,
      has_column_privilege('authenticated','public.profiles','tier','INSERT') AS insert_tier,
      has_column_privilege('authenticated','public.profiles','profession','UPDATE') AS profession,
      has_function_privilege('anon','public.process_instapay_payment(uuid,text)','EXECUTE') AS rpc,
      has_function_privilege('authenticated','public.increment_questions(uuid)','EXECUTE') AS quota_rpc,
      has_table_privilege('anon','public.payment_receipts','SELECT') AS receipts`);
    assert.deepEqual(grants, { tier:false, expiry:false, usage:false, insert_tier:false, profession:true, rpc:false, quota_rpc:false, receipts:false });
  });
  await t.test('approval replay does not extend the subscription twice', async () => {
    const id = await submit('new-reference');
    await approve(id); const first = await profile(); await approve(id);
    assert.deepEqual(await profile(), first);
    await assert.rejects(query(`SELECT public.process_instapay_payment($1,'reject')`, [id]), /PAYMENT_ALREADY_PROCESSED/);
  });
  await t.test('distinct renewals accumulate and invalid amounts are rejected', async () => {
    const before = await profile(); await approve(await submit('second-reference'));
    assert.ok((await profile()).subscription_expires_at > before.subscription_expires_at);
    await assert.rejects(submit('wrong-amount', 1), /INVALID_PAYMENT/);
  });
  await t.test('profile, approval and receipt roll back together on any failure', async () => {
    const id = await submit('rollback-reference'); const before = await profile();
    await db.exec(`CREATE FUNCTION fail_approval() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.status='approved' THEN RAISE EXCEPTION 'simulated failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER fail_approval BEFORE UPDATE ON pending_approvals FOR EACH ROW EXECUTE FUNCTION fail_approval();`);
    await assert.rejects(approve(id), /simulated failure/);
    assert.deepEqual(await profile(), before);
    assert.equal((await query('SELECT status FROM pending_approvals WHERE id=$1', [id]))[0].status, 'pending');
    assert.equal((await query("SELECT state FROM payment_receipts WHERE external_id='rollback-reference'"))[0].state, 'pending');
    await db.exec('DROP TRIGGER fail_approval ON pending_approvals;');
  });
  await t.test('Gumroad deliveries are idempotent, exact-email only, and refunds restore prior access', async () => {
    const before = await profile(); await sale('sale-1'); const first = await profile();
    await sale('sale-1'); assert.deepEqual(await profile(), first);
    await sale('sale-1', 'hkfdfv', true); assert.deepEqual(await profile(), before);
    await sale('sale-1'); assert.deepEqual(await profile(), before);
    await assert.rejects(sale('wildcard-sale', 'hkfdfv', false, '%@example.test'));
  });
  await t.test('refund before purchase blocks stale deliveries, unknown product cannot revoke access', async () => {
    const before = await profile(); await sale('refund-first', 'hkfdfv', true); await sale('refund-first');
    await sale('unknown-sale', 'unrelated', true); assert.deepEqual(await profile(), before);
  });
  await t.test('refund of an older purchase preserves subsequent payments and flags review', async () => {
    await sale('older-sale'); await sale('newer-sale'); const before = await profile();
    assert.equal((await sale('older-sale', 'hkfdfv', true))[0].result.state, 'needs_review');
    assert.deepEqual(await profile(), before);
  });
  await t.test('active Ultra is not downgraded to Pro', async () => {
    await sale('ultra-sale', 'molojy'); const before = await profile();
    await assert.rejects(approve(await submit('downgrade-reference')), /ACTIVE_HIGHER_TIER/);
    assert.equal((await sale('downgrade-sale'))[0].result.state, 'needs_review');
    assert.deepEqual(await profile(), before);
  });
  await t.test('permanent paid grants are retained through purchases and refunds', async () => {
    await db.exec("UPDATE profiles SET tier='ultra', subscription_expires_at=NULL;");
    const before = await profile();
    assert.equal((await sale('permanent-sale','molojy'))[0].result.state, 'needs_review');
    await assert.rejects(approve(await submit('permanent-insta',600)), /PERMANENT_GRANT_REQUIRES_REVIEW/);
    await sale('permanent-sale','molojy',true); assert.deepEqual(await profile(),before);
  });
  await t.test('service role can execute the atomic payment workflow with RLS enabled', async () => {
    await db.exec("UPDATE profiles SET tier='free', subscription_expires_at=NULL;");
    await db.exec('SET ROLE service_role;');
    await approve(await submit('service-role-reference',600));
    await db.exec('RESET ROLE;');
  });
});
