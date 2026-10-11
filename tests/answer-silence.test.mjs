import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = readFileSync(new URL('../src/lib/answer-silence.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports });
const signal = level => Float32Array.from({ length: 1024 }, (_, i) => level * Math.sin(i * 0.2));

function fixture() {
    let submitted = 0, started = 0;
    const detector = exports.createAnswerSilenceDetector(() => submitted++, () => started++);
    return { detector, sample: (level, time, listening = true) => detector.sample(signal(level), time, listening), counts: () => ({ submitted, started }) };
}

test('waiting in silence does not submit an empty answer; an isolated click does not start one', () => {
    const f = fixture();
    f.sample(0, 0); f.sample(0, 10000);
    f.sample(0.2, 10100); f.sample(0, 10200); f.sample(0, 14000);
    assert.deepEqual(f.counts(), { submitted: 0, started: 0 });
});

test('PCM speech followed by exactly three seconds of silence submits once without recognition events', () => {
    const f = fixture();
    f.sample(0.04, 0); f.sample(0.04, 200); f.sample(0.04, 1000);
    f.sample(0.001, 3999);
    assert.equal(f.counts().submitted, 0);
    f.sample(0.001, 4000); f.sample(0, 6000);
    assert.deepEqual(f.counts(), { submitted: 1, started: 1 });
});

test('resuming speech within the pause restarts the three-second silence interval', () => {
    const f = fixture();
    f.sample(0.04, 0); f.sample(0.04, 200); f.sample(0, 3000);
    f.sample(0.04, 3100); f.sample(0, 6099);
    assert.equal(f.counts().submitted, 0);
    f.sample(0, 6100);
    assert.equal(f.counts().submitted, 1);
});

test('interviewer audio does not trigger submission, and consecutive answers each submit once', () => {
    const f = fixture();
    f.sample(0.2, 0, false); f.sample(0.2, 1000, false); f.sample(0, 5000, false);
    assert.equal(f.counts().started, 0);
    for (let turn = 0; turn < 50; turn++) {
        f.detector.reset();
        const at = 6000 + turn * 5000;
        f.sample(0.04, at); f.sample(0.04, at + 200);
        f.sample(0, at + 3199);
        assert.equal(f.counts().submitted, turn);
        f.sample(0, at + 3200); f.sample(0, at + 4000);
        assert.equal(f.counts().submitted, turn + 1);
    }
});

test('quiet audible PCM above the configured energy threshold still completes after three seconds', () => {
    const f = fixture();
    f.sample(0.012, 0); f.sample(0.012, 200);
    f.sample(0.001, 3199);
    assert.equal(f.counts().submitted, 0);
    f.sample(0.001, 3200);
    assert.equal(f.counts().submitted, 1);
});

test('low steady background energy does not start an answer or extend its silence interval', () => {
    const f = fixture();
    for (let time = 0; time <= 1000; time += 100) f.sample(0.003, time);
    assert.equal(f.counts().started, 0);
    f.sample(0.04, 1100); f.sample(0.04, 1300);
    for (let time = 1400; time < 4300; time += 100) f.sample(0.003, time);
    assert.equal(f.counts().submitted, 0);
    f.sample(0.003, 4300);
    assert.equal(f.counts().submitted, 1);
});

test('documents the energy-detector limit: loud continuous noise prevents a silence endpoint', () => {
    const f = fixture();
    f.sample(0.04, 0); f.sample(0.04, 200);
    for (let time = 300; time <= 10000; time += 100) f.sample(0.02, time);
    assert.equal(f.counts().submitted, 0);
    f.sample(0, 13000);
    assert.equal(f.counts().submitted, 1);
});

test('documents the quiet-speech limit: sub-threshold samples cannot be recognized as speech', () => {
    const f = fixture();
    for (let time = 0; time <= 1000; time += 100) f.sample(0.005, time);
    f.sample(0, 4000);
    assert.deepEqual(f.counts(), { submitted: 0, started: 0 });
});
