'use client';

let worker: Worker | undefined;
let nextId = 0;
let ready: Promise<void> | undefined;
export type AmySpeechState = { status: 'idle' | 'loading' | 'ready' | 'error'; progress: number | null; cached?: boolean };
let speechState: AmySpeechState = { status: 'idle', progress: null };
const listeners = new Set<() => void>();
let englishPreference: 'amy' | 'browser' | undefined;
function publish(state: AmySpeechState): void {
    if (speechState.status === state.status && speechState.progress === state.progress && speechState.cached === state.cached) return;
    speechState = state;
    listeners.forEach(listener => listener());
}
export function getAmySpeechState(): AmySpeechState { return speechState; }
export function subscribeAmySpeech(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
export function getEnglishSpeechPreference(): 'amy' | 'browser' {
    try { return window.sessionStorage.getItem('web_english_voice_provider') === 'browser' ? 'browser' : englishPreference || 'amy'; }
    catch { return englishPreference || 'amy'; }
}
export function setEnglishSpeechPreference(preference: 'amy' | 'browser'): void {
    englishPreference = preference;
    try { window.sessionStorage.setItem('web_english_voice_provider', preference); } catch { /* In-memory preference survives client navigation. */ }
}
export function canStartWithEnglishVoice(language: string, desktop: boolean, state: AmySpeechState, preference: 'amy' | 'browser'): boolean {
    return desktop || language !== 'en-US' || preference === 'browser' || state.status === 'ready';
}
const pending = new Map<number, { resolve: (audio?: Blob) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

export function disposeAmySpeech(reason?: string): void {
    worker?.terminate();
    worker = undefined;
    ready = undefined;
    for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error(reason || 'Amy speech stopped'));
    }
    pending.clear();
    publish({ status: reason ? 'error' : 'idle', progress: null });
}

function request(text?: string): Promise<Blob | undefined> {
    if (typeof window === 'undefined' || !window.Worker) return Promise.reject(new Error('Browser workers are unavailable'));
    if (!worker) {
        worker = new Worker(new URL('./piper-amy.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = ({ data }: MessageEvent<{ id: number; audio?: Blob; error?: string; cached?: boolean; progress?: { loaded: number; total: number } }>) => {
            const task = pending.get(data.id);
            if (!task) return;
            if (typeof data.cached === 'boolean') {
                publish({ status: 'loading', progress: null, cached: data.cached });
                return;
            }
            if (data.progress) {
                const { loaded, total } = data.progress;
                if (speechState.status === 'loading' && Number.isFinite(loaded) && Number.isFinite(total) && total > 0) {
                    publish({ status: 'loading', progress: Math.min(100, Math.max(0, Math.floor(loaded * 100 / total))) });
                }
                return;
            }
            clearTimeout(task.timer);
            pending.delete(data.id);
            if (data.error) task.reject(new Error(data.error));
            else task.resolve(data.audio);
        };
        worker.onerror = () => disposeAmySpeech('English voice could not be loaded');
        worker.onmessageerror = () => disposeAmySpeech('English voice communication failed');
    }
    return new Promise((resolve, reject) => {
        const id = ++nextId;
        const timer = setTimeout(() => disposeAmySpeech('English voice preparation timed out'), text ? 20000 : 300000);
        pending.set(id, { resolve, reject, timer });
        try { worker!.postMessage({ id, text }); }
        catch { disposeAmySpeech(); }
    });
}

export function preloadAmySpeech(): Promise<void> {
    if (!ready) {
        publish({ status: 'loading', progress: null });
        const loading = request().then(() => { publish({ status: 'ready', progress: 100 }); }).catch(error => {
            if (ready === loading) {
                ready = undefined;
                publish({ status: 'error', progress: null });
            }
            throw error;
        });
        ready = loading;
    }
    return ready;
}

export async function synthesizeAmySpeech(text: string): Promise<Blob> {
    if (!text.trim() || text.length > 6000) throw new Error('Invalid English speech text');
    await preloadAmySpeech();
    const audio = await request(text);
    if (!(audio instanceof Blob) || !audio.size) throw new Error('Amy returned empty audio');
    return audio;
}

// Keep inference bounded so playback can start before the whole question is rendered.
export function splitAmySpeechText(text: string, maxLength = 180): string[] {
    if (!Number.isInteger(maxLength) || maxLength < 1) throw new Error('Invalid speech chunk size');
    const sentences = text.trim().match(/[\s\S]+?(?:[.!?]+(?:["')]+)?(?=\s|$)|$)/g) || [];
    const chunks: string[] = [];
    for (const sentence of sentences) {
        let remaining = sentence.trim();
        while (remaining.length > maxLength) {
            const boundary = remaining.lastIndexOf(' ', maxLength);
            const cut = boundary > 0 ? boundary : maxLength;
            chunks.push(remaining.slice(0, cut).trim());
            remaining = remaining.slice(cut).trim();
        }
        if (remaining) chunks.push(remaining);
    }
    return chunks;
}
