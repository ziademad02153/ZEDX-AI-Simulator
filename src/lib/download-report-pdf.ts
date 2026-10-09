/** Render the existing report pages locally, including the browser's Arabic/RTL shaping. */
export async function createReportPdf(html: string): Promise<Blob> {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;pointer-events:none;';
    try {
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Report layout timed out')), 15000);
            frame.onload = () => { clearTimeout(timeout); resolve(); };
            frame.srcdoc = html;
            document.body.appendChild(frame);
        });
        const doc = frame.contentDocument;
        if (!doc) throw new Error('Report document unavailable');
        // Long answers must remain visible rather than being clipped by the print template.
        const layout = doc.createElement('style');
        layout.textContent = '.page{height:auto!important;min-height:297mm!important;max-height:none!important;overflow:visible!important;}';
        doc.head.appendChild(layout);
        if (doc.fonts) await doc.fonts.ready;
        await Promise.all([...doc.images].map(image => image.decode().catch(() => {})));
        const pages = [...doc.querySelectorAll<HTMLElement>('.page')];
        if (!pages.length) throw new Error('Report has no pages');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        for (let index = 0; index < pages.length; index++) {
            if (index) pdf.addPage();
            const canvas = await html2canvas(pages[index], { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
            if (!canvas.width || !canvas.height) throw new Error('Report page rendering failed');
            const width = Math.min(210, 297 * canvas.width / canvas.height);
            const height = width * canvas.height / canvas.width;
            pdf.addImage(canvas, 'PNG', (210 - width) / 2, 0, width, height, undefined, 'FAST');
            canvas.width = canvas.height = 0;
        }
        return pdf.output('blob');
    } finally { frame.remove(); }
}

export async function downloadReportPdf(html: string, filename: string): Promise<void> {
    const blob = await createReportPdf(html);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
    document.body.appendChild(link);
    try { link.click(); } finally {
        link.remove();
        // Allow the browser to finish reading the blob before releasing it.
        setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
}
