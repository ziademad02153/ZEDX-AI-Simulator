import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function load(file, globals = {}, dependencies = {}) {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText, { exports, Blob, FormData, Request, Response, AbortController, setTimeout, clearTimeout,
        console: { log() {}, warn() {}, error() {} }, ...globals, require: name => dependencies[name] });
    return exports;
}
const quality = load('src/lib/interview-question-quality.ts');
const { validateWebReportEvidence } = load('src/lib/web-report-evidence.ts');
test('text-only evidence validation rejects invented acoustic and profanity penalties', () => {
    assert.throws(() => validateWebReportEvidence({ competencies: [{ observed_gaps: ['Uses profanity and has unclear pronunciation'] }] }));
    assert.throws(() => validateWebReportEvidence({ questions_assessment: [{ scoring_rationale: 'Unclear pronunciation lowers the score.' }] }));
    assert.doesNotThrow(() => validateWebReportEvidence({ competencies: [{ observed_gaps: ['The proposed response blames colleagues without investigating the incident.'] }] }));
});
const history = [{ q: 'Could you describe a situation where you took a leadership role, the actions you took, and the results achieved?', a: 'I led a team to deliver automation.', type: 'main' }];

test('report cannot repair garbled percentages or praise impossible reductions, but may note uncertainty', () => {
    const exchanges = [{ mainQuestionIndex: 0, answer: '80 hundred percent cutting time and reducing TTS spent by 1400%' }];
    assert.throws(() => validateWebReportEvidence({ competencies: [{ observable_behaviors: ['Reduced test time by 80%'] }] }, exchanges));
    assert.throws(() => validateWebReportEvidence({ questions_assessment: [{ strengths: ['Reduced TTS costs by 1400%'] }] }, exchanges));
    assert.doesNotThrow(() => validateWebReportEvidence({ competencies: [{ observed_gaps: ['The reported 1400% figure is unverified.'] }] }, exchanges));
    assert.doesNotThrow(() => validateWebReportEvidence({ questions_assessment: [{ question_number: 1, strengths: ['Increased throughput by 250%'] }] }, [{ mainQuestionIndex: 0, answer: 'Increased throughput by 250%' }]));
    assert.throws(() => validateWebReportEvidence({ questions_assessment: [{ benchmark_model: 'I led six engineers and saved 40% in three months.' }] }));
    assert.doesNotThrow(() => validateWebReportEvidence({ questions_assessment: [{ benchmark_model: 'Explain your role, actions and verified results, using [X]% only if measured.' }] }));
});

test('rejects a rephrased leadership main question, accepts a focused new probe', () => {
    assert.equal(quality.isRepeatedInterviewQuestion('Can you describe a time when you led a team to deliver a complex software project, outlining how you set the vision, coordinated stakeholders, and measured the outcomes?', history, false), true);
    assert.equal(quality.isRepeatedInterviewQuestion('How did you resolve the disagreement about the delivery deadline?', history, true), false);
    assert.equal(quality.isRepeatedInterviewQuestion(history[0].q, history, true), true);
});
test('recognizes repeated questions in Arabic and French independently of punctuation', () => {
    for (const q of ['إزاي اختبرت النظام قبل النشر؟', 'Comment avez-vous testé le système avant le déploiement ?']) {
        assert.equal(quality.isRepeatedInterviewQuestion(q.replace(/[؟?]/g, ''), [{ q }], true), true);
    }
});
test('invalid transitions never silently advance a question or allow a second follow-up', () => {
    assert.throws(() => quality.parseInterviewQuestion('Here is another question', false));
    assert.throws(() => quality.parseInterviewQuestion('[FOLLOW_UP]: What was the outcome?', true));
    assert.equal(quality.parseInterviewQuestion('[NEXT_MAIN]: How would you test the system?', true).followUp, false);
});

