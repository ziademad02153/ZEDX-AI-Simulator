import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

class NextResponse extends Response {
  constructor(body, options) { super(body, options); this.cookieWrites = []; this.cookies = { set: (...args) => this.cookieWrites.push(args), delete: name => this.cookieWrites.push([name, '', { maxAge: 0 }]) }; }
  static json(body, options = {}) { return new NextResponse(JSON.stringify(body), { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } }); }
  static next() { return new NextResponse(null, { status: 200 }); }
  static redirect(url) { return new NextResponse(null, { status: 307, headers: { location: String(url) } }); }
}
function module(path, client, extras = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, {
    exports, Response, URL, Headers, Buffer, console: { error() {}, log() {}, warn() {} }, setTimeout, clearTimeout, AbortController, TextEncoder, TextDecoder, TransformStream,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://test.local', SUPABASE_SERVICE_ROLE_KEY: 'test-key', GROQ_API_KEY: 'test-key', NODE_ENV: 'production' } },
    require(name) {
      if (extras.modules?.[name]) return extras.modules[name];
      if (name === 'next/server') return { NextResponse };
      if (name === '@supabase/supabase-js') return { createClient: () => client };
      if (name === '@/lib/prompts') return { getSystemPrompt: () => 'test' };
      if (name === '@/lib/server-session') return { SERVER_SESSION_COOKIE: 'zedx_session' };
      if (name === 'node:crypto') return { createHmac };
      if (name === 'nodemailer') return { createTransport: () => ({ sendMail: extras.sendMail || (async () => {}) }) };
      throw new Error(name);
    }, ...extras,
  });
  return exports;
}
const request = (path, body, token = 'test-token') => new Request(`https://test.local${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
const client = rpc => ({ auth: { getUser: async () => ({ data: { user: { id: 'test-user' } } }) }, from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { tier: 'free', questions_asked: 16 } }) }) }) }), rpc });

for (const route of ['generate', 'generate-stream']) {
  test(`${route}: client-supplied report mode cannot bypass free usage limits`, async () => {
    let providerCalls = 0;
    const POST = module(`src/app/api/${route}/route.ts`, client(async name => ({ data: name === 'check_rate_limit' ? true : { allowed: false } })), { fetch: async () => { providerCalls++; } }).POST;
    for (const promptType of ['mock_interview', 'report_evaluator', 'chatbot']) {
      const response = await POST(request(`/api/${route}`, { promptType, model: 'openai/gpt-oss-20b', prompt: 'Test', messages: [] }));
      assert.equal(response.status, 403);
    }
    assert.equal(providerCalls, 0);
  });
  test(`${route}: unavailable quota checks reject instead of allowing paid API usage`, async () => {
    const POST = module(`src/app/api/${route}/route.ts`, client(async name => name === 'check_rate_limit' ? { data: true } : { error: { message: 'unavailable' } })).POST;
    assert.equal((await POST(request(`/api/${route}`, { promptType: 'mock_interview', messages: [] }))).status, 503);
  });
}

test('generate preserves automatic model fallback and releases only its own reservation on failure', async () => {
  const models = [];
  const released = [];
  const rpc = async (name, args) => { if (name === 'release_ai_question') released.push(args.p_reservation_id); return { data: name === 'check_rate_limit' ? true : { allowed: true, reservation_id: 'reservation-1' } }; };
  const POST = module('src/app/api/generate/route.ts', client(rpc), { fetch: async (_url, options) => {
    models.push(JSON.parse(options.body).model);
    return models.length === 1 ? Response.json({ error: { message: 'failed' } }, { status: 503 }) : Response.json({ choices: [{ message: { content: 'Test' } }] });
  } }).POST;
  assert.equal((await POST(request('/api/generate', { promptType: 'mock_interview', model: 'openai/gpt-oss-20b', prompt: 'Test' }))).status, 200);
  assert.deepEqual(models, ['openai/gpt-oss-20b', 'openai/gpt-oss-120b']);
  assert.equal(released.length, 0);
  const failed = module('src/app/api/generate/route.ts', client(rpc), { fetch: async () => Response.json({ error: { message: 'failed' } }, { status: 503 }) }).POST;
  assert.equal((await failed(request('/api/generate', { promptType: 'mock_interview', prompt: 'Test' }))).status, 500);
  assert.deepEqual(released, ['reservation-1']);
});

const contact = { firstName: 'Test', lastName: 'User', email: 'user@example.test', organization: 'Company', volume: '10', message: '<b>Test</b>', features: [] };
test('contact validates input, escapes mail content, rejects bots and enforces durable limits', async () => {
  let sent = 0;
  let limited = false;
  let received;
  const POST = module('src/app/api/contact/route.ts', { rpc: async () => ({ data: !limited }) }, { sendMail: async mail => { sent++; received = mail; } }).POST;
  assert.equal((await POST(request('/api/contact', { ...contact, email: 'bad\nemail' }))).status, 400);
  assert.equal((await POST(request('/api/contact', { ...contact, features: 'bad' }))).status, 400);
  assert.equal((await POST(request('/api/contact', { ...contact, website: 'bot' }))).status, 200);
  assert.equal(sent, 0);
  assert.equal((await POST(request('/api/contact', contact))).status, 200);
  assert.ok(received.html.includes('&lt;b&gt;Test&lt;/b&gt;'));
  limited = true;
  assert.equal((await POST(request('/api/contact', contact))).status, 429);
  assert.equal(sent, 1);
});

test('proxy ignores forged legacy login markers and verifies real sessions with Supabase', async () => {
  let validated;
  let valid = false;
  const middleware = module('src/proxy.ts', { auth: { getUser: async token => { validated = token; return { data: { user: valid ? { id: 'test' } : null }, error: valid ? null : {} }; } } }).default;
  const req = cookies => ({ url: 'https://test.local/dashboard', nextUrl: new URL('https://test.local/dashboard'), headers: new Headers(), cookies: { get: name => cookies[name] ? { value: cookies[name] } : undefined } });
  assert.equal((await middleware(req({ auth_token: 'a'.repeat(32) }))).status, 307);
  assert.equal(validated, undefined);
  assert.equal((await middleware(req({ zedx_session: 'forged' }))).status, 307);
  valid = true;
  assert.equal((await middleware(req({ zedx_session: 'real' }))).status, 200);
  assert.equal(validated, 'real');
});

test('session bridge authenticates tokens, sets HttpOnly cookies, rejects cross-origin requests and clears logout', async () => {
  let valid = true;
  const handlers = module('src/app/api/auth/session/route.ts', { auth: { getUser: async () => ({ data: { user: valid ? { id: 'test' } : null } }) } });
  const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 1800 })).toString('base64url')}.signature`;
  const response = await handlers.POST(request('/api/auth/session', {}, token));
  assert.equal(response.status, 200);
  assert.equal(response.cookieWrites[0][2].httpOnly, true);
  assert.equal(response.cookieWrites[0][2].secure, true);
  assert.ok(response.cookieWrites[0][2].maxAge > 0);
  valid = false;
  assert.equal((await handlers.POST(request('/api/auth/session', {}, token))).status, 401);
  const cross = new Request('https://test.local/api/auth/session', { method: 'POST', headers: { Origin: 'https://attacker.test', Authorization: `Bearer ${token}` } });
  assert.equal((await handlers.POST(cross)).status, 403);
  const logout = await handlers.DELETE(new Request('https://test.local/api/auth/session', { method: 'DELETE' }));
  assert.equal(logout.cookieWrites[0][0], 'zedx_session');
});

