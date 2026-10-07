import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function route(path, client, env = {}) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  const sandbox = {
    exports, URL, console: { error() {} }, process: { env },
    require(name) {
      if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === '@supabase/supabase-js') return { createClient: () => client };
      if (name === 'nodemailer') return { createTransport: () => ({ sendMail: async () => {} }) };
      throw new Error(`Unexpected dependency: ${name}`);
    }
  };
  vm.runInNewContext(code, sandbox);
  return exports.POST;
}

const env = { ADMIN_SECRET_KEY:'test-admin-key', GUMROAD_WEBHOOK_SECRET:'test-webhook-key', SUPABASE_SERVICE_ROLE_KEY:'test-service-key' };
const uuid = '11111111-1111-4111-8111-111111111111';
const jsonRequest = (body, authenticated = true) => new Request('https://example.test/api', {
  method:'POST', headers:{ 'Content-Type':'application/json', ...(authenticated ? { 'x-admin-key':env.ADMIN_SECRET_KEY } : {}) }, body:JSON.stringify(body)
});
const webhook = (fields, secret = env.GUMROAD_WEBHOOK_SECRET) => new Request(`https://example.test/api?secret=${secret}`, {
  method:'POST', body:new URLSearchParams(fields)
});

test('admin uses one atomic RPC and maps replay/conflict errors', async () => {
  let calls = 0;
  const POST = await route('src/app/api/admin/payments/action/route.ts', {
    rpc: async (name, payload) => {
      calls++; assert.equal(name,'process_instapay_payment'); assert.equal(payload.p_approval_id,uuid);
      return { data:{ success:true, already_processed:true }, error:null };
    }
  }, env);
  assert.equal((await POST(jsonRequest({ id:uuid,action:'approve' },false))).status,401);
  assert.equal((await POST(jsonRequest({ id:'not-a-uuid',action:'approve' }))).status,400);
  const response = await POST(jsonRequest({ id:uuid,action:'approve' }));
  assert.equal(response.status,200); assert.equal((await response.json()).already_processed,true); assert.equal(calls,1);
  const conflict = await route('src/app/api/admin/payments/action/route.ts', { rpc:async () => ({ error:{ code:'P0001',message:'ACTIVE_HIGHER_TIER' } }) }, env);
  assert.equal((await conflict(jsonRequest({ id:uuid,action:'approve' }))).status,409);
});

test('Gumroad rejects unauthenticated/missing-ID events and ignores tests/unknown products', async () => {
  let calls = 0;
  const POST = await route('src/app/api/payments/gumroad-webhook/route.ts', { rpc:async () => { calls++; return { data:{ success:true },error:null }; } },env);
  assert.equal((await POST(webhook({ email:'a@example.test',permalink:'hkfdfv' },'wrong'))).status,401);
  assert.equal((await POST(webhook({ email:'a@example.test',permalink:'hkfdfv' }))).status,400);
  assert.equal((await POST(webhook({ permalink:'unrelated',refunded:'true' }))).status,200);
  assert.equal((await POST(webhook({ permalink:'hkfdfv',test:'true' }))).status,200);
  assert.equal(calls,0);
});

test('Gumroad accepts product URLs, real sale IDs and chargeback field variants', async () => {
  let args;
  const POST = await route('src/app/api/payments/gumroad-webhook/route.ts', { rpc:async (name,payload) => { assert.equal(name,'process_gumroad_payment'); args=payload; return { data:{ success:true },error:null }; } },env);
  assert.equal((await POST(webhook({ email:'buyer@example.test',sale_id:'sale-1',product_permalink:'https://ziademad5.gumroad.com/l/hkfdfv',chargedback:'true' }))).status,200);
  assert.equal(args.p_product,'hkfdfv'); assert.equal(args.p_refunded,true); assert.equal(args.p_sale_id,'sale-1');
  await POST(webhook({ email:'buyer@example.test',sale_id:'sale-1',permalink:'hkfdfv',refunded:'true',partially_refunded:'true' }));
  assert.equal(args.p_refunded,false);
});

test('Instapay rejects unknown tiers, empty references and missing login', async () => {
  const POST = await route('src/app/api/payments/instapay/route.ts', {},env);
  assert.equal((await POST(jsonRequest({ tier:'free',transactionId:'valid' }))).status,400);
  assert.equal((await POST(jsonRequest({ tier:'pro',transactionId:'  ' }))).status,400);
  assert.equal((await POST(jsonRequest({ tier:'pro',transactionId:'valid' }))).status,401);
});

test('Instapay normalizes references and handles a database duplicate as conflict', async () => {
  let inserted;
  const POST = await route('src/app/api/payments/instapay/route.ts', {
    auth:{ getUser:async () => ({ data:{ user:{ id:uuid,email:'buyer@example.test' } },error:null }) },
    from(table) {
      if (table==='profiles') return { select:() => ({ eq:() => ({ single:async () => ({ data:{ tier:'free',subscription_expires_at:null },error:null }) }) }) };
      return { insert:async payload => { inserted=payload; return { error:{ code:'23505' } }; } };
    }
  },env);
  const response = await POST(new Request('https://example.test/api', {
    method:'POST',headers:{ 'Content-Type':'application/json',Authorization:'Bearer test-token' },
    body:JSON.stringify({ tier:'pro',transactionId:'  UNIQUE-REF  ' })
  }));
  assert.equal(response.status,409); assert.equal(inserted.transaction_id,'unique-ref'); assert.equal(inserted.amount,300);
});
