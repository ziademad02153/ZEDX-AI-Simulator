import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function loader(overrides = {}, globals = {}) {
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path);
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    cache.set(path, exports);
    vm.runInNewContext(code, {
      exports, console: { warn() {}, error() {}, log() {} }, URL, Response, Request, AbortController, setTimeout, clearTimeout,
      process: { env: {} }, ...globals,
      require(name) {
        if (name in overrides) return overrides[name];
        if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
        if (name === './languages') return load('src/lib/languages.ts');
        throw new Error(`Unexpected dependency: ${name}`);
      },
    });
    return exports;
  }
  return load;
}

// Execute actual page handlers with browser/database doubles, without copying their logic.
function pageHandler(name, globals) {
  const source = readFileSync(new URL('../src/app/mock-interview/page.tsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) initializer = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(initializer, `Missing page handler ${name}`);
  const code = ts.transpileModule(`exports.handler = ${initializer.getText(ast)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, console: { error() {} }, ...globals });
  return exports.handler;
}

const load = loader();
const { SUPPORTED_LANGUAGES: languages } = load('src/lib/languages.ts');
const languageTools = load('src/lib/web-interview-language.ts');
const { validateWebReportLanguage } = load('src/lib/web-report-language.ts');
const { getSystemPrompt, getRubric13EvaluatorSystemPrompt, getRubric13EvaluatorUserPrompt } = load('src/lib/prompts.ts');
const { enforceRubric13ReportSchema, FIXED_COMPETENCY_KEYS } = load('src/lib/rubric-evaluator.ts');
const { generateExecutiveReportHtml } = load('src/lib/pdf-report-generator.ts');

test('PDF preserves a real zero score and distinguishes it from an unrated report', () => {
  const raw = fixture(languages[0]);
  for (const competency of raw.competencies) {
    competency.evidence_status = 'Sufficient';
    competency.traceable_evidence = [languages[0].q1];
    competency.bars_score = 0;
  }
  raw.questions_assessment[0].bars_score = 0;
  const report = enforceRubric13ReportSchema(raw, context(languages[0].code));
  const zeroHtml = generateExecutiveReportHtml(report);
  assert.match(zeroHtml, /0\.0<span class="score-denom">\/ 5\.0<\/span>/);
  assert.match(zeroHtml, /0\.0 \/ 5\.0/);
  report.overall_evaluation.bars_score = null;
  for (const competency of report.competencies) competency.bars_score = null;
  for (const question of report.questions_assessment) question.bars_score = null;
  const unratedHtml = generateExecutiveReportHtml(report);
  assert.doesNotMatch(unratedHtml, /0\.0<span class="score-denom">\/ 5\.0<\/span>/);
});

const context = language => ({
  assessmentId: 'ZEDX-test', assessmentDate: '2026-10-08T00:00:00Z', candidateName: 'Test', targetRole: 'Test',
  track: 'Technical', interviewType: 'Technical', difficulty: 'Intermediate', language, strictLanguage: true,
  evaluatorModel: 'test', sessionExchanges: [],
});

const fixture = language => ({
  rubric_version: '1.3', candidate: { language: language.code },
  overall_evaluation: { executive_summary: language.q1 },
  competencies: FIXED_COMPETENCY_KEYS.map(key => ({
    key, name: language.native, weight_pct: 20, weight_rationale: language.q1, bars_score: null,
    evidence_status: 'Insufficient', observable_behaviors: [], observed_gaps: [], traceable_evidence: [],
  })),
  questions_assessment: [{ question_text: language.q2, candidate_answer: '', bars_score: null, strengths: [], gaps: [],
    scoring_rationale: language.q1, benchmark_model: language.q2 }],
  action_plan_7_days: [1, 2, 3].map(() => ({ day_range: language.q1, focus_area: language.q1, actions: [language.q2], expected_outcome: language.q1 })),
});

test('catalog contains exactly 30 languages and exactly two ElevenLabs choices', () => {
  assert.equal(languages.length, 30);
  assert.equal(new Set(languages.map(item => item.code)).size, 30);
  assert.equal(languages.filter(item => languageTools.getWebSpeechProvider(item.code) === 'elevenlabs').length, 2);
});

for (const language of languages) {
  test(`${language.code}: setup survives reload, voices match, prompts and report keep the session language`, () => {
    assert.equal(languageTools.resolveWebInterviewLanguage('en-US', language.code, false), language.code);
    assert.equal(languageTools.resolveWebInterviewLanguage(language.code, 'en-US', true), language.code);
    const messages = languageTools.getWebInterviewMessages(language.code);
    assert.ok(messages.completed && messages.connectionError);
    if (language.code !== 'en-US') assert.notEqual(messages.completed, languageTools.getWebInterviewMessages('en-US').completed);
    const voices = [{ lang: 'en-US', name: 'Online Male' }, { lang: language.code, name: language.native }];
    assert.equal(languageTools.selectWebSpeechVoice(voices, language.code).lang, language.code);
    assert.ok(getSystemPrompt('mock_interview', { language: language.code }).includes(language.code));
    assert.ok(getRubric13EvaluatorSystemPrompt(language.code, true).includes(`exactly "${language.code}"`));
    assert.ok(getRubric13EvaluatorUserPrompt({ ...context(language.code), jobDescription: 'Test', resumeText: 'Test', sessionExchanges: [] }).includes(language.native));
    const raw = fixture(language);
    validateWebReportLanguage(raw, language.code);
    const report = enforceRubric13ReportSchema(raw, context(language.code));
    assert.equal(report.candidate.language, language.code);
    assert.equal(report.overall_evaluation.executive_summary, language.q1);
    const html = generateExecutiveReportHtml(report, true);
    assert.ok(html.includes(`<html lang="${language.code}">`));
    if (language.code !== 'en-US') {
      assert.equal(report.competencies[0].name, language.native);
      assert.equal(report.competencies[0].observable_behaviors.length, 0);
      assert.equal(report.questions_assessment[0].gaps.length, 0);
      assert.equal(report.questions_assessment[0].candidate_answer, '');
      assert.ok(!html.includes('No major fatal flaws observed during this exchange.'));
      assert.ok(!html.includes('The candidate demonstrated an overall rating of'));
      assert.ok(!html.includes('Expand on quantitative architectural trade-offs.'));
    }
  });
}

test('exact locale outranks a premium voice of a different locale; unavailable languages never select English', () => {
  const voices = [{ lang: 'pt-PT', name: 'Online Male' }, { lang: 'pt-BR', name: 'Local' }, { lang: 'en-US', name: 'Online Male' }];
  assert.equal(languageTools.selectWebSpeechVoice(voices, 'pt-BR').lang, 'pt-BR');
  assert.equal(languageTools.selectWebSpeechVoice(voices, 'ja-JP'), undefined);
  assert.equal(languageTools.selectWebSpeechVoice([{ lang: 'tl-PH', name: 'Local' }], 'fil-PH').lang, 'tl-PH');
  assert.equal(languageTools.resolveWebInterviewLanguage('invalid', 'invalid', false), 'en-US');
});

test('late voice loading is handled once and removes its listener', async () => {
  let voices = [];
  const events = new EventTarget();
  const synth = { getVoices: () => voices, addEventListener: (...args) => events.addEventListener(...args), removeEventListener: (...args) => events.removeEventListener(...args) };
  const pending = languageTools.loadWebSpeechVoices(synth);
  voices = [{ lang: 'fr-FR', name: 'Local' }];
  events.dispatchEvent(new Event('voiceschanged'));
  assert.equal((await pending)[0].lang, 'fr-FR');
});

test('empty voice list has a bounded wait rather than leaving the interview hanging', async () => {
  const events = new EventTarget();
  const voices = await languageTools.loadWebSpeechVoices({ getVoices: () => [], addEventListener: (...args) => events.addEventListener(...args), removeEventListener: (...args) => events.removeEventListener(...args) });
  assert.equal(voices.length, 0);
});

test('report validation rejects mismatched language, wrong script, and missing localized fields', () => {
  const arabic = languages.find(item => item.code === 'ar-EG');
  const raw = fixture(arabic);
  raw.candidate.language = 'en-US';
  assert.throws(() => validateWebReportLanguage(raw, 'ar-EG'), /does not match/);
  raw.candidate.language = 'ar-EG';
  raw.overall_evaluation.executive_summary = 'English summary';
  assert.throws(() => validateWebReportLanguage(raw, 'ar-EG'), /wrong language/);
  raw.overall_evaluation.executive_summary = arabic.q1;
  raw.action_plan_7_days = [];
  assert.throws(() => validateWebReportLanguage(raw, 'ar-EG'), /coaching plan/);
  assert.match(getRubric13EvaluatorSystemPrompt('ar-EG', true), /Egyptian Arabic/);
  assert.match(getRubric13EvaluatorSystemPrompt('ar-EG'), /professional Arabic/);
  assert.ok(!getRubric13EvaluatorSystemPrompt('ar-EG').includes('Egyptian Arabic'));
});

for (const language of [...languages, { ...languages[0], piperUnavailable: true }, { ...languages[0], browserSelected: true }, { ...languages[0], segmented: true }]) {
  test(`${language.code}${language.piperUnavailable ? ' (Amy unavailable)' : language.browserSelected ? ' (browser selected)' : ''}: actual web page speaks with the selected provider and language`, async () => {
    let apiCalls = 0;
    let amyCalls = 0;
    let nativeUtterance;
    let failedQuestion;
    const subtitles = [];
    const synth = { getVoices: () => [{ lang: language.code, name: 'Local' }], cancel() {}, speak(utterance) { nativeUtterance = utterance; utterance.onend(); } };
    class Audio {
      pause() {}
      play() { this.onplay(); this.onended(); return Promise.resolve(); }
    }
    const speak = pageHandler('speakText', {
      language: language.code, ...languageTools, SUPPORTED_LANGUAGES: languages, getEnglishSpeechPreference: () => language.browserSelected ? 'browser' : 'amy',
      splitAmySpeechText: text => language.segmented ? [text, 'A follow-up sentence.'] : [text],
      getAmyOpeningText: () => 'A prepared opening', useInterviewStore: { getState: () => ({ candidateName: 'Test' }) },
      synthesizeAmySpeech: async () => {
        assert.equal(subtitles[0], '', 'The question stays hidden while Amy generates audio');
        amyCalls++;
        if (language.piperUnavailable) throw new Error('Exercise paused Amy failure');
        return new Blob(['amy audio'], { type: 'audio/wav' });
      },
      getPhoneticText: text => text, isMounted: { current: true }, isCompletingRef: { current: false },
      speechRequestRef: { current: 0 }, amyPlaybackCancelRef: { current: null }, audioRef: { current: null }, utteranceRef: { current: null },
      questionEndedAtRef: { current: null }, speechStartedAtRef: { current: null }, recognitionRef: { current: null },
      setIsSpeaking() {}, setIsListening() {}, setUserTranscript() {}, setAmyFailedQuestion: text => { failedQuestion = text; }, setZedxText: text => subtitles.push(text),
      console: { error() {} },
      window: { speechSynthesis: synth }, navigator: { userAgent: 'Test desktop' }, toast: { error: () => assert.fail('Unexpected audio error') },
      SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } }, Audio, URL,
      supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) } },
      fetch: async (_url, options) => { apiCalls++; assert.equal(JSON.parse(options.body).language, language.code); return new Response('audio'); },
    });
    await speak(language.q1);
    if (language.piperUnavailable) {
      assert.equal(failedQuestion, language.q1);
      assert.equal(nativeUtterance, undefined, 'Amy failure must not silently switch voices');
      assert.equal(apiCalls, 0);
      assert.equal(amyCalls, 1);
      assert.equal(subtitles.includes(language.q1), false);
      return;
    }
    assert.ok(subtitles.includes(language.q1));
    if (language.code.startsWith('ar')) {
      assert.equal(amyCalls, 0);
      assert.equal(apiCalls, 1);
      assert.equal(nativeUtterance, undefined);
    } else if (language.code === 'en-US' && !language.piperUnavailable && !language.browserSelected) {
      assert.equal(amyCalls, language.segmented ? 2 : 1);
      assert.equal(apiCalls, 0);
      assert.equal(nativeUtterance, undefined);
    } else {
      assert.equal(amyCalls, language.code === 'en-US' && !language.browserSelected ? 1 : 0);
      assert.equal(apiCalls, 0);
      assert.equal(nativeUtterance.lang, language.code);
      assert.equal(nativeUtterance.voice.lang, language.code);
    }
  });
}

test('completion waits for pending session creation and final language persistence before opening the report', async () => {
  let releasePending;
  let releaseUpdate;
  let finalAnalysis;
  const routes = [];
  const timers = [];
  const dbRef = { current: null };
  const complete = pageHandler('completeInterview', {
    ...languageTools, language: 'fr-FR', isCompletingRef: { current: false }, sessionStartTimeRef: { current: Date.now() },
    sessionExchangesRef: { current: [] }, dbInterviewIdRef: dbRef, isMounted: { current: true },
    pendingSaveRef: { current: new Promise(resolve => { releasePending = () => { dbRef.current = 'created-session'; resolve(); }; }) },
    targetRole: 'Test', jd: 'Test', resume: 'Test', interviewType: 'Technical', difficulty: 'Intermediate', model: 'test', questionCount: 4,
    localStorage: { setItem() {} }, setZedxText() {}, speakText: text => assert.equal(text, languageTools.getWebInterviewMessages('fr-FR').completed),
    interviewService: { updateInterview: async (_id, payload) => { finalAnalysis = payload.analysis; await new Promise(resolve => { releaseUpdate = resolve; }); }, saveInterview: () => assert.fail('Must reuse the pending session') },
    router: { push: path => routes.push(path) }, setTimeout: callback => timers.push(callback),
  });
  const pending = complete([{ q: 'Question', a: 'Answer' }]);
  assert.equal(finalAnalysis, undefined);
  assert.equal(timers.length, 0);
  releasePending();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(finalAnalysis.language, 'fr-FR');
  assert.equal(finalAnalysis.session_mode, 'mock_interview');
  assert.equal(timers.length, 0);
  releaseUpdate();
  await pending;
  timers[0]();
  assert.deepEqual(routes, ['/dashboard/report/created-session']);
});

class NextResponse extends Response {
  static json(body, init) { return Response.json(body, init); }
}

test('TTS API calls ElevenLabs only for Egyptian/formal Arabic; the other 28 stay in the browser', async () => {
  let calls = 0;
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'test' } } }) }, rpc: async () => ({ data: true }) };
  const POST = loader({ 'next/server': { NextResponse }, '@supabase/supabase-js': { createClient: () => client } }, {
    process: { env: { ELEVENLABS_API_KEY: 'test-key' } },
    fetch: async (_url, options) => { calls++; assert.equal(JSON.parse(options.body).model_id, 'eleven_multilingual_v2'); return new Response('test-audio'); },
  })('src/app/api/tts/route.ts').POST;
  for (const language of languages) {
    const response = await POST(new Request('https://test.local/api/tts', { method: 'POST', headers: { Authorization: 'Bearer test-token' }, body: JSON.stringify({ text: language.q1, language: language.code }) }));
    assert.equal(response.status, language.code.startsWith('ar') ? 200 : 400);
  }
  assert.equal(calls, 2);
});

for (const language of languages) {
  test(`${language.code}: report API uses the saved session language and persists it`, async () => {
    let saved;
    let requested;
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: 'user', user_metadata: { name: 'Test' } } } }) },
      from(table) {
        if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { tier: 'pro' } }) }) }) };
        return {
          select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: { id: 'test-id', title: 'Test', created_at: '2026-10-08T00:00:00Z', analysis: { language: language.code, session_mode: 'mock_interview', resume_text: 'Test', questions: [{ q: language.q2, a: language.q2 }] } } }) }) }) }),
          update: payload => ({ eq: async () => { saved = payload; return {}; } }),
        };
      },
    };
    const POST = loader({ 'next/server': { NextResponse }, '@supabase/supabase-js': { createClient: () => client }, '@/lib/interview-service': { interviewService: { getPresentationAssessmentId: () => 'Test' } } }, {
      process: { env: { GROQ_API_KEY: 'test-key' } },
      fetch: async (_url, options) => { requested = JSON.parse(options.body); return Response.json({ choices: [{ message: { content: JSON.stringify(fixture(language)) } }] }); },
    })('src/app/api/generate-report/route.ts').POST;
    const response = await POST(new Request('https://test.local/api/generate-report', { method: 'POST', headers: { Authorization: 'Bearer test-token' }, body: JSON.stringify({ interviewId: 'test-id', language: 'wrong-client-language' }) }));
    assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
    assert.ok(requested.messages[0].content.includes(language.code));
    assert.equal(saved.analysis.rubric_report.candidate.language, language.code);
  });
}