test('report download ignores URL credentials and checks report ownership using a header or HttpOnly cookie', async () => {
  let receivedToken;
  let owns = true;
  const filters = [];
  const client = {
    auth: { getUser: async token => { receivedToken = token; return { data: { user: { id: 'owner' } } }; } },
    from: () => ({ select: () => ({ eq: (field, value) => {
      filters.push([field, value]);
      return { eq: (field, value) => { filters.push([field, value]); return { single: async () => ({ data: owns ? { created_at: '2026-10-08', analysis: { rubric_report: { rubric_version: '1.3', candidate: {} } } } : null }) }; } };
    } }) }),
  };
  const GET = module('src/app/api/report/[id]/pdf/route.ts', client, { modules: {
    '@/lib/pdf-report-generator': { generateExecutiveReportHtml: () => '<html>Test</html>' },
    '@/lib/rubric-evaluator': { enforceRubric13ReportSchema: value => value },
    fs: { existsSync: () => false }, path: {}, os: {}, child_process: { execFile() {} }, util: { promisify: () => () => {} },
  } }).GET;
  const req = (url, token, cookie) => ({ nextUrl: new URL(url), headers: new Headers(token ? { Authorization: `Bearer ${token}` } : {}), cookies: { get: () => cookie ? { value: cookie } : undefined } });
  assert.equal((await GET(req('https://test.local/api/report/test/pdf?token=unsafe'), { params: Promise.resolve({ id: 'test' }) })).status, 401);
  assert.equal(receivedToken, undefined);
  const header = await GET(req('https://test.local/api/report/test/pdf', 'header-token'), { params: Promise.resolve({ id: 'test' }) });
  assert.equal(header.status, 200);
  assert.equal(header.headers.get('cache-control'), 'private, no-store');
  assert.equal(receivedToken, 'header-token');
  assert.ok(filters.some(([field, value]) => field === 'user_id' && value === 'owner'));
  assert.equal((await GET(req('https://test.local/api/report/test/pdf', null, 'cookie-token'), { params: Promise.resolve({ id: 'test' }) })).status, 200);
  assert.equal(receivedToken, 'cookie-token');
  owns = false;
  assert.equal((await GET(req('https://test.local/api/report/test/pdf', 'header-token'), { params: Promise.resolve({ id: 'other-user-report' }) })).status, 404);
});

