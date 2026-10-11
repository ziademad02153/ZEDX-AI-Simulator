import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/interview-speech-progress.ts', import.meta.url), 'utf8');
function runtime() {
    const exports = {}, frames = new Map(); let id = 0, now = 0;
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
        { exports, Intl, performance: { now: () => now }, requestAnimationFrame: fn => { frames.set(++id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id) });
    return { api: exports, tick: time => { now = time; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(time)); }, frames };
}
class Speech extends EventTarget {
    paused = true; ended = false; readyState = 4; currentTime = 0; duration = 4; rate = 1;
    emit(type, values = {}) { const event = new Event(type); Object.assign(event, values); this.dispatchEvent(event); }
}

test('all 30 real language question samples reveal whole words and preserve text exactly', () => {
    const { api } = runtime(), exports = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/languages.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
    assert.equal(exports.SUPPORTED_LANGUAGES.length, 30);
    for (const language of exports.SUPPORTED_LANGUAGES) {
        const words = api.speechWords(language.q2, language.code);
        assert.ok(words.length > 1, language.code);
        assert.equal(words.at(-1).end, language.q2.length, language.code);
        assert.ok(words.every((word, i) => i === 0 || word.start >= words[i - 1].end), language.code);
    }
});

test('actual media clock drives progression; waiting, pause, cancellation and completion are respected', () => {
    const { api, tick, frames } = runtime(), media = new Speech(), results = [];
    let active = true;
    api.followMediaSpeech(media, { text: 'One two three four.', language: 'en-US', active: () => active, reveal: text => results.push(text) });
    tick(0); assert.equal(results.length, 0, 'no text before audio starts');
    media.paused = false; tick(16); assert.equal(results.at(-1), 'One ');
    media.currentTime = 1.4; tick(32); assert.equal(results.at(-1), 'One two ');
    media.paused = true; media.currentTime = 2.3; tick(48); assert.equal(results.at(-1), 'One two ');
    media.paused = false; media.readyState = 1; tick(64); assert.equal(results.at(-1), 'One two ');
    media.readyState = 4; tick(80); assert.equal(results.at(-1), 'One two three ');
    media.emit('ended'); assert.equal(results.at(-1), 'One two three four.'); assert.equal(frames.size, 0);
    active = false; media.emit('ended'); assert.equal(results.length, 4);
});

test('provider timestamps override estimates and invalid alignment safely uses the media clock', () => {
    const { api, tick } = runtime(), media = new Speech(), text = 'Hi Ziad.';
    const alignment = { characters: [...text], character_start_times_seconds: [0, .1, .2, 2, 2.1, 2.2, 2.3, 2.4], character_end_times_seconds: [] };
    const results = [];
    api.followMediaSpeech(media, { text, language: 'en-US', alignment, active: () => true, reveal: value => results.push(value) });
    media.paused = false; media.currentTime = 1.9; tick(0); assert.equal(results.at(-1), 'Hi ');
    media.currentTime = 2; tick(16); assert.equal(results.at(-1), text);
    assert.equal(api.alignmentWordStarts(text, api.speechWords(text, 'en-US'), { ...alignment, characters: ['x'] }), undefined);
    assert.equal(api.alignmentWordStarts(text, api.speechWords(text, 'en-US'), { ...alignment, character_start_times_seconds: [0, NaN] }), undefined);
});

test('native real boundaries map phonetic names back to original text and suspend estimation', () => {
    const { api, tick, frames } = runtime(), utterance = new Speech(), results = [];
    const text = 'Hi Ziad, welcome to ZEDX.';
    const map = api.spokenTextMap(text, part => part.replace('Ziad', 'Zee-yad').replace('ZEDX', 'Zeddex'));
    api.followNativeSpeech(utterance, { text, language: 'en-US', originalIndex: map.originalIndex, active: () => true, reveal: value => results.push(value) });
    tick(0); assert.equal(results.length, 0);
    utterance.emit('start'); assert.equal(results.at(-1), 'Hi ');
    utterance.emit('boundary', { name: 'word', charIndex: map.text.indexOf('Zee-yad') });
    assert.equal(results.at(-1), 'Hi Ziad, ');
    tick(10000); assert.equal(results.at(-1), 'Hi Ziad, ', 'exact boundary mode must not advance by a timer');
    utterance.emit('boundary', { name: 'word', charIndex: map.text.indexOf('welcome') });
    assert.equal(results.at(-1), 'Hi Ziad, welcome ');
    utterance.emit('end'); assert.equal(results.at(-1), text); assert.equal(frames.size, 0);
});

test('native fallback waits for start and freezes on pause; stale events do not reveal old questions', () => {
    const { api, tick, frames } = runtime(), utterance = new Speech(), results = [];
    let active = true;
    api.followNativeSpeech(utterance, { text: 'One two three four.', language: 'en-US', originalIndex: i => i, active: () => active, reveal: value => results.push(value) });
    tick(5000); assert.equal(results.length, 0);
    utterance.emit('start'); tick(5600); assert.ok(results.at(-1).length > 4);
    utterance.emit('pause'); const previous = results.at(-1); tick(9000); assert.equal(results.at(-1), previous);
    active = false; tick(10000); utterance.emit('end'); assert.equal(results.at(-1), previous); assert.equal(frames.size, 0);
});

test('Amy chunk offsets preserve repeated words, newlines, punctuation and original spacing', () => {
    const { api } = runtime(), text = 'Tell me.\n\nTell   me about C++ (and React)?';
    const first = api.locateSpeechChunk(text, 'Tell me.', 0);
    const second = api.locateSpeechChunk(text, 'Tell me about C++ (and React)?', first.end);
    assert.equal(text.slice(second.start, second.end), 'Tell   me about C++ (and React)?');
    assert.equal(second.end, text.length);
});
