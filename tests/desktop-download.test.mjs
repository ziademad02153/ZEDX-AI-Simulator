import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync('src/app/api/desktop-download/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
function route(profile, options = {}) {
    const exports = {};
    const calls = [];
    vm.runInNewContext(code, {
        exports, Date, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test' } },
        require(name) {
            if (name === 'next/server') {
                class NextResponse extends Response { static json = Response.json; }
                return { NextResponse };
            }
            if (name === '@/lib/server-session') return { SERVER_SESSION_COOKIE: 'zedx_session' };
            if (name === '@supabase/supabase-js') return { createClient: (_url, _key, config) => {
                calls.push(config);
                return {
                    auth: { getUser: async token => {
                        if (options.throw) throw new Error('network failure');
                        return { data: { user: token === 'valid' ? { id: 'verified-user', user_metadata: { tier: 'ultra' } } : null }, error: null };
                    } },
                    from: table => ({ select: () => ({ eq: (key, id) => {
                        assert.equal(table, 'profiles'); assert.equal(key, 'id'); assert.equal(id, 'verified-user');
                        return { single: async () => ({ data: profile, error: options.profileError ? { message: 'unavailable' } : null }) };
                    } }) }),
                };
            } };
            throw new Error(name);
        },
    });
    return { ...exports, calls };
}
function req(token, cookie, check = false) {
    return { headers: new Headers(token ? { Authorization: `Bearer ${token}` } : {}), cookies: { get: name => name === 'zedx_session' && cookie ? { value: cookie } : undefined }, nextUrl: new URL(`https://example.test/api/desktop-download${check ? '?check=1' : ''}`) };
}
test('missing or invalid credentials cannot obtain the installer', async () => {
    const r = route({ tier: 'ultra', subscription_expires_at: null });
    for (const request of [req(), req('forged')]) {
        for (const method of [r.GET, r.POST]) assert.equal((await method(request)).status, 401);
    }
    assert.equal(r.calls.length, 2);
});
for (const profile of [
    { tier: 'free', subscription_expires_at: null },
    { tier: 'pro', subscription_expires_at: null },
    { tier: 'ultra', subscription_expires_at: new Date(Date.now() - 1000).toISOString() },
    { tier: 'ultra', subscription_expires_at: 'invalid' },
    { tier: 'ultra', subscription_expires_at: '' },
]) test(`denies ${profile.tier} with expiry ${profile.subscription_expires_at}`, async () => {
    const r = route(profile);
    for (const method of [r.GET, r.POST]) {
        const result = await method(req('valid'));
        assert.equal(result.status, 403);
        assert.equal(result.headers.get('location'), null);
        assert.equal((await result.json()).url, undefined);
    }
});
test('active and permanent Ultra are checked again for each download; credentials are not cached', async () => {
    for (const expiry of [null, new Date(Date.now() + 60000).toISOString()]) {
        const profile = { tier: 'ultra', subscription_expires_at: expiry };
        const r = route(profile);
        const check = await r.GET(req('valid', undefined, true));
        assert.deepEqual(await check.json(), { available: true });
        const direct = await r.GET(req(undefined, 'valid'));
        assert.equal(direct.status, 307);
        assert.match(direct.headers.get('location'), /ZEDX\.AI\.Setup/);
        assert.equal(direct.headers.get('cache-control'), 'private, no-store');
        const result = await r.POST(req('valid'));
        assert.match((await result.json()).url, /^https:\/\/github.com\//);
        profile.tier = 'free';
        assert.equal((await r.POST(req('valid'))).status, 403);
        assert.equal(r.calls[0].global.headers.Authorization, 'Bearer valid');
    }
});
test('missing profile, profile errors and network errors fail closed', async () => {
    for (const r of [route(null), route({ tier: 'ultra' }, { profileError: true }), route(null, { throw: true })]) {
        assert.equal((await r.GET(req('valid'))).status, 503);
        assert.equal((await r.POST(req('valid'))).status, 503);
    }
});
