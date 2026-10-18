import { MAX_CV_TEXT, countPdfDirectionGlyphs, type CvFileEvidence } from './core';
export type CvReadProgress = { stage: 'Opening file' | 'Reading PDF' | 'Rendering preview'; current: number; total: number };
export type CvFileResult = { text: string; pages?: number; evidence: CvFileEvidence; previews: string[]; previewErrors: number };

/** Local extraction only: no CV bytes or text are sent to a provider/server. */
export async function readCvFile(file: File, onProgress?: (progress: CvReadProgress) => void): Promise<CvFileResult> {
    onProgress?.({ stage: 'Opening file', current: 0, total: 1 });
    if (file.size > 5 * 1024 * 1024) throw Error('Maximum file size is 5 MB.');
    if (/\.txt$/i.test(file.name)) {
        const text = await file.text();
        if (text.length > MAX_CV_TEXT) throw Error('CV exceeds 40,000 characters.');
        return { text, evidence: {}, previews: [], previewErrors: 0 };
    }
    if (!/\.pdf$/i.test(file.name)) throw Error('Choose a PDF or TXT file. DOCX is not supported yet.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw Error('This file is not a valid PDF.');
    // Serve the pinned ESM module directly: bundling pdfjs in Next's client chunk
    // can break its module namespace at runtime (Object.defineProperty).
    const moduleUrl = '/pdfjs/pdf.min.mjs';
    const pdfjs: typeof import('pdfjs-dist') = await import(/* webpackIgnore: true */ moduleUrl);
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
    const task = pdfjs.getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true, standardFontDataUrl: '/pdfjs/standard_fonts/' });
    const timeout = setTimeout(() => { void task.destroy(); }, 60000);
    try {
        const pdf = await task.promise;
        if (pdf.numPages > 15) throw Error('Use a CV of at most 15 pages.');
        const pages: string[] = [];
        let possibleColumns = false;
        let emptyPages = 0;
        let directionGlyphs = 0;
        const previews: string[] = [];
        let previewErrors = 0;
        for (let index = 1; index <= pdf.numPages; index++) {
            onProgress?.({ stage: 'Reading PDF', current: index - 1, total: pdf.numPages });
            const page = await pdf.getPage(index);
            const content = await page.getTextContent();
            const operators = await page.getOperatorList();
            directionGlyphs += countPdfDirectionGlyphs(operators.argsArray);
            const width = page.getViewport({ scale: 1 }).width;
            const rows = new Map<number, { left: string; right: string; crosses: boolean }>();
            let previousY: number | undefined;
            let text = '';
            for (const item of content.items) {
                if (!('str' in item)) continue;
                const y = item.transform[5];
                const rowKey = Math.round(y / 4);
                const row = rows.get(rowKey) || { left: '', right: '', crosses: false };
                const x = item.transform[4];
                if (x + item.width < width * .45) row.left += item.str;
                else if (x > width * .55) row.right += item.str;
                else if (item.str.trim()) row.crosses = true;
                rows.set(rowKey, row);
                if (previousY !== undefined && Math.abs(y - previousY) > 3 && !text.endsWith('\n')) text += '\n';
                text += item.str + (item.hasEOL ? '\n' : ' ');
                previousY = y;
            }
            pages.push(text.trim());
            if (text.trim().length < 10) emptyPages++;
            if ([...rows.values()].filter(row => !row.crosses && row.left.length > 25 && row.right.length > 25).length >= 5) possibleColumns = true;
            if (pages.join('\n').length > MAX_CV_TEXT) throw Error('CV exceeds 40,000 characters. No partial review was generated.');
            onProgress?.({ stage: 'Rendering preview', current: index, total: pdf.numPages });
            const canvas = document.createElement('canvas');
            try {
                const viewport = page.getViewport({ scale: 850 / width });
                canvas.width = Math.ceil(viewport.width);
                // Bound unusual page aspect ratios before allocating a bitmap.
                if (viewport.height > 2400) throw Error('Page is too tall for preview.');
                canvas.height = Math.ceil(viewport.height);
                const context = canvas.getContext('2d');
                if (!context) throw Error('Preview is unavailable.');
                await page.render({ canvas, canvasContext: context, viewport, background: '#ffffff' }).promise;
                previews.push(canvas.toDataURL('image/jpeg', .82));
            } catch { previews.push(''); previewErrors++; }
            finally { canvas.width = canvas.height = 0; }
            page.cleanup();
        }
        const text = pages.join('\n\n');
        return { text, pages: pdf.numPages, previews, previewErrors, evidence: { possibleColumns, emptyPages, pages: pdf.numPages, directionGlyphs } };
    } finally { clearTimeout(timeout); await task.destroy(); }
}

export function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
    document.body.appendChild(anchor);
    try { anchor.click(); } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
}
