import { SUPPORTED_LANGUAGES } from './languages';

// Reject incomplete generated reports before English schema defaults can fill them.
export function validateWebReportLanguage(value: unknown, language: string): void {
    const record = (item: unknown): Record<string, unknown> => item !== null && typeof item === 'object'
        ? item as Record<string, unknown> : {};
    const report = record(value);
    const summary = record(report.overall_evaluation).executive_summary;
    if (!SUPPORTED_LANGUAGES.some(item => item.code === language)) throw new Error('Unsupported interview language');
    if (record(report.candidate).language !== language) throw new Error('Report language does not match the interview');
    const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
    if (!text(summary)) throw new Error('Missing localized report summary');
    if (!Array.isArray(report.competencies) || report.competencies.length !== 5 ||
        report.competencies.some(item => !text(record(item).name) || !text(record(item).weight_rationale))) {
        throw new Error('Missing localized competency descriptions');
    }
    if (!Array.isArray(report.questions_assessment) || report.questions_assessment.some(item =>
        !text(record(item).scoring_rationale) || !text(record(item).benchmark_model))) {
        throw new Error('Missing localized question assessments');
    }
    if (!Array.isArray(report.action_plan_7_days) || report.action_plan_7_days.length < 3 ||
        report.action_plan_7_days.some(value => {
            const item = record(value);
            return !text(item.day_range) || !text(item.focus_area) || !text(item.expected_outcome) ||
                !Array.isArray(item.actions) || !item.actions.length || !item.actions.every(text);
        })) {
        throw new Error('Missing localized coaching plan');
    }
    // Detect obvious script drift without misclassifying Latin-language reports.
    const script = language.startsWith('ar') ? /\p{Script=Arabic}/u
        : language === 'zh-CN' ? /\p{Script=Han}/u
        : language === 'ja-JP' ? /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u
        : language === 'ko-KR' ? /\p{Script=Hangul}/u
        : ['ru-RU', 'uk-UA', 'bg-BG'].includes(language) ? /\p{Script=Cyrillic}/u
        : language === 'el-GR' ? /\p{Script=Greek}/u
        : language === 'hi-IN' ? /\p{Script=Devanagari}/u
        : language === 'ta-IN' ? /\p{Script=Tamil}/u : null;
    if (script && !script.test(String(summary))) {
        throw new Error('Report summary is written in the wrong language');
    }
}
