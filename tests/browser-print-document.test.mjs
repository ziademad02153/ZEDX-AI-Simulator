import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/browser-print-document.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, { exports });
test('HTML fallback exposes a safe save button and opens print after fonts and layout are ready', async () => {
    const html = exports.addBrowserPrintControls('<html><body><main>Report</main></body></html>', 'Save <PDF>');
    assert.ok(html.includes('Save &lt;PDF&gt;'));
    assert.ok(html.includes('onclick="window.print()"'));
    assert.match(html, /@media print[^}]*zedx-print-controls[^}]*display: none/);
    let onLoad;
    let printed = 0;
    let ready;
    const fontReady = new Promise(resolve => { ready = resolve; });
    vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], {
        window: { addEventListener: (event, callback) => { assert.equal(event, 'load'); onLoad = callback; }, print: () => printed++ },
        document: { fonts: { ready: fontReady } }, requestAnimationFrame: callback => callback()
    });
    const loading = onLoad();
    assert.equal(printed, 0);
    ready();
    await loading;
    assert.equal(printed, 1);
});
