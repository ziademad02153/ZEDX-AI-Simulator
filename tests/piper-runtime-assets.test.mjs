import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createHash } from 'node:crypto';

const code = ts.transpileModule(readFileSync(new URL('../src/lib/piper-runtime-assets.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const paths = { piperWasm: 'https://assets.test/voice.wasm', piperData: 'https://assets.test/voice.data', onnxWasm: 'https://assets.test/onnx/' };
test('runtime assets are local blobs and cached copies work without network on the next visit', async () => {
    const saved = new Map(); let downloads = 0;
    const exports = {};
    vm.runInNewContext(code, { exports, URL, Response, Blob, caches: { open: async () => ({ match: async url => saved.get(url)?.clone(), put: async (url, res) => saved.set(url, res) }) }, fetch: async () => { if (++downloads > 2) throw Error('offline'); return new Response('runtime bytes'); } });
    for (let visit = 0; visit < 2; visit++) {
        const result = await exports.preparePiperRuntime(paths);
        assert.match(result.piperWasm, /^blob:/); assert.match(result.piperData, /^blob:/);
        assert.equal(result.onnxWasm, paths.onnxWasm);
        assert.equal(await (await fetch(result.piperData)).text(), 'runtime bytes');
        URL.revokeObjectURL(result.piperWasm); URL.revokeObjectURL(result.piperData);
    }
    assert.equal(downloads, 2);
});
test('failed asset preparation rejects before readiness and releases partial buffers', async () => {
    const exports = {}; const revoked = []; let downloads = 0;
    vm.runInNewContext(code, { exports, caches: { open: async () => { throw Error('storage unavailable'); } }, URL: { createObjectURL: () => 'blob:partial', revokeObjectURL: url => revoked.push(url) }, fetch: async () => ++downloads === 1 ? new Response('wasm') : new Response('', { status: 503 }) });
    await assert.rejects(exports.preparePiperRuntime(paths), /503/);
    assert.deepEqual(revoked, []);
});
test('bundled runtime parts reconstruct the original Piper file exactly', () => {
    const base = new URL('../public/voices/piper-runtime/', import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL('data-manifest.json', base), 'utf8'));
    const parts = manifest.parts.map(name => readFileSync(new URL(name, base)));
    assert.ok(parts.every(part => part.length > 0 && part.length <= 1048576));
    const data = Buffer.concat(parts);
    assert.equal(data.length, manifest.bytes);
    assert.equal(createHash('sha256').update(data).digest('hex'), manifest.sha256);
});
