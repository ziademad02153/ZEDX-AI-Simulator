import { cleanCvText, type SpellingEvidence } from './core';
type Engine = { correct(word: string): boolean; suggest(word: string): string[] };
let enginePromise: Promise<Engine> | undefined;
async function loadEngine(): Promise<Engine> {
    if (!enginePromise) enginePromise = (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        try {
            const [{ default: nspell }, aff, dic] = await Promise.all([
                import('nspell'), fetch('/dictionaries/en.aff', { signal: controller.signal }), fetch('/dictionaries/en.dic', { signal: controller.signal }),
            ]);
            if (!aff.ok || !dic.ok) throw Error('Spelling dictionary unavailable.');
            const engine = nspell({ aff: await aff.text(), dic: await dic.text() });
            for (const word of 'javascript typescript nodejs nextjs reactjs postgresql mysql mongodb frontend backend fullstack devops kubernetes docker github gitlab linkedin figma autocad api apis sql html css ui ux qa saas fintech healthcare onboarding stakeholder stakeholders accessibility'.split(' ')) engine.add(word);
            return engine;
        } finally { clearTimeout(timer); }
    })().catch(error => { enginePromise = undefined; throw error; });
    return enginePromise;
}
export function inspectSpelling(text: string, engine: Engine): SpellingEvidence {
    // Check lowercase prose only, excluding the identity header, links, skills and
    // capitalized names/acronyms. Unknown technical/proper words remain suggestions.
    const prose = cleanCvText(text).split('\n').slice(2).filter(line => !/https?:|www\.|@|(?:languages|frameworks|tools|databases|skills)\s*:/i.test(line)).join('\n');
    const words = [...new Set(prose.match(/\b[a-z]{4,24}\b/g) || [])];
    const candidates: SpellingEvidence['candidates'] = [];
    let checkedWords = 0;
    for (const word of words) {
        checkedWords++;
        if (engine.correct(word)) continue;
        const suggestions = engine.suggest(word).filter(s => s.toLowerCase() !== word).slice(0, 3);
        if (suggestions.length) candidates.push({ word, suggestions });
        if (candidates.length >= 8) break;
    }
    return { status: words.length ? 'checked' : 'not-applicable', checkedWords, candidates };
}
export async function reviewSpelling(text: string): Promise<SpellingEvidence> {
    if ((text.match(/[A-Za-z]/g)?.length || 0) < 40) return { status: 'not-applicable', checkedWords: 0, candidates: [] };
    try { return inspectSpelling(text, await loadEngine()); }
    catch { return { status: 'unavailable', checkedWords: 0, candidates: [] }; }
}
