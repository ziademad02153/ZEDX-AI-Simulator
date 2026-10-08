import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/rubric-evaluator.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, { exports });
const { enforceRubric13ReportSchema: enforce, FIXED_COMPETENCY_KEYS: keys, calculateOverallBarsScore, normalizeWeights } = exports;
const answer = 'I used Redis caching and measured a 40% reduction in API latency.';
const context = {
    assessmentId: 'test', assessmentDate: '2026-10-08', candidateName: 'Test', targetRole: 'Developer',
    track: 'Technical', interviewType: 'Technical', difficulty: 'Intermediate', language: 'en-US',
    evaluatorModel: 'test', sessionExchanges: [{ type: 'main', mainQuestionIndex: 0, question: 'How did you improve API performance?', answer }]
};
const raw = () => ({
    competencies: keys.map(key => ({ key, weight_pct: 20, bars_score: 4, evidence_status: 'Sufficient', traceable_evidence: [answer] })),
    questions_assessment: [{ question_number: 1, bars_score: 4, strengths: ['Measured performance'], gaps: [] }]
});

test('strong grounded answers retain high scores without invented weaknesses', () => {
    const result = enforce(raw(), context);
    assert.equal(result.overall_evaluation.bars_score, 4);
    assert.equal(result.questions_assessment[0].gaps.length, 0);
    assert.equal(result.questions_assessment[0].candidate_answer, answer);
});

test('a missing competency score never becomes an invented neutral score', () => {
    const report = raw();
    for (const competency of report.competencies) delete competency.bars_score;
    const result = enforce(report, context);
    assert.ok(result.competencies.every(c => c.bars_score === null));
    assert.equal(result.overall_evaluation.bars_score, null);
});

test('invented quotations cannot support numeric grades or coverage', () => {
    const report = raw();
    for (const competency of report.competencies) competency.traceable_evidence = ['I failed to understand any technical concepts'];
    const result = enforce(report, context);
    assert.equal(result.overall_evaluation.bars_score, null);
    assert.equal(result.overall_evaluation.assessment_coverage_pct, 0);
    assert.ok(result.competencies.every(c => c.traceable_evidence.length === 0));
});

test('an invalid question grade is not replaced with the overall grade', () => {
    const report = raw();
    report.questions_assessment[0].bars_score = 99;
    assert.equal(enforce(report, context).questions_assessment[0].bars_score, null);
});

test('saved silence overrides AI-invented candidate answers and follow-ups', () => {
    const report = raw();
    report.questions_assessment[0].candidate_answer = answer;
    report.questions_assessment[0].follow_up = { probe: 'Invented probe', response: answer };
    const result = enforce(report, { ...context, sessionExchanges: [{ ...context.sessionExchanges[0], answer: '' }] });
    assert.equal(result.questions_assessment[0].bars_score, null);
    assert.equal(result.questions_assessment[0].follow_up, null);
    assert.ok(!result.questions_assessment[0].candidate_answer.includes(answer));
    assert.equal(result.overall_evaluation.bars_score, null);
});

test('follow-up answers may provide real competency evidence', () => {
    const followup = { type: 'followup', mainQuestionIndex: 0, question: 'What impact did it have?', answer };
    const result = enforce(raw(), { ...context, sessionExchanges: [{ ...context.sessionExchanges[0], answer: '' }, followup] });
    assert.equal(result.overall_evaluation.bars_score, 4);
    assert.equal(result.questions_assessment[0].follow_up.response, answer);
});

test('weighted arithmetic excludes unassessed competencies without turning them into failures', () => {
    const result = calculateOverallBarsScore([
        { weight_pct: 30, bars_score: 4, evidence_status: 'Sufficient' },
        { weight_pct: 20, bars_score: 2, evidence_status: 'Partial' },
        { weight_pct: 50, bars_score: null, evidence_status: 'Not Directly Assessed' }
    ]);
    assert.equal(result.overallBars, 3.2);
    const weights = normalizeWeights([40, 40, 40, 40, 40]);
    assert.equal(weights.reduce((sum, weight) => sum + weight, 0), 100);
    assert.ok(weights.every(weight => weight >= 10 && weight <= 40));
});

test('evidence quotations preserve literal technology names', () => {
    const exact = 'I used TypeScript and PostgreSQL';
    const report = raw();
    for (const competency of report.competencies) competency.traceable_evidence = [exact];
    const result = enforce(report, { ...context, sessionExchanges: [{ ...context.sessionExchanges[0], answer: exact }] });
    assert.equal(result.competencies[0].traceable_evidence[0], exact);
});

