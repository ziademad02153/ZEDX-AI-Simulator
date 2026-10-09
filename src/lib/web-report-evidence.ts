/** Text-only voice reports must not certify acoustic traits or misconduct from a suspect keyword. */
export function validateWebReportEvidence(report: any, exchanges: { answer?: string; mainQuestionIndex?: number }[] = []): void {
    const judgments = [
        report?.overall_evaluation?.executive_summary,
        ...(report?.competencies || []).flatMap((item: any) => item.observed_gaps || []),
        ...(report?.questions_assessment || []).flatMap((item: any) => [
            item.scoring_rationale, item.evaluator_note, ...(item.gaps || [])
        ])
    ].filter((item): item is string => typeof item === 'string');
    // These are unsupported claims in an automatically transcribed, text-only assessment.
    // Behavioral actions described coherently in an answer remain assessable.
    const unsupported = /\b(profanity|swearing|swear words|foul language|pronunciation|accent|speaking pace)\b|(?:شتائم|الشتيمة|ألفاظ نابية|سوء النطق|لكنة|grossièret|jurons|prononciation|blasfem|palabrotas|Aussprache|Schimpfwörter)/iu;
    if (judgments.some(text => unsupported.test(text))) {
        throw new Error('Report contains unsupported acoustic or profanity judgments from automatic transcription');
    }
    const percentages = (text: string) => [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:%|percent\b|per cent\b)/gi)]
        .map(match => ({ value: Number(match[1].replace(',', '.')), index: match.index!, length: match[0].length }));
    const validateClaims = (texts: unknown[], source: string) => {
        const supported = new Set(percentages(source).map(item => item.value));
        for (const text of texts) {
            if (typeof text !== 'string') continue;
            if (percentages(text).some(item => !supported.has(item.value))) {
                throw new Error('Report invents or silently repairs a percentage missing from the original answer');
            }
        }
    };
    if (exchanges.length) {
        const source = exchanges.map(exchange => exchange.answer || '').join('\n');
        validateClaims([report?.overall_evaluation?.executive_summary, ...(report?.competencies || []).flatMap((item: any) => [
            ...(item.observable_behaviors || []), ...(item.observed_gaps || [])
        ])], source);
        for (const question of report?.questions_assessment || []) {
            const answer = exchanges.filter((exchange, index) => Number(exchange.mainQuestionIndex ?? index) + 1 === Number(question.question_number))
                .map(exchange => exchange.answer || '').join('\n');
            validateClaims([question.scoring_rationale, question.evaluator_note, ...(question.strengths || []), ...(question.gaps || [])], answer);
        }
    }
    const positiveClaims = [
        ...(report?.competencies || []).flatMap((item: any) => item.observable_behaviors || []),
        ...(report?.questions_assessment || []).flatMap((item: any) => item.strengths || [])
    ];
    for (const text of positiveClaims) {
        if (typeof text !== 'string') continue;
        for (const percentage of percentages(text)) {
            const context = text.slice(Math.max(0, percentage.index - 75), percentage.index + percentage.length + 40);
            if (percentage.value > 100 && /accuracy|(?:cost|spend|spent|latency|time).*(?:reduc|cut|sav)|(?:reduc|cut|sav).*(?:cost|spend|spent|latency|time)/i.test(context)) {
                throw new Error('Report rewards an impossible accuracy or reduction percentage; describe the metric as uncertain instead');
            }
        }
    }
    for (const question of report?.questions_assessment || []) {
        if (typeof question.benchmark_model === 'string' && /\bI (?:have spent|have been|led|built|introduced|defined|coordinated|reduced|saved|delivered|worked)\b/i.test(question.benchmark_model) &&
            /\d|\b(?:Corp|Inc|Ltd)\b/.test(question.benchmark_model)) {
            throw new Error('Report benchmark invents a candidate autobiography; give a generic answer structure with placeholders instead');
        }
    }
}
