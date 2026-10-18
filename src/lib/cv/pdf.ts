import type { CvDocument } from './core';
import { parseCvDraft, cleanCvText, cvText } from './core';

/** Writes actual PDF text, never screenshots. */
export async function createCvPdf(input: CvDocument, fontBytes?: ArrayBuffer): Promise<Blob> {
    const cv = parseCvDraft(input);
    const { jsPDF } = await import('jspdf');
    const needsArabic = /[\u0600-\u06ff]/u.test(cvText(cv));
    if (needsArabic && !fontBytes) {
        const response = await fetch('/fonts/Amiri-Regular.ttf');
        if (!response.ok) throw Error('PDF font could not be loaded. Please retry.');
        fontBytes = await response.arrayBuffer();
    }
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    if (needsArabic && fontBytes) {
        const bytes = new Uint8Array(fontBytes);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        pdf.addFileToVFS('Amiri-Regular.ttf', btoa(binary));
        pdf.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    }
    pdf.setFont('helvetica'); pdf.setTextColor(0, 0, 0);
    pdf.setProperties({ title: `${cleanCvText(cv.name) || 'Resume'} — CV`, creator: 'ZEDX CV Builder' });
    let y = 22;
    const write = (text: string, size: number, gap = 2) => {
        pdf.setFontSize(size);
        for (const paragraph of cleanCvText(text).split('\n')) {
            if (!paragraph.trim()) { y += 2; continue; }
            const rtl = /^[^a-zA-Z]*[\u0600-\u06ff]/u.test(paragraph);
            pdf.setFont(/[\u0600-\u06ff]/u.test(paragraph) ? 'Amiri' : 'helvetica', 'normal');
            const lines: string[] = pdf.splitTextToSize(paragraph.trim(), 170);
            for (const line of lines) {
                if (y > 274) { pdf.addPage(); y = 22; }
                if (rtl) pdf.text(line, 190, y, { align: 'right', isInputVisual: false, isOutputVisual: true });
                else pdf.text(line, 20, y);
                y += size * 0.48;
            }
        }
        y += gap;
    };
    write(cv.name, 23, 2);
    if (cv.headline) write(cv.headline, 13, 2);
    for (const value of [cv.email, cv.phone, cv.location, cv.links].filter(Boolean)) write(value, 11, 0);
    y += 5;
    for (const section of cv.sections.filter(s => s.body.trim())) {
        if (y > 252) { pdf.addPage(); y = 22; }
        write(section.title, 14, 1);
        pdf.setDrawColor(170); pdf.line(20, y - 2, 190, y - 2);
        y += 3;
        write(section.body, 12, 5);
    }
    return pdf.output('blob');
}
