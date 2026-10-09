export type InterviewQuestion = { q: string; a?: string; type?: 'main' | 'followup' };

function normalize(text: string): string {
    return text.normalize('NFKC').toLowerCase().replace(/\[(?:next_main|follow_up)\]:?/gi, '')
        .replace(/[\p{P}\p{S}]/gu, ' ').replace(/\s+/g, ' ').trim();
}

// Exclude conversational acknowledgments so a new greeting cannot disguise a repeated question.
function questionBody(text: string): string {
    const sentences = text.split(/(?<=[.!。！])\s+/);
    return normalize(sentences.length > 1 ? sentences.slice(1).join(' ') : text);
}

function words(text: string): Set<string> {
    const stop = new Set('a an the you your could can please would tell describe walk me through about of in on to and or how what when did do was were have has specific example time situation'.split(' '));
    return new Set(text.split(' ').filter(word => word.length > 2 && !stop.has(word)).map(word => word.replace(/(?:ing|ed|s)$/, '')));
}

export function isRepeatedInterviewQuestion(candidate: string, history: InterviewQuestion[], followUp: boolean): boolean {
    const body = questionBody(candidate);
    if (!body) return true;
    const tokens = words(body);
    return history.some(previous => {
        const oldBody = questionBody(previous.q);
        if (body === oldBody || normalize(candidate) === normalize(previous.q)) return true;
        const oldTokens = words(oldBody);
        const shared = [...tokens].filter(word => oldTokens.has(word)).length;
        const union = new Set([...tokens, ...oldTokens]).size;
        if (shared >= 4 && (shared / union >= 0.65 || shared / Math.max(tokens.size, oldTokens.size) >= 0.8)) return true;
        // Catch the common leadership-story paraphrase without blocking a focused follow-up
        // about a genuinely new technical detail. Other topics remain governed by lexical checks
        // and the generator's semantic novelty instruction.
        if (!followUp && previous.type !== 'followup') {
            const leadership = /\b(led|leadership|lead a team|leading|lead a project)\b/;
            if (leadership.test(body) && leadership.test(oldBody)) return true;
        }
        return false;
    });
}

export function parseInterviewQuestion(content: string, forceNextMain: boolean): { text: string; followUp: boolean } {
    const trimmed = content.trim();
    const marker = trimmed.match(/^\[(FOLLOW_UP|NEXT_MAIN)\]:?\s*/i);
    if (!marker) throw new Error('Interview question has no valid transition marker');
    if (forceNextMain && marker[1].toUpperCase() === 'FOLLOW_UP') throw new Error('A second follow-up is not permitted');
    const text = trimmed.slice(marker[0].length).trim();
    if (!text || /\[(?:FOLLOW_UP|NEXT_MAIN)\]/i.test(text)) throw new Error('Invalid interview question');
    return { text, followUp: marker[1].toUpperCase() === 'FOLLOW_UP' };
}
