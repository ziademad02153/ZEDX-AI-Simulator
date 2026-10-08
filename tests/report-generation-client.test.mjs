import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function client(fetch, browser) {
    const source = readFileSync(new URL('../src/app/dashboard/report/[id]/page.tsx', import.meta.url), 'utf8');
    const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let handler;
    function visit(node) {
        if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'generateReport') handler = node.initializer;
        ts.forEachChild(node, visit);
    }
    visit(ast);
    assert.ok(handler);
    const timers = new Map();
    const states = { generating: [], errors: [], reports: [] };
    const exports = {};
    let timerId = 0;
    vm.runInNewContext(ts.transpileModule(`exports.generate = ${handler.getText(ast)};`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 }
    }).outputText, {
        exports, id: 'test-interview', generationRequest: { current: null }, AbortController, JSON, URL, URLSearchParams,
        ...(browser ? { window: browser } : {}),
        setTimeout: (callback, ms) => { timers.set(++timerId, { callback, ms }); return timerId; },
        clearTimeout: id => timers.delete(id),
        supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) } },
        fetch, console: { warn() {} },
        setIsGenerating: value => states.generating.push(value), setGenerationError: value => states.errors.push(value),
        setRubricReport: value => states.reports.push(value), setScorecard() {}
    });
    return { generate: exports.generate, timers, states };
}

test('only one evaluation runs during duplicate starts, and the deadline includes reading the body', async () => {
    let completeBody;
    let calls = 0;
    const app = client(async () => {
        calls++;
        return { ok: true, json: () => new Promise(resolve => { completeBody = resolve; }) };
    });
    const first = app.generate({});
    await new Promise(resolve => setImmediate(resolve));
    await app.generate({});
    assert.equal(calls, 1);
    assert.equal([...app.timers.values()][0].ms, 125000);
    completeBody({ rubric_report: { rubric_version: '1.3' } });
    await first;
    assert.equal(app.timers.size, 0);
    assert.equal(app.states.reports.length, 1);
    assert.equal(app.states.generating.at(-1), false);
});

test('network failure clears the timer and allows a successful manual retry', async () => {
    let calls = 0;
    const app = client(async () => {
        if (++calls === 1) throw new Error('Network failed');
        return { ok: true, json: async () => ({ rubric_report: { rubric_version: '1.3' } }) };
    });
    await app.generate({});
    assert.equal(app.states.errors.at(-1), true);
    assert.equal(app.timers.size, 0);
    await app.generate({});
    assert.equal(app.states.errors.at(-1), false);
    assert.equal(app.states.reports.length, 1);
    assert.equal(app.timers.size, 0);
});

test('a deadline abort shows a retry state and clears the timer', async () => {
    const app = client(async (_url, { signal }) => new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason));
    }));
    const loading = app.generate({});
    await new Promise(resolve => setImmediate(resolve));
    [...app.timers.values()][0].callback();
    await loading;
    assert.equal(app.states.errors.at(-1), true);
    assert.equal(app.states.generating.at(-1), false);
    assert.equal(app.timers.size, 0);
});

test('explicit regeneration reaches the API and is removed from the URL only after success', async () => {
    let submitted;
    let replaced;
    const browser = { location: { search: '?regenerate=rubric&keep=value', href: 'https://test.local/dashboard/report/test-interview?regenerate=rubric&keep=value' }, history: { state: null, replaceState: (_state, _title, url) => { replaced = url; } } };
    const app = client(async (_url, options) => { submitted = JSON.parse(options.body); return { ok: true, json: async () => ({ rubric_report: { rubric_version: '1.3' } }) }; }, browser);
    await app.generate({});
    assert.equal(submitted.regenerate, true);
    assert.equal(submitted.interviewId, 'test-interview');
    assert.equal(new URL(replaced).searchParams.has('regenerate'), false);
    assert.equal(new URL(replaced).searchParams.get('keep'), 'value');
});

test('failed regeneration retains the URL flag for a genuine retry', async () => {
    let replacements = 0;
    const browser = { location: { search: '?regenerate=rubric', href: 'https://test.local/?regenerate=rubric' }, history: { replaceState: () => { replacements++; } } };
    const app = client(async () => { throw new Error('offline'); }, browser);
    await app.generate({});
    assert.equal(replacements, 0);
    assert.equal(app.states.errors.at(-1), true);
});
