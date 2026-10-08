type RuntimePaths = { onnxWasm: string; piperWasm: string; piperData: string };

// Piper constructs a phonemizer for every utterance. Keep its assets in this
// worker so later questions cannot depend on another CDN request.
export async function preparePiperRuntime(paths: RuntimePaths, dataParts?: string[]): Promise<RuntimePaths> {
    let cache: Cache | undefined;
    try { cache = await caches.open('zedx-piper-runtime-v1'); } catch { /* Memory still works when persistent storage is unavailable. */ }
    const urls: string[] = [];
    const load = async (url: string) => {
        let response: Response | undefined;
        try { response = await cache?.match(url); } catch { /* Fall back to the network during setup only. */ }
        let blob: Blob | undefined;
        if (response?.ok) {
            try { blob = await response.blob(); } catch { /* Replace an unreadable saved response. */ }
        }
        if (!blob?.size) {
            try { response = await fetch(url); }
            catch { throw new Error(`Amy runtime download failed: ${url}`); }
            if (!response.ok) throw new Error(`Amy runtime download failed (${response.status})`);
            try { blob = await response.blob(); }
            catch { throw new Error(`Amy runtime response could not be read: ${url}`); }
            if (!blob.size) throw new Error('Amy runtime download was empty');
            // Store only fully read assets, never a response with an unfinished body.
            try { await cache?.put(url, new Response(blob, { headers: { 'Content-Type': blob.type } })); } catch { /* Quota must not prevent in-memory playback. */ }
        }
        return blob;
    };
    try {
        const wasmBlob = await load(paths.piperWasm);
        const dataBlobs: Blob[] = [];
        for (const url of dataParts || [paths.piperData]) dataBlobs.push(await load(url));
        const piperWasm = URL.createObjectURL(wasmBlob);
        urls.push(piperWasm);
        const piperData = URL.createObjectURL(new Blob(dataBlobs, { type: 'application/octet-stream' }));
        urls.push(piperData);
        return { ...paths, piperWasm, piperData };
    } catch (error) {
        urls.forEach(url => URL.revokeObjectURL(url));
        throw error;
    }
}