function questionRoute(contents) {
    const state = { calls: 0, reservations: 0, releases: 0 };
    const client = {
        auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { tier: 'ultra', subscription_expires_at: null } }) }) }) }),
        rpc: async name => {
            if (name === 'reserve_ai_question') { state.reservations++; return { data: { allowed: true, reservation_id: 'one-turn' } }; }
            if (name === 'release_ai_question') { state.releases++; return { data: true }; }
            return { data: true };
        }
    };
    const route = load('src/app/api/generate/route.ts', {
        process: { env: { NODE_ENV: 'production', GROQ_API_KEY: 'synthetic-key' } },
        fetch: async () => Response.json({ choices: [{ message: { content: contents[state.calls++] } }] })
    }, {
        'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
        '@supabase/supabase-js': { createClient: () => client }, '@/lib/prompts': { getSystemPrompt: () => 'Test interviewer' },
        '@/lib/interview-question-quality': quality
    });
    return { state, request: () => route.POST(new Request('https://test.local/api/generate', {
        method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptType: 'mock_interview', prompt: 'Ask the next question', interviewHistory: history, forceNextMain: true })
    })) };
}
test('actual generation route discards a repeated proposal and retries within one usage reservation', async () => {
    const app = questionRoute([`[NEXT_MAIN]: ${history[0].q}`, '[NEXT_MAIN]: How would you investigate intermittent API failures?', '{"duplicate":false}']);
    const response = await app.request();
    assert.equal(response.status, 200);
    assert.match((await response.json()).content, /intermittent API/);
    assert.equal(app.state.calls, 3);
    assert.equal(app.state.reservations, 1);
    assert.equal(app.state.releases, 0);
});
test('semantic review blocks a paraphrase that shares few words before speaking it', async () => {
    const app = questionRoute(['[NEXT_MAIN]: Share an occasion when you guided colleagues to ship a difficult product.', '{"duplicate":true}', '[NEXT_MAIN]: How would you diagnose a memory leak?', '{"duplicate":false}']);
    const response = await app.request();
    assert.equal(response.status, 200);
    assert.match((await response.json()).content, /memory leak/);
    assert.equal(app.state.calls, 4);
    assert.equal(app.state.reservations, 1);
});
test('three repeated proposals fail safely and release the usage reservation', async () => {
    const app = questionRoute(Array(3).fill(`[NEXT_MAIN]: ${history[0].q}`));
    const response = await app.request();
    assert.equal(response.status, 500);
    assert.equal(app.state.calls, 3);
    assert.equal(app.state.releases, 1);
});

test('recording includes the final chunk, finishes once, and does not stop the shared microphone', async () => {
    let recorder, trackStops = 0;
    class Recorder {
        static isTypeSupported(type) { return type.includes('webm'); }
        constructor(_stream, options) { recorder = this; this.mimeType = options.mimeType; this.state = 'inactive'; }
        start() { this.state = 'recording'; this.ondataavailable({ data: new Blob(['first-']) }); }
        stop() { this.ondataavailable?.({ data: new Blob(['last']) }); this.state = 'inactive'; this.onstop?.(); }
    }
    const recording = load('src/lib/web-answer-recording.ts', { MediaRecorder: Recorder, MediaStream: class {} });
    const answer = recording.recordInterviewAnswer({ getAudioTracks: () => [{ readyState: 'live', stop() { trackStops++; } }] });
    const first = answer.finish();
    assert.equal(answer.finish(), first);
    assert.equal(await (await first).text(), 'first-last');
    assert.equal(recorder.state, 'inactive');
    assert.equal(trackStops, 0);
});
test('transcription sends the actual audio type and selected language, never substitutes browser text on failure', async () => {
    let submitted;
    const recording = load('src/lib/web-answer-recording.ts', { fetch: async (_url, request) => {
        submitted = request;
        return Response.json({ text: 'I use Python for hardware-in-the-loop testing.' });
    } });
    assert.match(await recording.transcribeInterviewAnswer(new Blob(['audio'], { type: 'audio/mp4' }), 'test-token', 'fr-FR'), /Python/);
    assert.equal(submitted.body.get('language'), 'fr-FR');
    assert.equal(submitted.body.get('file').name, 'answer.mp4');
    assert.equal(submitted.body.get('purpose'), 'web_mock_interview');
    await recording.transcribeInterviewAnswer(new Blob(['audio']), 'test-token', 'fil-PH');
    assert.equal(submitted.body.get('language'), 'tl-PH');
    const failed = load('src/lib/web-answer-recording.ts', { fetch: async () => Response.json({ error: 'failed' }, { status: 503 }) });
    await assert.rejects(failed.transcribeInterviewAnswer(new Blob(['audio']), 'test', 'en-US'));
});