test('reordered evaluator questions retain the correct score for each saved answer', () => {
    const report = raw();
    report.questions_assessment = [
        { question_number: 2, bars_score: 1.5 },
        { question_number: 1, bars_score: 4.5 }
    ];
    const result = enforce(report, { ...context, sessionExchanges: [
        context.sessionExchanges[0],
        { type: 'main', mainQuestionIndex: 1, question: 'What was the architectural trade-off?', answer: 'I traded consistency for latency.' }
    ] });
    assert.equal(result.questions_assessment[0].bars_score, 4.5);
    assert.equal(result.questions_assessment[1].bars_score, 1.5);
    assert.equal(result.questions_assessment[0].question_text, context.sessionExchanges[0].question);
});

test('questions omitted by the evaluator stay visible and unrated, rather than borrowing another score', () => {
    const report = raw();
    report.questions_assessment = [{ question_number: 2, bars_score: 2 }];
    const result = enforce(report, context);
    assert.equal(result.questions_assessment.length, 1);
    assert.equal(result.questions_assessment[0].bars_score, null);
});

test('speech capture preserves recognized words and separates final and interim segments', () => {
    const source = readFileSync(new URL('../src/app/mock-interview/page.tsx', import.meta.url), 'utf8');
    const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let handler;
    function visit(node) {
        if (ts.isBinaryExpression(node) && node.left.getText(ast) === 'recognition.onresult') handler = node.right;
        ts.forEachChild(node, visit);
    }
    visit(ast);
    assert.ok(handler);
    const capture = {};
    const finalTranscriptRef = { current: '' };
    let captured;
    vm.runInNewContext(ts.transpileModule(`exports.result = ${handler.getText(ast)};`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 }
    }).outputText, {
        exports: capture, stateRef: { current: { isListening: true } }, finalTranscriptRef,
        speechStartedAtRef: { current: null }, silenceTimerRef: { current: null },
        setUserTranscript: value => { captured = value; }, setTimeout: () => 1, clearTimeout() {}, handleUserFinishedSpeaking() {}
    });
    const result = (transcript, confidence, isFinal) => Object.assign([{ transcript, confidence }], { isFinal });
    capture.result({ resultIndex: 0, results: [result('I use Redis', 0.4, true), result('for caching', 0, true), result('with invalidation', 0.7, false)] });
    assert.equal(finalTranscriptRef.current, 'I use Redis for caching');
    assert.equal(captured, 'I use Redis for caching with invalidation');
});

test('non-numeric grades and empty quoted evidence cannot fabricate a score', () => {
    for (const invalid of [true, false, {}, [], '', NaN, Infinity, -1, 9]) {
        const report = raw();
        for (const competency of report.competencies) competency.bars_score = invalid;
        report.questions_assessment[0].bars_score = invalid;
        const result = enforce(report, context);
        assert.equal(result.overall_evaluation.bars_score, null);
        assert.equal(result.questions_assessment[0].bars_score, null);
    }
    const report = raw();
    for (const competency of report.competencies) competency.traceable_evidence = ['""'];
    assert.equal(enforce(report, context).overall_evaluation.bars_score, null);
});

test('the full zero-to-five scale, including fractions and numeric zero strings, is preserved', () => {
    for (const score of [0, '0', 0.1, 0.9, 1, 2.5, 4.9, 5]) {
        const report = raw();
        for (const competency of report.competencies) competency.bars_score = score;
        report.questions_assessment[0].bars_score = score;
        const result = enforce(report, context);
        assert.equal(result.overall_evaluation.bars_score, Number(score));
        assert.equal(result.questions_assessment[0].bars_score, Number(score));
        assert.equal(exports.generateLegacyProjection(result).overallScore, Number(score) * 20);
    }
});

test('zero counts in the weighted average, while missing evidence remains unrated', () => {
    const result = calculateOverallBarsScore([
        { weight_pct: 40, bars_score: 0, evidence_status: 'Sufficient' },
        { weight_pct: 40, bars_score: 5, evidence_status: 'Sufficient' },
        { weight_pct: 20, bars_score: null, evidence_status: 'Not Directly Assessed' }
    ]);
    assert.equal(result.overallBars, 2.5);
    const report = raw();
    for (const competency of report.competencies) competency.bars_score = 0;
    report.questions_assessment[0].bars_score = 0;
    const silence = enforce(report, { ...context, sessionExchanges: [{ ...context.sessionExchanges[0], answer: '' }] });
    assert.equal(silence.overall_evaluation.bars_score, null);
    assert.equal(silence.questions_assessment[0].bars_score, null);
});
