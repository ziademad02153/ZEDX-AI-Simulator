import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
function setup(fail = false) {
    const state = { rendered: 0, added: 0, removed: 0, clicked: 0, opened: 0, revoked: [] };
    const pdfBlob = new Blob(['%PDF-1.3 test'], { type: 'application/pdf' });
    const frame = { style: {}, setAttribute() {}, remove() { state.removed++; },
        contentDocument: { createElement: () => ({}), head: { appendChild() {} }, fonts: { ready: Promise.resolve() }, images: [], querySelectorAll: () => [{}, {}] } };
    const link = { click() { state.clicked++; }, remove() {} };
    const exports = {};
    const timers = [];
    const PDF = class { addPage() { state.added++; } addImage() {} output(type) { assert.equal(type, 'blob'); return pdfBlob; } };
    vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/download-report-pdf.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
    }).outputText, { exports, Blob, setTimeout: (callback, delay) => { if (delay === 30000) timers.push(callback); return 1; }, clearTimeout() {},
        URL: { createObjectURL: blob => { assert.equal(blob, pdfBlob); return 'blob:report'; }, revokeObjectURL: url => state.revoked.push(url) },
        document: { createElement: tag => tag === 'iframe' ? frame : link, body: { appendChild: element => { if (element === frame) queueMicrotask(() => frame.onload()); } } },
        require: name => name === 'html2canvas' ? async () => { if (fail) throw Error('render failed'); state.rendered++; return { width: 1588, height: 2246 }; } : { jsPDF: PDF }
    });
    return { exports, state, link, timers };
}
test('direct PDF download builds each report page and clicks a download link, without opening a tab', async () => {
    const { exports, state, link, timers } = setup();
    await exports.downloadReportPdf('<html>Report</html>', 'Ziad: Report.pdf');
    assert.equal(state.rendered, 2);
    assert.equal(state.added, 1);
    assert.equal(state.removed, 1);
    assert.equal(state.clicked, 1);
    assert.equal(link.download, 'Ziad_ Report.pdf');
    assert.equal(link.href, 'blob:report');
    assert.equal(state.revoked.length, 0);
    timers[0]();
    assert.deepEqual(state.revoked, ['blob:report']);
});
test('render failures clean up the hidden frame and never pretend a PDF was downloaded', async () => {
    const { exports, state } = setup(true);
    await assert.rejects(exports.downloadReportPdf('report', 'report.pdf'), /render failed/);
    assert.equal(state.removed, 1);
    assert.equal(state.clicked, 0);
});
