export type CvSection = { id: string; title: string; body: string };
export type CvDocument = { version: 1; name: string; headline: string; email: string; phone: string; location: string; links: string; sections: CvSection[] };
export const MAX_CV_TEXT = 40000;
export function emptyCv(): CvDocument {
    return { version: 1, name: '', headline: '', email: '', phone: '', location: '', links: '', sections: [
        { id: 'summary', title: 'Professional Summary', body: '' },
        { id: 'experience', title: 'Experience / Projects', body: '' },
        { id: 'education', title: 'Education', body: '' },
        { id: 'skills', title: 'Skills', body: '' },
    ] };
}
export function parseCvDraft(value: unknown): CvDocument {
    if (!value || typeof value !== 'object') throw Error('Invalid CV draft.');
    const d = value as Record<string, unknown>;
    const fields = ['name', 'headline', 'email', 'phone', 'location', 'links'];
    if (d.version !== 1 || fields.some(key => typeof d[key] !== 'string' || (d[key] as string).length > 1000) || !Array.isArray(d.sections) || d.sections.length > 20) throw Error('Invalid or unsupported CV draft.');
    const ids = new Set<string>();
    const sections = d.sections.map((s: unknown) => {
        if (!s || typeof s !== 'object') throw Error('Invalid section.');
        const section = s as Record<string, unknown>;
        if (typeof section.id !== 'string' || !section.id || section.id.length > 100 || ids.has(section.id) || typeof section.title !== 'string' || section.title.length > 100 || typeof section.body !== 'string' || section.body.length > 15000) throw Error('Invalid section.');
        ids.add(section.id);
        return { id: section.id, title: section.title, body: section.body };
    });
    const result = { version: 1, ...Object.fromEntries(fields.map(key => [key, d[key]])), sections } as CvDocument;
    if (cvText(result).length > MAX_CV_TEXT) throw Error('CV exceeds 40,000 characters.');
    return result;
}
export function cvText(d: CvDocument): string {
    return [d.name, d.headline, [d.email, d.phone, d.location, d.links].filter(Boolean).join(' | '), ...d.sections.filter(s => s.body.trim()).flatMap(s => [s.title, s.body])].filter(Boolean).join('\n\n');
}
export type Finding = { id: string; title: string; points: number; evidence: string; fix: string; severity: 'high' | 'medium' | 'low'; category: 'Structure' | 'Content' | 'Readability' };
export type CvFileEvidence = { possibleColumns?: boolean; emptyPages?: number; pages?: number; directionGlyphs?: number };
/** Inspect drawn glyphs too: PDF text extraction can discard these controls. */
export function countPdfDirectionGlyphs(operatorArguments: unknown[]): number {
    return operatorArguments.flat(3).reduce<number>((count, value) => {
        if (!value || typeof value !== 'object' || !('fontChar' in value) || !('unicode' in value) || typeof value.unicode !== 'string') return count;
        return count + (value.unicode.match(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g)?.length || 0);
    }, 0);
}
export type SpellingEvidence = { status: 'checked' | 'unavailable' | 'not-applicable'; checkedWords: number; candidates: { word: string; suggestions: string[] }[] };
export type CvCheck = { id: string; label: string; status: 'passed' | 'issue' | 'not-assessed'; category: Finding['category']; weight: number; note: string };
export type CvCategory = { name: Finding['category']; score: number | null; issues: number; assessed: number; total: number };
export function cleanCvText(text: string): string {
    return text.normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '').replace(/\r\n?/g, '\n');
}
export const CV_RULES = [
    { id: 'contact', points: 10, label: 'Contact email' },
    { id: 'education', points: 8, label: 'Education or qualification section' },
    { id: 'experience', points: 12, label: 'Experience, projects or volunteering section' },
    { id: 'skills', points: 8, label: 'Skills section' },
    { id: 'substance', points: 7, label: 'Enough text to review (at least 80 words)' },
    { id: 'repetition', points: 8, label: 'No repeated substantial lines' },
    { id: 'placeholders', points: 8, label: 'No unfinished placeholders' },
    { id: 'dates', points: 5, label: 'Year ranges are chronological' },
    { id: 'bullets', points: 5, label: 'Readable bullet length' },
    { id: 'encoding', points: 7, label: 'Readable extracted characters' },
    { id: 'layout', points: 7, label: 'Multi-column reading-order signals' },
    { id: 'spelling', points: 7, label: 'English spelling suggestions' },
    { id: 'action', points: 4, label: 'Specific contribution wording' },
    { id: 'word-repeat', points: 4, label: 'Accidentally repeated words' },
] as const;
const headings = {
    education: /^(?:education(?:\s*[&/]\s*certifications)?|qualifications|academic background|التعليم|المؤهلات|المؤهلات العلمية|الدراسة)$/iu,
    experience: /^(?:[\w /&-]*(?:experience|projects|volunteering)[\w /&-]*|work history|employment history|الخبرات|الخبرة العملية|الخبرات العملية|المشاريع|المشروعات|التطوع)$/iu,
    skills: /^(?:[\w /&-]*skills|technical competencies|core competencies|المهارات|المهارات التقنية|المهارات الفنية)$/iu,
};
export function checkCv(input: string, file: CvFileEvidence = {}, spelling?: SpellingEvidence) {
    if (input.length > MAX_CV_TEXT) throw Error('Use a CV under 40,000 characters.');
    const text = cleanCvText(input).trim();
    const words = text ? text.split(/\s+/u).length : 0;
    if (words < 20 && !file.pages) throw Error('Add at least 20 words of readable CV text before checking.');
    if (words < 20) {
        const findings: Finding[] = [{ id: 'no-text', title: 'Not enough selectable text to evaluate', points: 0, severity: 'high', category: 'Readability', evidence: `${words} words extracted from ${file.pages} PDF pages.`, fix: 'Compare the original preview with the extracted text. Export a text-based PDF, or replace scanned pages with selectable text, then re-upload.' }];
        const checks: CvCheck[] = CV_RULES.map(r => ({ id: r.id, label: r.label, status: 'not-assessed', category: 'Content', weight: r.points, note: 'Not enough readable text.' }));
        const categories: CvCategory[] = ['Readability', 'Structure', 'Content'].map(name => ({ name: name as Finding['category'], score: null, issues: name === 'Readability' ? 1 : 0, assessed: 0, total: 0 }));
        return { score: null, findings, words, version: 'zedx-ats-readiness-v3', checks, categories, assessed: 0, total: checks.length, notAssessed: ['Content and structure: not enough readable text', 'Employer-specific ATS behavior'] };
    }
    const findings: Finding[] = [];
    const add = (id: typeof CV_RULES[number]['id'], title: string, evidence: string, fix: string, severity: Finding['severity'] = 'medium', category: Finding['category'] = 'Content') => findings.push({ id, title, evidence, fix, points: CV_RULES.find(r => r.id === id)!.points, severity, category });
    if (!/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/u.test(text)) add('contact', 'Contact email not found', 'No recognizable email address in the text.', 'Add a working professional email near your name. Check spelling and remove spaces inside the address.', 'high', 'Structure');
    const sectionLines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const headingText = (line: string) => line.replace(/^[-•*#\s]+|[:：*\s]+$/g, '');
    const isHeading = (line: string) => Object.values(headings).some(pattern => pattern.test(headingText(line))) || /^(?:professional summary|summary|profile|certifications|languages|interests|contact)$/i.test(headingText(line));
    for (const id of ['education', 'experience', 'skills'] as const) {
        const index = sectionLines.findIndex(line => headings[id].test(headingText(line)));
        if (index < 0 || !sectionLines[index + 1] || isHeading(sectionLines[index + 1])) add(id, `${id[0].toUpperCase() + id.slice(1)} section missing or empty`, index < 0 ? 'No recognizable standalone section heading was extracted.' : `The ${sectionLines[index]} heading has no content underneath it.`, id === 'experience' ? 'Use an Experience, Projects or Volunteering heading, followed by your real contributions. Coursework projects are valid.' : `Add a clear ${id === 'education' ? 'Education' : 'Skills'} heading on its own line, followed by relevant details. Include only information that is true for you.`, id === 'experience' ? 'high' : 'medium', 'Structure');
    }
    if (words < 80) add('substance', 'Limited detail to review', `${words} words extracted. This is a completeness heuristic, not an ideal CV length.`, 'Explain your relevant education, projects or experience with concrete actions and outcomes. Do not add filler or invent achievements.');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 35);
    const seen = new Set<string>();
    const duplicate = lines.find(line => { const normalized = line.toLocaleLowerCase().replace(/\s+/g, ' '); if (seen.has(normalized)) return true; seen.add(normalized); return false; });
    if (duplicate) add('repetition', 'Repeated content', duplicate.slice(0, 220), 'Remove the duplicate line, or replace it with a different verified contribution.');
    const placeholder = text.match(/\b(?:lorem ipsum|your name|your email|insert here|TODO|TBD)\b|\[(?:company|job title|date|name|insert[^\]]*)\]|(?:https?:\/\/|www\.)(?:[a-z0-9-]+\.)*example\.(?:com|org|net)(?=[:/?#\s]|$)(?:\/[^\s]*)?|اسمك هنا|اكتب هنا/iu);
    if (placeholder) add('placeholders', 'Unfinished placeholder or example link', placeholder[0], 'Replace this placeholder with your own real information or a working portfolio/profile link. Remove the field if you do not have one.', 'high');
    const backwards = [...text.matchAll(/\b((?:19|20)\d{2})\s*[-–—]\s*((?:19|20)\d{2})\b/g)].find(m => Number(m[1]) > Number(m[2]));
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const reversedMonths = [...text.matchAll(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+((?:19|20)\d{2})\s*[-–—]\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+((?:19|20)\d{2})\b/gi)].find(m => Number(m[2]) * 12 + months.indexOf(m[1].slice(0, 3).toLowerCase()) > Number(m[4]) * 12 + months.indexOf(m[3].slice(0, 3).toLowerCase()));
    if (backwards || reversedMonths) add('dates', 'A date range ends before it starts', (backwards || reversedMonths)![0], 'Check the start and end dates and correct the range. Use a consistent format such as June 2023 – September 2025.');
    const longBullet = text.split('\n').find(line => /^\s*[-•●*]\s+/.test(line) && line.trim().split(/\s+/).length > 45);
    if (longBullet) add('bullets', 'A bullet is difficult to scan', longBullet.slice(0, 230), 'Split this into two focused bullets. Keep each to one contribution, with its actual outcome.');
    const broken = input.match(/\ufffd/g)?.length || 0;
    const spaced = text.match(/\b(?:[A-Za-z] ){5,}[A-Za-z]\b/);
    const latinDirectionMarks = (file.directionGlyphs || 0) > 0 && !/[\u0600-\u06ff]/.test(text);
    if (broken > 2 || spaced || latinDirectionMarks) add('encoding', latinDirectionMarks ? 'Hidden direction marks embedded in the PDF' : 'Extracted text may be unreadable', latinDirectionMarks ? `${file.directionGlyphs} invisible direction-control glyphs occur in the PDF drawing instructions. The text extractor may hide them, while some viewers can show stray marks.` : broken > 2 ? `${broken} replacement characters were found in extracted text.` : spaced![0], latinDirectionMarks ? 'Retype the affected English name/text as plain text without copied direction formatting, then export a fresh PDF. Compare the original preview with its extracted text; an existing PDF is not changed automatically.' : 'Export a text-based PDF with a standard embedded font. Remove decorative letter spacing, then confirm the copied text reads normally.', latinDirectionMarks ? 'medium' : 'high', 'Readability');
    if (file.possibleColumns) add('layout', 'Possible multi-column reading order', 'Text was detected in separate left/right bands on multiple shared lines. This is a layout heuristic, not proof of ATS failure.', 'Use a single-column version with section headings above their content. Keep contact information in the main document body.', 'medium', 'Readability');
    if (file.emptyPages) findings.push({ id: 'empty-pages', title: 'Some PDF pages contain no readable text', points: 0, severity: 'high', category: 'Readability', evidence: `${file.emptyPages} of ${file.pages ?? '?'} pages had no meaningful text. They may be blank or image-only.`, fix: 'Inspect those pages. Remove blank pages, or replace scanned content with selectable text before submitting.' });
    const vague = text.match(/\b(?:responsible for|helped with|involved in|performed various tasks)\b[^.\n]*/i);
    if (vague) add('action', 'Make your contribution more specific', vague[0].slice(0, 200), 'Start with the action you actually took, identify what you worked on, and state the verified outcome. Replace vague duties without inventing numbers or experience.');
    const repeat = text.match(/\b(the|and|with|for|to|in|of)\s+\1\b/i);
    if (repeat) add('word-repeat', 'Possible accidentally repeated word', repeat[0], 'Read this sentence and remove the duplicate word if it is accidental.');
    if (spelling?.status === 'checked' && spelling.candidates.length) {
        add('spelling', 'Review possible English spelling issues', spelling.candidates.map(c => `“${c.word}” → ${c.suggestions.join(' / ')}`).join('; '), 'Review these US-English dictionary suggestions in context. Keep valid names, technical terms and regional spellings; do not replace them automatically.');
    }
    const rank = { high: 0, medium: 1, low: 2 };
    findings.sort((a, b) => rank[a.severity] - rank[b.severity] || b.points - a.points);
    const categoryFor = (id: string): Finding['category'] => ['contact', 'education', 'experience', 'skills'].includes(id) ? 'Structure' : ['encoding', 'layout'].includes(id) ? 'Readability' : 'Content';
    const checks: CvCheck[] = CV_RULES.map(rule => {
        const finding = findings.find(f => f.id === rule.id);
        const unknown = rule.id === 'layout' && file.possibleColumns === undefined || rule.id === 'spelling' && spelling?.status !== 'checked' || rule.id === 'dates' && !/\b(?:19|20)\d{2}\b/.test(text) || rule.id === 'bullets' && !/^\s*[-•●*]\s+/m.test(text);
        const details: Record<string, string> = {
            contact: `Detected email: ${text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/u)?.[0] || 'none'}.`,
            substance: `${words} words extracted; the minimum-detail heuristic is 80 words.`,
            spelling: `${spelling?.checkedWords ?? 0} unique lowercase English prose words checked against a US-English dictionary. Up to eight possible terms are reported; names and technical terms need your review.`,
            encoding: `${broken} replacement characters found. Decorative spaced-letter patterns were also checked.`,
            layout: `Checked ${file.pages ?? '?'} PDF pages for strong multi-column text-band signals. No detection is not a universal layout pass.`,
        };
        return { id: rule.id, label: rule.label, status: finding ? 'issue' : unknown ? 'not-assessed' : 'passed', category: categoryFor(rule.id), weight: rule.points, note: finding?.evidence || (unknown ? 'Insufficient evidence or this check is unavailable for this input.' : details[rule.id] || 'No issue detected by this rule.') };
    });
    const scoreFor = (items: CvCheck[]) => {
        const tested = items.filter(c => c.status !== 'not-assessed');
        const weight = tested.reduce((n, c) => n + c.weight, 0);
        return weight ? Math.round(100 * tested.filter(c => c.status === 'passed').reduce((n, c) => n + c.weight, 0) / weight) : null;
    };
    const categories: CvCategory[] = (['Readability', 'Structure', 'Content'] as const).map(name => {
        const items = checks.filter(c => c.category === name);
        return { name, score: name === 'Readability' && file.emptyPages ? null : scoreFor(items), issues: findings.filter(f => f.category === name).length, assessed: items.filter(c => c.status !== 'not-assessed').length, total: items.length };
    });
    return { score: file.emptyPages ? null : scoreFor(checks), findings, words, version: 'zedx-ats-readiness-v3', checks, categories, assessed: checks.filter(c => c.status !== 'not-assessed').length, total: checks.length, notAssessed: ['Employer-specific ATS behavior', 'Full grammar, factual accuracy and semantic suitability', ...(file.emptyPages ? [`${file.emptyPages} page(s) without meaningful extracted text`] : []), ...(spelling?.status !== 'checked' ? ['English dictionary spelling'] : []), ...(file.possibleColumns === undefined ? ['Original document layout'] : [])] };
}
const SKILLS: [string, string[]][] = [
    ['JavaScript', ['javascript']], ['TypeScript', ['typescript']], ['Java', ['java']], ['Python', ['python']], ['C++', ['c++']], ['C#', ['c#']], ['.NET', ['.net', 'dotnet']], ['React', ['react', 'react.js', 'reactjs']], ['Node.js', ['node.js', 'nodejs']], ['SQL', ['sql']], ['PostgreSQL', ['postgresql', 'postgres']], ['Excel', ['excel', 'إكسل']], ['Power BI', ['power bi']], ['Project management', ['project management', 'إدارة المشاريع']], ['Customer service', ['customer service', 'خدمة العملاء']], ['Sales', ['sales', 'المبيعات']], ['Accounting', ['accounting', 'المحاسبة']], ['Communication', ['communication', 'التواصل']], ['Leadership', ['leadership', 'القيادة']], ['Teamwork', ['teamwork', 'العمل الجماعي']], ['Marketing', ['marketing', 'التسويق']], ['AutoCAD', ['autocad']], ['Figma', ['figma']], ['Docker', ['docker']], ['AWS', ['aws']], ['Git', ['git']], ['Testing', ['testing', 'اختبار البرمجيات']],
];
function mentions(text: string, aliases: string[]) {
    return aliases.some(alias => new RegExp(`(?<![\\p{L}\\p{N}_])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`, 'iu').test(text));
}
export function matchJob(text: string, jd: string, extraTerms: string[] = []) {
    if (jd.length > MAX_CV_TEXT) throw Error('Job description exceeds 40,000 characters.');
    if (extraTerms.length > 50 || extraTerms.some(term => term.length > 80)) throw Error('Use up to 50 skill phrases, at most 80 characters each.');
    const recognized = [...SKILLS.filter(([, aliases]) => mentions(jd, aliases))];
    for (const value of extraTerms) {
        const term = value.trim();
        if (term && !recognized.some(([name]) => name.toLocaleLowerCase() === term.toLocaleLowerCase())) recognized.push([term, [term]]);
    }
    return { found: recognized.filter(([, a]) => mentions(text, a)).map(([name]) => name), missing: recognized.filter(([, a]) => !mentions(text, a)).map(([name]) => name) };
}