test('actual answer handler pauses on transcription failure and saves the retried verified answer only once', async () => {
    const source = readFileSync(new URL('../src/app/mock-interview/page.tsx', import.meta.url), 'utf8');
    const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let handler;
    function visit(node) {
        if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleUserFinishedSpeaking') handler = node.initializer;
        ts.forEachChild(node, visit);
    }
    visit(ast);
    const state = { fail: true, saves: [], complete: [], captureFailed: false };
    const audio = new Blob(['real recorded answer']);
    const globals = {
        stateRef: { current: { isListening: true, questionsAsked: [{ q: 'How did you measure latency?', a: '', type: 'followup', mainQuestionIndex: 0 }] } },
        currentQuestionTypeRef: { current: 'followup' }, mainQuestionIndexRef: { current: 0 },
        submittingAnswerRef: { current: false }, pendingAnswerAudioRef: { current: null }, pendingAnswerEndedAtRef: { current: null },
        answerRecorderRef: { current: { finish: async () => audio } }, recognitionRef: { current: { stop() {} } },
        silenceTimerRef: { current: null }, isMounted: { current: true },
        setIsListening() {}, setIsTranscribing() {}, setAnswerCaptureFailed: value => { state.captureFailed = value; },
        supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'test' } } }) } },
        transcribeInterviewAnswer: async received => { assert.equal(received, audio); if (state.fail) throw Error('temporary failure'); return 'I measured p95 with a load test.'; },
        speechStartedAtRef: { current: Date.now() - 2000 }, questionEndedAtRef: { current: Date.now() - 3000 },
        sessionExchangesRef: { current: [] }, finalTranscriptRef: { current: 'garbled browser text' },
        setQuestionsAsked() {}, setUserTranscript() {}, targetRole: 'Developer', jd: 'Developer', resume: '',
        interviewType: 'Technical', difficulty: 'Intermediate', language: 'en-US', model: 'test', questionCount: 1,
        sessionStartTimeRef: { current: Date.now() }, pendingSaveRef: { current: Promise.resolve() }, dbInterviewIdRef: { current: 'saved' },
        interviewService: { updateInterview: async (_id, payload) => { state.saves.push(payload); } },
        completeInterview: history => state.complete.push(history), console: { error() {} }, localStorage: { setItem() {} },
    };
    const exports = {};
    vm.runInNewContext(ts.transpileModule(`exports.handler = ${handler.getText(ast)};`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 }
    }).outputText, { exports, ...globals, clearTimeout });
    await exports.handler('garbled browser text');
    assert.equal(state.captureFailed, true);
    assert.equal(state.saves.length, 0);
    assert.equal(globals.sessionExchangesRef.current.length, 0);
    state.fail = false;
    await exports.handler('');
    await globals.pendingSaveRef.current;
    assert.equal(state.saves.length, 1);
    assert.equal(globals.sessionExchangesRef.current[0].answer, 'I measured p95 with a load test.');
    assert.equal(state.complete.length, 1);
    await exports.handler('another accidental submit');
    assert.equal(state.saves.length, 1);
    assert.equal(globals.sessionExchangesRef.current.length, 1);
});
