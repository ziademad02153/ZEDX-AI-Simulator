import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import https from 'node:https';

// Run against a running Next server: SEO_TEST_URL=http://localhost:3107 node --test tests/seo-routes.test.mjs
const baseUrl = process.env.SEO_TEST_URL || 'http://localhost:3107';
const publicPaths = ['', '/about', '/pricing', '/download', '/contact-sales', '/privacy', '/terms'];
const request = (path, headers = {}) => fetch(`${baseUrl}${path}`, {
  redirect: 'manual',
  headers: { 'user-agent': 'Googlebot', ...headers },
});

for (const path of publicPaths) {
  test(`public ${path || '/'} has its own canonical without tracking parameters`, async () => {
    const response = await request(`${path}/?utm_source=seo-test`);
    // Next normalizes a trailing slash before serving the page.
    const page = response.status === 308 ? await request(`${path || '/'}?utm_source=seo-test`) : response;
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('x-robots-tag'), null);
    const html = await page.text();
    const canonicals = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/g)];
    assert.equal(canonicals.length, 1);
    assert.match(canonicals[0][0], new RegExp(`href="https://zedx-ai\\.tech${path}"`));
  });
}

test('www permanently redirects while preserving the path and query', async () => {
  // Node fetch may replace Host; use the HTTP client to exercise host-based routing.
  const url = new URL('/about?utm_source=seo-test', baseUrl);
  const client = url.protocol === 'https:' ? https : http;
  const response = await new Promise((resolve, reject) => {
    client.get(url, { headers: { host: 'www.zedx-ai.tech' } }, (result) => {
      result.resume();
      resolve(result);
    }).on('error', reject);
  });
  assert.equal(response.statusCode, 308);
  assert.equal(response.headers.location, 'https://zedx-ai.tech/about?utm_source=seo-test');
});

for (const path of ['/login', '/onboarding', '/auth/callback', '/dashboard', '/dashboard/history', '/admin/payments', '/mock-interview', '/interview', '/desktop-assistant', '/desktop', '/scanner-frame']) {
  test(`${path} is excluded from search`, async () => {
    const response = await request(path);
    assert.ok([200, 307, 308].includes(response.status), `Unexpected status ${response.status}`);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex');
    await response.body?.cancel();
  });
}

test('sitemap includes only the canonical public pages', async () => {
  const response = await request('/sitemap.xml');
  assert.equal(response.status, 200);
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(urls.sort(), publicPaths.map((path) => `https://zedx-ai.tech${path}`).sort());
});

test('robots allows rendering assets and advertises the canonical sitemap', async () => {
  const response = await request('/robots.txt');
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /Sitemap: https:\/\/zedx-ai\.tech\/sitemap\.xml/);
  assert.doesNotMatch(body, /Disallow: \/(?:_next|static)/);
});
