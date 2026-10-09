/** A usable print fallback when the host cannot create a PDF attachment. */
export function addBrowserPrintControls(html: string, saveLabel: string): string {
    const label = saveLabel.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
    const controls = `<style>
    @media screen { body { padding-top: 64px !important; } }
    .zedx-print-controls { position: fixed; top: 0; left: 0; right: 0; z-index: 9999; display: flex; justify-content: center; gap: 16px; align-items: center; padding: 12px; background: #111827; color: white; font: 14px sans-serif; }
    .zedx-print-controls button { padding: 10px 18px; background: #9df400; color: #111827; border: 0; border-radius: 8px; cursor: pointer; font-weight: 700; }
    @media print { .zedx-print-controls { display: none !important; } }
    </style><div class="zedx-print-controls"><button type="button" onclick="window.print()">${label}</button><span>Ctrl+P / ⌘P</span></div>
    <script>
    window.addEventListener('load', async function () {
        if (document.fonts) await document.fonts.ready;
        requestAnimationFrame(function () { requestAnimationFrame(function () { window.print(); }); });
    }, { once: true });
    </script>`;
    return html.replace('</body>', controls + '</body>');
}
