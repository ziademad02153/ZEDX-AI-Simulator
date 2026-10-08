'use client';

const KEY = 'zedx_interview_startup_started';
export function markInterviewStart(): void {
    if (process.env.NODE_ENV !== 'development') return;
    try { sessionStorage.setItem(KEY, String(performance.timeOrigin + performance.now())); } catch {}
}
export function markInterviewFirstAudio(provider: string): void {
    if (process.env.NODE_ENV !== 'development') return;
    try {
        const raw = sessionStorage.getItem(KEY);
        if (!raw) return;
        sessionStorage.removeItem(KEY);
        const elapsed = performance.timeOrigin + performance.now() - Number(raw);
        if (Number.isFinite(elapsed) && elapsed >= 0) {
            console.info(`[Interview startup] first_audio_ms=${Math.round(elapsed)} provider=${provider}`);
        }
    } catch {}
}
