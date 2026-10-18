'use client';

import { useRef, useState } from 'react';
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, FileText, ScanText, AlertCircle } from 'lucide-react';
import type { checkCv, Finding } from '@/lib/cv/core';
type Props = { result: ReturnType<typeof checkCv>; previews: string[]; text: string; source: string; previewErrors: number; onReplace: () => void };

export function CheckerReport({ result, previews, text, source, previewErrors, onReplace }: Props) {
    const [page, setPage] = useState(0);
    const [view, setView] = useState<'original' | 'text'>('original');
    const [category, setCategory] = useState<Finding['category'] | 'All'>('All');
    const [showChecks, setShowChecks] = useState(false);
    const feedbackRef = useRef<HTMLElement>(null);
    function selectCategory(value: Finding['category'] | 'All') {
        setCategory(value);
        feedbackRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    }
    const issues = result.findings.filter(f => category === 'All' || f.category === category);
    const checks = result.checks.filter(c => category === 'All' || c.category === category);
    const score = result.score;
    const important = result.findings.filter(f => f.severity === 'high').length;
    const moderate = result.findings.filter(f => f.severity === 'medium').length;
    const scoreColor = score === null ? '#929299' : important || score < 55 ? '#df525e' : moderate || score < 80 ? '#d78925' : '#7caf20';
    return <section className="cv-report-layout" aria-label="Resume analysis report">
        <aside className="cv-panel cv-report-sidebar">
            <p className="cv-report-kicker">YOUR RESUME REVIEW</p>
            <div className="cv-score-gauge" style={{ background: `conic-gradient(${scoreColor} ${(score ?? 0) * 3.6}deg, var(--cv-line) 0)` }}><div><strong>{score ?? '—'}</strong><span>{score === null ? 'Not rated' : 'out of 100'}</span></div></div>
            <h2>{score === null ? 'A complete score is unavailable' : important ? 'Resolve important findings first' : moderate || score < 80 ? 'A few things to improve' : 'Strong on the assessed checks'}</h2>
            <p className="cv-report-note">{result.assessed} of {result.total} rules assessed. Score covers those rules only.</p>
            <div className="cv-report-summary"><span><i className="cv-dot cv-dot-high" />{result.findings.filter(f => f.severity === 'high').length} important</span><span><i className="cv-dot cv-dot-medium" />{result.findings.filter(f => f.severity === 'medium').length} moderate</span></div>
            <nav className="cv-category-nav" aria-label="Report categories">
                <button onClick={() => selectCategory('All')} aria-pressed={category === 'All'}><span>All findings</span><span>{result.findings.length}</span></button>
                {result.categories.map(c => <button key={c.name} onClick={() => selectCategory(c.name)} aria-pressed={category === c.name}><span>{c.name}<small>{c.assessed}/{c.total} rules assessed</small></span><span>{c.score === null ? '—' : `${c.score}/100`}</span></button>)}
            </nav>
            <button className="cv-secondary" onClick={onReplace}>Upload another resume <ArrowUpRight size={15} /></button>
            <p className="cv-report-disclaimer">Local parsing and writing checks. Not an employer ATS score or hiring prediction.</p>
        </aside>
        <div className="cv-report-main">
            <section className="cv-panel cv-original">
                <div className="cv-report-heading"><div><p className="cv-report-kicker">THE ACTUAL FILE</p><h2>Your resume, two ways.</h2></div><div className="cv-view-tabs" role="group" aria-label="Resume view"><button aria-pressed={view === 'original'} onClick={() => setView('original')}>Original</button><button aria-pressed={view === 'text'} onClick={() => setView('text')}>Extracted text</button></div></div>
                <p className="cv-report-filename"><FileText size={14} /><span>{source} · {result.words} words extracted</span></p>
                {view === 'original' ? previews.length ? <>
                    <div className="cv-original-stage" tabIndex={0} aria-label="Scrollable original resume preview">{previews[page] ? <img src={previews[page]} alt={`Original uploaded resume, page ${page + 1}`} className="cv-original-image" /> : <div className="cv-preview-unavailable"><AlertCircle size={26} /><p>Preview unavailable for this page.</p><button className="cv-text-button" onClick={() => setView('text')}>View extracted text instead</button></div>}</div>
                    <div className="cv-page-controls"><button disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous resume page"><ChevronLeft size={18} /></button><span>Page {page + 1} of {previews.length}</span><button disabled={page >= previews.length - 1} onClick={() => setPage(p => p + 1)} aria-label="Next resume page"><ChevronRight size={18} /></button></div>
                </> : <div className="cv-preview-unavailable"><ScanText size={28} /><p>This is a text file. Use Extracted text to see what was reviewed.</p><button className="cv-text-button" onClick={() => setView('text')}>View text <ArrowUpRight size={14} /></button></div> : <div className="cv-extracted"><p>The text below is what the checker read. Compare its completeness and order with your original.</p><pre dir="auto">{text || 'No selectable text was extracted from this PDF.'}</pre></div>}
                {previewErrors > 0 && <p className="cv-report-note">{previewErrors} page preview(s) could not be rendered. Text analysis is shown separately.</p>}
            </section>
            <section ref={feedbackRef} className="cv-panel cv-feedback">
                <div className="cv-report-heading"><div><p className="cv-report-kicker">{category === 'All' ? 'PRIORITIZED FEEDBACK' : category.toUpperCase()}</p><h2>{category === 'All' ? 'What to improve.' : `${category} review.`}</h2></div><span className="cv-issue-count">{issues.length} findings</span></div>
                <div className="cv-findings-list">{issues.map((f, i) => <article key={f.id} className={`cv-finding cv-finding-${f.severity}`}><div className="cv-finding-label">{f.severity === 'high' ? 'Important' : f.severity === 'medium' ? 'Moderate' : 'Suggestion'} <span>· {f.category}</span></div><h3>{i + 1}. {f.title}</h3><blockquote dir="auto">{f.evidence}</blockquote><p><strong>Suggested fix</strong><br />{f.fix}</p></article>)}{!issues.length && <div className="cv-passed-message"><Check size={20} /><div><strong>No issues found by these checks.</strong><p>Review the extracted text and unassessed items too. This does not establish that the resume is perfect.</p></div></div>}</div>
                <button className="cv-text-button cv-checks-toggle" aria-expanded={showChecks} onClick={() => setShowChecks(v => !v)}>{showChecks ? 'Hide individual checks' : 'View individual checks'} <span>{checks.filter(c => c.status !== 'not-assessed').length}/{checks.length}</span></button>
                {showChecks && <div className="cv-check-list">{checks.map(c => <div key={c.id}><div><strong>{c.label}</strong><span data-status={c.status}>{c.status === 'passed' ? 'No issue detected' : c.status === 'issue' ? 'Review' : 'Not assessed'}</span></div><p>{c.note}</p></div>)}</div>}
                <div className="cv-unassessed"><strong>Outside this review</strong><p>{result.notAssessed.join(' · ')}. No percentage of “content read by every ATS” is inferred.</p></div>
            </section>
        </div>
    </section>;
}
