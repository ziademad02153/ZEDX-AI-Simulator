import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extractText } from 'unpdf';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
test('saved appearance overrides device preference; system uses device preference', () => {
    const layout = readFileSync('src/app/layout.tsx', 'utf8');
    const script = layout.match(/__html: `([\s\S]*?var theme = localStorage[\s\S]*?)`,/)[1];
    for (const [saved, deviceDark, expected] of [['light', true, false], ['dark', false, true], ['system', true, true], [null, false, false], [null, true, true]]) {
        let dark;
        vm.runInNewContext(script, { localStorage: { getItem: () => saved }, window: { matchMedia: () => ({ matches: deviceDark }) }, document: { documentElement: { classList: { add: () => { dark = true; }, remove: () => { dark = false; } } } } });
        assert.equal(dark, expected, `saved=${saved}, deviceDark=${deviceDark}`);
    }
    assert.match(readFileSync('src/app/globals.css', 'utf8'), /@custom-variant dark/);
});
function load(path, dependencies = {}, context = {}) {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, {
        exports, require: key => dependencies[key] || require(key), Blob, btoa, Uint8Array, ArrayBuffer, TextDecoder, Set, console, setTimeout, clearTimeout, AbortController, ...context,
    });
    return exports;
}
const core = load('src/lib/cv/core.ts');
const pdf = load('src/lib/cv/pdf.ts', { './core': core });
const spelling = load('src/lib/cv/spelling.ts', { './core': core });
const report = load('src/components/cv/checker-report.tsx');
const workspace = load('src/components/cv/workspace.tsx', { './checker-report': report, '@/lib/cv/spelling': spelling, './workspace.module.css': { default: { workspace: 'cv-workspace' }, __esModule: true }, '@/lib/cv/core': core, '@/lib/cv/files': {}, '@/lib/cv/pdf': pdf, '@/components/navbar': { Navbar: () => null }, 'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children), __esModule: true } });
test('checker is upload-only, with English copy and no interview or job fields', () => {
    const html = renderToStaticMarkup(React.createElement(workspace.CvWorkspace, { mode: 'checker' }));
    assert.match(html, /Upload Your Resume/);
    assert.equal((html.match(/type="file"/g) || []).length, 1);
    assert.doesNotMatch(html, /<textarea|Professional title|Job description|Specific skills|Or paste/);
    assert.doesNotMatch(html, /[\u0600-\u06ff]/);
});
test('builder uses English default sections; professional title is an optional CV field', () => {
    const html = renderToStaticMarkup(React.createElement(workspace.CvWorkspace, { mode: 'builder' }));
    assert.match(html, /Full name/); assert.match(html, /Professional title/); assert.match(html, /Download PDF/);
    assert.doesNotMatch(html, /Job description|[\u0600-\u06ff]/);
    assert.doesNotMatch(html, /Keep an editable copy|Save on this browser|Restore saved draft|Download draft|Import draft|Delete saved copy|How the score works/);
});
const full = `Alex Morgan\nalex@example.com\nEducation\nComputer science degree completed through coursework and practical learning.\nExperience\nBuilt a student project to track community events and maintain useful records for volunteers. Worked with teammates to clarify requirements and documented the implementation and testing steps. Reviewed feedback to improve the workflow and fix problems discovered during testing.\nSkills\nJavaScript React SQL communication. Additional practice included creating clear instructions for colleagues and explaining the project to stakeholders. Collaborated on an accessible interface and supported users with questions about features and data entry.`;
test('score has auditable weights and perfect means checklist only', () => {
    assert.equal(core.CV_RULES.reduce((n, r) => n + r.points, 0), 100);
    assert.equal(core.checkCv(full).score, 100);
    const missing = core.checkCv(full.replace('alex@example.com', 'invalid-email'));
    assert.equal(missing.score, 87);
    assert.equal(missing.findings[0].id, 'contact');
    assert.ok(missing.findings.every(f => f.fix && f.evidence));
});
test('empty, oversized and insufficient text cannot get a score', () => {
    for (const input of ['', 'tiny CV', 'x'.repeat(40001)]) assert.throws(() => core.checkCv(input));
});
test('Arabic headings and email are recognized; absence of numbers is not penalized', () => {
    const text = `زياد عماد\nziad@example.com\nالتعليم\nجامعة القاهرة\nالمشاريع\n${'تطوير مشروع دراسي والعمل مع الفريق لتحسين الخدمة وتوثيق خطوات التنفيذ والاختبار '.repeat(8)}\nالمهارات\nالتواصل والعمل الجماعي`;
    assert.equal(core.checkCv(text).score, 100);
});
test('duplicates deduct once, unfinished fields have concrete findings', () => {
    const result = core.checkCv(full + '\nTODO\n' + 'Worked on a real project and documented the work.\n'.repeat(4));
    assert.equal(result.score, 79);
    assert.equal(result.findings.length, 2);
});
test('job matching keeps Java distinct from JavaScript and recognizes punctuation and aliases', () => {
    const result = core.matchJob('JavaScript reactjs C++ .NET PostgreSQL', 'Java React C++ C# dotnet postgres');
    assert.deepEqual(Array.from(result.found), ['C++', '.NET', 'React', 'PostgreSQL']);
    assert.deepEqual(Array.from(result.missing), ['Java', 'C#']);
});
test('draft import is bounded, versioned, unique and strips unrelated keys', () => {
    const draft = core.emptyCv();
    assert.equal(core.parseCvDraft({ ...draft, owner: 'other-user' }).owner, undefined);
    assert.throws(() => core.parseCvDraft({ ...draft, version: 2 }));
    assert.throws(() => core.parseCvDraft({ ...draft, sections: [draft.sections[0], draft.sections[0]] }));
    assert.throws(() => core.parseCvDraft({ ...draft, sections: [{ id: 'a', title: 'a', body: 'x'.repeat(15001) }] }));
});
test('user-confirmed skill phrases support professions outside the built-in dictionary', () => {
    const result = core.matchJob('مهارات رعاية المرضى وكتابة التقارير', '', ['رعاية المرضى', 'إدارة المخزون']);
    assert.deepEqual(Array.from(result.found), ['رعاية المرضى']);
    assert.deepEqual(Array.from(result.missing), ['إدارة المخزون']);
    assert.throws(() => core.matchJob('', '', Array(51).fill('skill')));
});
test('empty sections do not pass; alternate headings and PDF ligatures are understood', () => {
    const empty = core.checkCv(full.replace('Computer science degree completed through coursework and practical learning.', ''));
    assert.ok(empty.findings.some(f => f.id === 'education'));
    const alternate = core.checkCv(full.replace('Experience', 'WORK HISTORY').replace('Skills', 'CORE COMPETENCIES'));
    assert.equal(alternate.score, 100);
    assert.equal(core.cleanCvText('proﬁle\u202a'), 'profile');
});
test('critical findings precede moderate findings and layout warnings are evidence-based', () => {
    const result = core.checkCv(full.replace('alex@example.com', 'bad-email') + '\nJune 2025 – January 2024\nTODO', { possibleColumns: true, emptyPages: 1, pages: 2 });
    const mediumIndex = result.findings.findIndex(f => f.severity === 'medium');
    assert.ok(mediumIndex > 0);
    assert.ok(result.findings.slice(0, mediumIndex).every(f => f.severity === 'high'));
    assert.ok(result.findings.some(f => f.id === 'dates'));
    assert.ok(result.findings.some(f => f.id === 'layout'));
    assert.ok(result.findings.some(f => f.id === 'empty-pages'));
    assert.ok(result.findings.every(f => f.fix && f.evidence && f.category));
    assert.ok(!core.checkCv(full).findings.some(f => f.id === 'layout'));
});
test('unreadable PDF is not awarded a score or invented missing sections', () => {
    const result = core.checkCv('', { pages: 2, emptyPages: 2, possibleColumns: false });
    assert.equal(result.score, null);
    assert.equal(result.assessed, 0);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].id, 'no-text');
});
test('example portfolio URLs and hidden PDF direction glyphs produce specific findings', () => {
    const result = core.checkCv(full + '\nhttps://example.com/omar', { pages: 1, possibleColumns: false, directionGlyphs: 3 });
    assert.ok(result.findings.some(f => f.id === 'placeholders' && f.evidence.includes('example.com')));
    assert.ok(result.findings.some(f => f.id === 'encoding' && f.evidence.includes('3 invisible')));
    assert.ok(result.score < 100);
    const glyphs = core.countPdfDirectionGlyphs([[ [{ fontChar: 'a', unicode: '\u202a' }, { fontChar: 'b', unicode: 'Z' }, { fontChar: 'c', unicode: '\u202c\u200f' } ] ]]);
    assert.equal(glyphs, 3);
    assert.ok(!core.checkCv(full + '\nhttps://example.com.evil.org/profile').findings.some(f => f.id === 'placeholders'));
});
test('actual local dictionary detects misspellings and lowers the assessed content score', () => {
    const nspell = require('nspell');
    const engine = nspell({ aff: readFileSync('public/dictionaries/en.aff', 'utf8'), dic: readFileSync('public/dictionaries/en.dic', 'utf8') });
    const input = full + '\n- I sucessfully improved the the project and its developement workflow.';
    const evidence = spelling.inspectSpelling(input, engine);
    assert.equal(evidence.status, 'checked');
    assert.ok(evidence.candidates.some(c => c.word === 'sucessfully'));
    const result = core.checkCv(input, { possibleColumns: false, pages: 1 }, evidence);
    assert.ok(result.findings.some(f => f.id === 'spelling'));
    assert.ok(result.findings.some(f => f.id === 'word-repeat'));
    assert.ok(result.score < 100);
    assert.ok(result.categories.find(c => c.name === 'Content').score < 100);
});
test('report includes original image, page controls, category scores and actual check coverage', () => {
    const result = core.checkCv(full);
    const html = renderToStaticMarkup(React.createElement(report.CheckerReport, { result, source: 'resume.pdf', text: full, previews: ['data:image/jpeg;base64,AAAA'], previewErrors: 0, onReplace() {} }));
    assert.match(html, /Original/); assert.match(html, /Extracted text/);
    assert.match(html, /Original uploaded resume, page 1/);
    assert.match(html, /data:image\/jpeg;base64,AAAA/);
    assert.match(html, /Page 1 of 1/);
    assert.match(html, /Structure/); assert.match(html, /Content/);
    assert.match(html, /rules assessed/);
    assert.doesNotMatch(html, /90% read|100% read/);
    const flagged = core.checkCv(full + '\nhttps://example.com/omar');
    const flaggedHtml = renderToStaticMarkup(React.createElement(report.CheckerReport, { result: flagged, source: 'resume.pdf', text: full, previews: [], previewErrors: 0, onReplace() {} }));
    assert.match(flaggedHtml, /Resolve important findings first/);
    assert.match(flaggedHtml, /Unfinished placeholder or example link/);
    assert.doesNotMatch(flaggedHtml, /Strong on the assessed checks/);
});
test('real PDF is parsed and rendered by the production reader with page progress', async () => {
    const canvas = require('@napi-rs/canvas');
    globalThis.DOMMatrix ??= canvas.DOMMatrix;
    globalThis.Path2D ??= canvas.Path2D;
    globalThis.ImageData ??= canvas.ImageData;
    const pdfjs = await import('../public/pdfjs/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('../public/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
    const reader = load('src/lib/cv/files.ts', { './core': core, '/pdfjs/pdf.min.mjs': {
        GlobalWorkerOptions: {}, getDocument: options => pdfjs.getDocument({ ...options, standardFontDataUrl: fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url)).replaceAll('\\', '/'), useSystemFonts: false }),
    } }, { document: { createElement: () => canvas.createCanvas(1, 1) } });
    const cv = core.emptyCv(); cv.name = 'Omar Hassan'; cv.email = 'omar@example.com'; cv.sections[1].body = full;
    const bytes = new Uint8Array(await (await pdf.createCvPdf(cv)).arrayBuffer());
    const stages = [];
    const output = await reader.readCvFile({ name: 'fixture.pdf', size: bytes.length, arrayBuffer: async () => bytes.slice().buffer }, step => stages.push(step));
    assert.match(output.text, /Omar Hassan/);
    assert.equal(output.previewErrors, 0);
    assert.equal(output.previews.length, output.pages);
    assert.match(output.previews[0], /^data:image\/jpeg;base64,/);
    assert.ok(stages.some(s => s.stage === 'Reading PDF'));
    assert.ok(stages.some(s => s.stage === 'Rendering preview'));
    mkdirSync('.data/cv-qa', { recursive: true });
    writeFileSync('.data/cv-qa/actual-reader-preview.jpg', Buffer.from(output.previews[0].split(',')[1], 'base64'));
    const { jsPDF } = require('jspdf');
    const columns = new jsPDF();
    columns.setFontSize(9);
    for (let i = 0; i < 6; i++) {
        columns.text('Developed reliable product workflows', 20, 25 + i * 9);
        columns.text('Reviewed customer reports and tests', 118, 25 + i * 9);
    }
    const columnBytes = new Uint8Array(columns.output('arraybuffer'));
    const columnOutput = await reader.readCvFile({ name: 'columns.pdf', size: columnBytes.length, arrayBuffer: async () => columnBytes.slice().buffer });
    assert.equal(columnOutput.evidence.possibleColumns, true);
    const imageOnly = new jsPDF(); imageOnly.setFillColor(90, 160, 180); imageOnly.rect(20, 20, 50, 20, 'F');
    const imageBytes = new Uint8Array(imageOnly.output('arraybuffer'));
    const imageOutput = await reader.readCvFile({ name: 'no-text.pdf', size: imageBytes.length, arrayBuffer: async () => imageBytes.slice().buffer });
    assert.equal(imageOutput.evidence.emptyPages, 1);
    assert.match(imageOutput.previews[0], /^data:image\/jpeg;base64,/);
    assert.equal(core.checkCv(imageOutput.text, imageOutput.evidence).score, null);
    const legacy = new jsPDF();
    legacy.addFileToVFS('Amiri.ttf', readFileSync('public/fonts/Amiri-Regular.ttf').toString('base64'));
    legacy.addFont('Amiri.ttf', 'Amiri', 'normal'); legacy.setFont('Amiri');
    legacy.text('\u202aZiad Emad\u202c\u200f', 20, 20);
    legacy.setFont('helvetica'); legacy.setFontSize(10); legacy.text(legacy.splitTextToSize(full, 170), 20, 35);
    const legacyBytes = new Uint8Array(legacy.output('arraybuffer'));
    const legacyOutput = await reader.readCvFile({ name: 'legacy.pdf', size: legacyBytes.length, arrayBuffer: async () => legacyBytes.slice().buffer });
    assert.ok(legacyOutput.evidence.directionGlyphs >= 3);
    assert.ok(core.checkCv(legacyOutput.text, legacyOutput.evidence).findings.some(f => f.id === 'encoding'));
});
test('clean English name exports without direction-control artifacts or custom glyph font', async () => {
    const cv = core.emptyCv(); cv.name = '\u202aZiad Emad\u202c'; cv.email = 'ziad@example.com'; cv.sections[1].body = 'Built a student project and documented its implementation.';
    const blob = await pdf.createCvPdf(cv);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const extracted = await extractText(bytes.slice());
    const text = Array.isArray(extracted.text) ? extracted.text.join('\n') : extracted.text;
    assert.match(text, /^Ziad Emad/);
    assert.doesNotMatch(text, /[\u202a-\u202e\ufffd]/);
    mkdirSync('.data/cv-qa', { recursive: true }); writeFileSync('.data/cv-qa/ziad-name.pdf', bytes);
});
test('generated PDF contains extractable English text and automatic page flow, without images', async () => {
    const cv = core.emptyCv(); cv.name = 'Alex Morgan'; cv.email = 'alex@example.com';
    cv.sections[1].body = Array.from({ length: 90 }, (_, i) => `Project ${i}: Implemented a verified feature and documented actual results.`).join('\n');
    const font = readFileSync('public/fonts/Amiri-Regular.ttf');
    const blob = await pdf.createCvPdf(cv, font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const extracted = await extractText(bytes.slice());
    const text = Array.isArray(extracted.text) ? extracted.text.join('\n') : extracted.text;
    assert.match(text, /Alex Morgan/); assert.match(text, /Project 0:/); assert.match(text, /Project 89:/);
    assert.ok(extracted.totalPages > 1);
    assert.doesNotMatch(new TextDecoder().decode(bytes), /\/Subtype\s*\/Image/);
    mkdirSync('.data/cv-qa', { recursive: true }); writeFileSync('.data/cv-qa/english.pdf', bytes);
});
test('Arabic PDF is text-based and preserves visible Arabic glyphs', async () => {
    const cv = core.emptyCv(); cv.name = 'زياد عماد'; cv.email = 'ziad@example.com';
    cv.sections = [{ id: 'edu', title: 'التعليم', body: 'جامعة القاهرة\nمشروع تطوير خدمة للطلاب\nالمهارات: JavaScript و React' }];
    const font = readFileSync('public/fonts/Amiri-Regular.ttf');
    const blob = await pdf.createCvPdf(cv, font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const extracted = await extractText(bytes.slice());
    const text = (Array.isArray(extracted.text) ? extracted.text.join('\n') : extracted.text).normalize('NFKC');
    assert.match(text, /زياد/); assert.match(text, /القاهرة/); assert.match(text, /JavaScript/);
    writeFileSync('.data/cv-qa/arabic.pdf', bytes);
});
