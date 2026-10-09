// Live provider verification with synthetic input only; no real database or account operations.
import vm from 'node:vm';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import nextEnv from '@next/env';
if (!process.argv.includes('--live')) throw new Error('Pass --live for synthetic provider verification');
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'synthetic-owner' } }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { tier: 'ultra', subscription_expires_at: null } }) }) }) }),
    rpc: async name => ({ data: name === 'reserve_ai_question' ? { allowed: true, reservation_id: 'synthetic-turn' } : true })
};
const cache = new Map();
function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    vm.runInNewContext(ts.transpileModule(readFileSync(path.join(process.cwd(), file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText, { exports, process, fetch, Request, Response, Blob, File, FormData, AbortController, setTimeout, clearTimeout,
        console: { log() {}, warn() {}, error() {} }, require(name) {
            if (name === 'next/server') return { NextResponse: { json: (body, options) => Response.json(body, options) } };
            if (name === '@supabase/supabase-js') return { createClient: () => client };
            if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
            if (name === './languages') return load('src/lib/languages.ts');
            throw new Error(`Unexpected dependency ${name}`);
        }
    });
    return exports;
}
const results = [];
const form = new FormData();
form.append('file', new Blob([readFileSync('.data/qa-answer.wav')], { type: 'audio/wav' }), 'qa-answer.wav');
form.append('language', 'en-US'); form.append('purpose', 'web_mock_interview');
const started = Date.now();
const transcription = await load('src/app/api/transcribe/route.ts').POST(new Request('https://test.local/api/transcribe', {
    method: 'POST', headers: { Authorization: 'Bearer synthetic-test' }, body: form
}));
const transcript = await transcription.json();
const audioResult = { kind: 'audio-transcription', status: transcription.status, seconds: (Date.now() - started) / 1000,
    text: transcript.text, preservedTerms: /Python/i.test(transcript.text || '') && /React/i.test(transcript.text || '') && /thirty percent|30%|30 percent/i.test(transcript.text || '') };
results.push(audioResult); console.log(JSON.stringify(audioResult));
const fixtures = [
    { language: 'en-US', q: 'Describe a situation where you took a leadership role, the actions you took and the outcome.', a: 'I coordinated firmware and QA teams, agreed acceptance criteria and reviewed results weekly.' },
    { language: 'en-US', q: 'What performance problem did you face, how did you fix it and what was the result?', a: 'The voice pipeline was slow. I changed its buffering.' },
    { language: 'fr-FR', q: 'Comment avez-vous amélioré la performance du système, et quel résultat avez-vous obtenu ?', a: "Les réponses étaient lentes. J'ai ajouté un cache." }
];
for (const fixture of fixtures) {
    const before = Date.now();
    const history = [{ q: fixture.q, a: fixture.a, type: 'main' }];
    const response = await load('src/app/api/generate/route.ts').POST(new Request('https://test.local/api/generate', {
        method: 'POST', headers: { Authorization: 'Bearer synthetic-test', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openai/gpt-oss-120b', promptType: 'mock_interview',
            promptContext: { interviewType: 'Technical', difficulty: 'Intermediate', language: fixture.language },
            interviewHistory: history, forceNextMain: false,
            prompt: `Previous question and answer: ${JSON.stringify(history)}. If incomplete ask ONE genuinely missing specific detail using [FOLLOW_UP]:. Otherwise test a new role-relevant skill using [NEXT_MAIN]:. Never restate the same question or ask for the same story. Job: Software Developer. Use only ${fixture.language}.` })
    }));
    const body = await response.json();
    const result = { kind: 'question-generation', language: fixture.language, status: response.status, seconds: (Date.now() - before) / 1000, question: body.content };
    results.push(result); console.log(JSON.stringify(result));
}
writeFileSync('.data/interview-turn-calibration.json', JSON.stringify(results, null, 2));
if (results.some(result => result.status !== 200) || !audioResult.preservedTerms) process.exitCode = 1;
