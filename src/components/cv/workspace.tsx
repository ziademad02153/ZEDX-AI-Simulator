'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Download, FileCheck2, FilePlus2, Loader2, Plus, Trash2, Upload, ShieldCheck, ScanText, ListChecks, ArrowRight } from 'lucide-react';
import styles from './workspace.module.css';
import { Navbar } from '@/components/navbar';
import { checkCv, cvText, emptyCv, parseCvDraft, type CvDocument } from '@/lib/cv/core';
import { downloadBlob, readCvFile } from '@/lib/cv/files';
import { createCvPdf } from '@/lib/cv/pdf';
import { reviewSpelling } from '@/lib/cv/spelling';
import { CheckerReport } from './checker-report';
import type { CvReadProgress } from '@/lib/cv/files';

const fieldClass = 'cv-field';
const cardClass = 'cv-panel';
const buttonClass = 'cv-primary';
const secondary = 'cv-secondary';

export function CvWorkspace({ mode }: { mode: 'checker' | 'builder' }) {
    const builder = mode === 'builder';
    const [cv, setCv] = useState<CvDocument>(emptyCv);
    const [result, setResult] = useState<ReturnType<typeof checkCv> | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [source, setSource] = useState('');
    const [previews, setPreviews] = useState<string[]>([]);
    const [extractedText, setExtractedText] = useState('');
    const [previewErrors, setPreviewErrors] = useState(0);
    const [progress, setProgress] = useState<CvReadProgress | null>(null);
    const [checking, setChecking] = useState(false);
    const scanSequence = useRef(0);
    useEffect(() => () => { scanSequence.current++; }, []);
    const [showReview, setShowReview] = useState(false);
    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const sync = () => {
            let preference: string | null = null;
            try { preference = localStorage.getItem('theme'); } catch { /* Use system preference if storage is unavailable. */ }
            const next = preference === 'dark' || (preference !== 'light' && media.matches);
            document.documentElement.classList.toggle('dark', next);
        };
        sync();
        media.addEventListener('change', sync);
        window.addEventListener('storage', sync);
        return () => { media.removeEventListener('change', sync); window.removeEventListener('storage', sync); };
    }, []);
    const fileRef = useRef<HTMLInputElement>(null);
    function invalidate() { setResult(null); setError(''); setNotice(''); }
    function update(next: CvDocument) { setCv(next); invalidate(); }
    async function review() {
        setError(''); setNotice(''); setBusy(true);
        try {
            const text = cvText(parseCvDraft(cv));
            const spelling = await reviewSpelling(text);
            setResult(checkCv(text, {}, spelling)); setShowReview(true);
        } catch (e) { setResult(null); setError((e as Error).message); }
        finally { setBusy(false); }
    }
    async function upload(file: File) {
        const sequence = ++scanSequence.current;
        setBusy(true); invalidate();
        setPreviews([]); setExtractedText(''); setPreviewErrors(0); setChecking(false);
        try {
            const extracted = await readCvFile(file, step => { if (sequence === scanSequence.current) setProgress(step); });
            if (sequence !== scanSequence.current) return;
            setChecking(true);
            const spelling = await reviewSpelling(extracted.text);
            if (sequence !== scanSequence.current) return;
            setSource(`${file.name}${extracted.pages ? ` · ${extracted.pages} pages` : ''}`);
            setPreviews(extracted.previews); setExtractedText(extracted.text); setPreviewErrors(extracted.previewErrors);
            setResult(checkCv(extracted.text, extracted.evidence, spelling));
        } catch (e) { if (sequence === scanSequence.current) setError((e as Error).message); }
        finally { if (sequence === scanSequence.current) { setBusy(false); setProgress(null); setChecking(false); } }
    }
    async function exportPdf() {
        setBusy(true); setError(''); setNotice('');
        try {
            if (!cv.name.trim() || !cv.sections.some(s => s.body.trim())) throw Error('Add your name and at least one section before exporting.');
            downloadBlob(await createCvPdf(cv), `${cv.name.trim()} - CV.pdf`);
            setNotice('Your text-based PDF is ready. Check the downloaded file before submitting it.');
        } catch (e) { setError((e as Error).message); }
        finally { setBusy(false); }
    }
    function moveSection(index: number, direction: number) {
        const sections = [...cv.sections];
        [sections[index], sections[index + direction]] = [sections[index + direction], sections[index]];
        update({ ...cv, sections });
    }
    return <div className={styles.workspace}>
        <Navbar />
        <main className={`cv-main ${builder ? 'cv-builder' : 'cv-checker'}`}>
            <div className="cv-toolbar"><nav aria-label="CV tools" className="cv-switcher">
                <Link href="/cv-checker" aria-current={!builder ? 'page' : undefined} className={!builder ? buttonClass : secondary}><FileCheck2 size={17} /> ATS CV Checker</Link>
                <Link href="/cv-builder" aria-current={builder ? 'page' : undefined} className={builder ? buttonClass : secondary}><FilePlus2 size={17} /> CV Builder</Link>
            </nav></div>
            <header className={`cv-hero ${!builder && result ? 'cv-hero-report' : ''}`}>
                <p className="cv-eyebrow">{builder ? 'THE RESUME BUILDER' : 'ATS CV CHECKER'}</p>
                <h1>{builder ? <>Your story.<br /><span>Beautifully structured.</span></> : result ? 'Your resume. A closer look.' : <>Your next chapter.<br /><span>Starts with a better CV.</span></>}</h1>
                <p className="cv-intro">{builder ? 'A focused space to shape your experience into a clean, professional resume.' : result ? 'The original file, what we read, and what to improve.' : 'One upload. A clear score. Know exactly what to improve.'}</p>
            </header>
            {error && <div role="alert" className="cv-alert cv-alert-error">{error}</div>}
            {notice && <div role="status" className="cv-alert cv-alert-success">{notice}</div>}
            {!builder && <input ref={fileRef} type="file" accept=".pdf,.txt" aria-label="Upload CV PDF or TXT" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} className="hidden" />}
            {!builder && busy && <div className="cv-scan-progress" role="status"><Loader2 size={20} className="animate-spin" /><div><strong>{checking ? 'Checking structure and English writing' : progress?.stage || 'Opening file'}{!checking && progress && progress.total > 1 ? ` · ${progress.current}/${progress.total} pages` : ''}</strong><p>{checking ? 'Running local rules and dictionary checks.' : 'Reading your actual file and generating its preview.'}</p></div>{progress && !checking && <progress aria-label="PDF pages processed" value={progress.current} max={progress.total} />}</div>}
            {(!result || builder) && <div className={`cv-grid ${!builder && !result ? 'cv-grid-empty' : ''}`}>
                <div className="space-y-5">
                    {!builder ? <section aria-busy={busy} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file && !busy) void upload(file); }} className={`${cardClass} cv-upload`}>
                        <div className="cv-document-icon"><FileCheck2 size={38} strokeWidth={1.35} /></div>
                        <h2>Your resume, ready for a closer look.</h2>
                        <p className="cv-upload-caption">Drag and drop your file here, or choose one below.</p>
                        <button className={buttonClass} disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} strokeWidth={1.7} />}{busy ? 'Checking your resume…' : 'Upload Your Resume'}{!busy && <ArrowRight size={16} />}</button>
                        <p className="cv-file-meta">PDF or TXT <span>·</span> Up to 5 MB</p>
                        <div className="cv-private"><ShieldCheck size={14} /> Your file stays in your browser.</div>
                        <details className="cv-file-details"><summary>Supported files & limits</summary><p>Up to 15 pages and 40,000 characters. Scanned PDFs and DOCX are not supported yet.</p></details>
                        {source && <p className="mt-3 max-w-full break-words text-sm">{source}</p>}
                    </section> : <>
                        <section className={cardClass}>
                            <h2 className="mb-4 text-xl font-semibold">Personal details</h2>
                            <div className="grid gap-4 sm:grid-cols-2">{([
                                ['name', 'Full name'], ['headline', 'Professional title'], ['email', 'Email'], ['phone', 'Phone (optional)'], ['location', 'Location (optional)'], ['links', 'Portfolio / profile links (optional)'],
                            ] as const).map(([key, label]) => <label key={key} className="space-y-2 text-sm"><span>{label}</span><input dir="auto" maxLength={1000} type={key === 'email' ? 'email' : 'text'} className={fieldClass} value={cv[key]} onChange={e => update({ ...cv, [key]: e.target.value })} /></label>)}</div>
                        </section>
                        {cv.sections.map((section, index) => <section key={section.id} className={cardClass}>
                            <div className="mb-3 flex items-center gap-2">
                                <label className="flex-1"><span className="sr-only">Section title {index + 1}</span><input dir="auto" maxLength={100} className={fieldClass} value={section.title} onChange={e => update({ ...cv, sections: cv.sections.map(s => s.id === section.id ? { ...s, title: e.target.value } : s) })} /></label>
                                <button className="cv-section-action" disabled={index === 0} onClick={() => moveSection(index, -1)} aria-label={`Move ${section.title} up`}><ArrowUp size={17} /></button>
                                <button className="cv-section-action" disabled={index === cv.sections.length - 1} onClick={() => moveSection(index, 1)} aria-label={`Move ${section.title} down`}><ArrowDown size={17} /></button>
                                <button className="cv-section-action text-red-600" onClick={() => update({ ...cv, sections: cv.sections.filter(s => s.id !== section.id) })} aria-label={`Remove ${section.title}`}><Trash2 size={17} /></button>
                            </div>
                            <textarea dir="auto" maxLength={15000} rows={6} className={fieldClass} aria-label={`${section.title} content`} value={section.body} onChange={e => update({ ...cv, sections: cv.sections.map(s => s.id === section.id ? { ...s, body: e.target.value } : s) })} placeholder={section.id === 'experience' ? 'Role / Project — Organization\nDates\n- What you did, how you did it, and the actual outcome.' : 'Enter your real information. Use a new line for each entry.'} />
                        </section>)}
                        <button className={secondary} disabled={cv.sections.length >= 20} onClick={() => update({ ...cv, sections: [...cv.sections, { id: crypto.randomUUID(), title: 'Additional Information', body: '' }] })}><Plus size={17} /> Add section</button>
                    </>}
                    {builder && <section className={cardClass}>
                        <button disabled={busy} onClick={() => void review()} className={`${buttonClass} mt-4`}>{busy ? <Loader2 size={17} className="animate-spin" /> : <FileCheck2 size={17} />} Check my CV</button>
                    </section>}
                </div>
                <div className={`space-y-5 lg:sticky lg:top-24 ${!builder && !result ? 'cv-before-results' : ''}`}>
                    {builder && <section className={cardClass}>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Live preview</h2><button className={buttonClass} disabled={busy} onClick={() => void exportPdf()}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} Download PDF</button></div>
                        <p className="mb-3 text-xs text-zinc-500">A4 • one column • selectable text • preview is continuous; PDF flows into pages.</p>
                        <article className="max-h-[65vh] overflow-auto rounded border border-zinc-200 bg-white p-6 text-black sm:p-9" style={{ fontFamily: 'Arial, Helvetica, sans-serif', overflowWrap: 'anywhere' }}>
                            <h3 dir="auto" className="text-3xl">{cv.name || 'Your name'}</h3>
                            <p dir="auto" className="mt-1 text-lg">{cv.headline}</p>
                            {[cv.email, cv.phone, cv.location, cv.links].filter(Boolean).map((v, i) => <p key={i} dir="auto" className="mt-1 text-sm">{v}</p>)}
                            {cv.sections.filter(s => s.body.trim()).map(s => <section key={s.id} className="mt-6"><h4 dir="auto" className="mb-2 border-b border-zinc-400 pb-1 text-lg">{s.title}</h4><p dir="auto" className="whitespace-pre-wrap text-sm leading-relaxed">{s.body}</p></section>)}
                            {!cv.sections.some(s => s.body.trim()) && <p className="mt-8 text-sm text-zinc-500">Your completed sections will appear here.</p>}
                        </article>
                        <button className={`${secondary} mt-3`} onClick={() => setShowReview(v => !v)}>{showReview ? 'Hide review' : 'Show CV checklist'}</button>
                    </section>}
                    {(!builder || showReview) && <section className={`${cardClass} cv-results`} aria-live="polite">
                        {result ? <>
                            <div className="flex items-center gap-5"><div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-8 border-lime-400"><span className="text-3xl font-semibold">{result.score}</span><span className="text-xs text-zinc-500">/ 100</span></div><div><h2 className="text-xl font-semibold">ATS readiness review</h2><p className="mt-1 text-sm text-zinc-500">{result.findings.filter(f => f.severity === 'high').length} important · {result.findings.filter(f => f.severity === 'medium').length} moderate</p></div></div>
                            <p className="mt-5 text-sm text-zinc-500">Checks for common parsing and resume-structure issues. This score does not guarantee acceptance by an employer’s ATS.</p>
                            <div className="mt-5 space-y-4">{result.findings.map(f => <article key={f.id} className={`cv-finding cv-finding-${f.severity}`}><div className="cv-finding-label">{f.severity === 'high' ? 'Important' : f.severity === 'medium' ? 'Moderate' : 'Suggestion'} <span>· {f.category}</span></div><div className="flex justify-between gap-3"><h3 className="font-semibold">{f.title}</h3>{f.points > 0 && <span className="shrink-0 text-sm">−{f.points}</span>}</div><p dir="auto" className="mt-2 break-words text-sm">{f.evidence}</p><p className="mt-3 text-sm"><strong>Suggested fix: </strong>{f.fix}</p></article>)}{!result.findings.length && <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="text-green-600" size={18} /> No issues found in the checks performed.</p>}</div>
                            <p className="mt-5 text-xs text-zinc-500">Not assessed: {result.notAssessed.join('; ')}.</p>
                        </> : builder ? <div className="py-10 text-center"><FileCheck2 size={32} className="mx-auto mb-4 text-green-600" /><h2 className="text-xl font-semibold">A little clarity goes a long way.</h2><p className="mt-3 text-sm text-zinc-500">Fill your details, then check your CV whenever you want.</p></div> : <div className="cv-benefits">{[
                            { Icon: ScanText, title: 'Readability', description: 'Check the text and structure your file reveals.' },
                            { Icon: ListChecks, title: 'Clear next steps', description: 'A practical fix for every finding.' },
                            { Icon: ShieldCheck, title: 'Private by design', description: 'Processed locally. No AI credits needed.' },
                        ].map(({ Icon, title, description }) => <div key={title}><Icon size={21} strokeWidth={1.5} /><h3>{title}</h3><p>{description}</p></div>)}</div>}
                        {!builder && <div className="cv-result-actions"><Link className="cv-text-button" href="/cv-builder">Build a clean CV <ArrowRight size={14} /></Link></div>}
                    </section>}
                </div>
            </div>}
            {!builder && result && <CheckerReport result={result} previews={previews} text={extractedText} source={source} previewErrors={previewErrors} onReplace={() => fileRef.current?.click()} />}
        </main>
    </div>;
}