test('database reservations enforce the last free slot, paid access, idempotent refunds, contact limits and service-only execution', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  const user = '11111111-1111-4111-8111-111111111111';
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE profiles(id uuid PRIMARY KEY, tier text, questions_asked integer, subscription_expires_at timestamptz);
    CREATE TABLE interviews(id uuid DEFAULT gen_random_uuid(), user_id uuid, created_at timestamptz DEFAULT now());
    INSERT INTO auth.users VALUES('${user}'); INSERT INTO profiles VALUES('${user}','free',15,NULL);
    GRANT ALL ON profiles, interviews TO service_role; GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;`);
  await db.exec(readFileSync(new URL('../supabase/migrations/202610080001_runtime_guards.sql', import.meta.url), 'utf8'));
  const reserve = async () => (await db.query('SELECT reserve_ai_question($1) AS result', [user])).rows[0].result;
  const results = await Promise.all([reserve(), reserve(), reserve()]);
  assert.equal(results.filter(value => value.allowed).length, 1);
  const id = results.find(value => value.allowed).reservation_id;
  await db.query('SELECT release_ai_question($1)', [id]);
  await db.query('SELECT release_ai_question($1)', [id]);
  assert.equal((await db.query('SELECT questions_asked FROM profiles')).rows[0].questions_asked, 15);
  await db.exec(`UPDATE profiles SET questions_asked=0; INSERT INTO interviews(user_id) SELECT '${user}'::uuid FROM generate_series(1,4);`);
  assert.equal((await reserve()).allowed, false);
  await db.exec("UPDATE profiles SET tier='pro', subscription_expires_at=now()+interval '1 day'");
  assert.equal((await reserve()).allowed, true);
  await db.exec("UPDATE profiles SET subscription_expires_at=now()-interval '1 day'");
  assert.equal((await reserve()).allowed, false);
  for (let index = 0; index < 4; index++) assert.equal((await db.query("SELECT consume_contact_limit('test',3,3600) AS allowed")).rows[0].allowed, index < 3);
  const rights = (await db.query("SELECT has_function_privilege('authenticated','reserve_ai_question(uuid)','EXECUTE') AS allowed, has_table_privilege('anon','contact_rate_limits','SELECT') AS readable")).rows[0];
  assert.equal(rights.allowed, false); assert.equal(rights.readable, false);
});
