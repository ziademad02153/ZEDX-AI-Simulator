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

export function observeInterviewPreview(video: HTMLVideoElement): () => void {
    if (process.env.NODE_ENV !== 'development' || !video.requestVideoFrameCallback) return () => {};
    let cancelled = false, handle = 0, frames = 0, maxGap = 0, previous = 0, windows = 0;
    let started = performance.now(), firstPresented = 0, firstTotal = 0, firstDropped = 0;
    const frame = (now: number, metadata: VideoFrameCallbackMetadata) => {
        if (cancelled) return;
        if (!frames) {
            firstPresented = metadata.presentedFrames;
            const quality = video.getVideoPlaybackQuality();
            firstTotal = quality.totalVideoFrames; firstDropped = quality.droppedVideoFrames;
        }
        if (previous) maxGap = Math.max(maxGap, now - previous);
        previous = now; frames++;
        if (now - started < 10000) handle = video.requestVideoFrameCallback(frame);
        else {
            const stream = video.srcObject as MediaStream | null;
            const cameraFps = stream?.getVideoTracks()[0]?.getSettings().frameRate;
            const quality = video.getVideoPlaybackQuality();
            console.info(`[Interview preview] callbacks=${frames} presented=${metadata.presentedFrames - firstPresented} total=${quality.totalVideoFrames - firstTotal} dropped=${quality.droppedVideoFrames - firstDropped} elapsed_ms=${Math.round(now - started)} max_gap_ms=${Math.round(maxGap)} resolution=${video.videoWidth}x${video.videoHeight} camera_fps=${cameraFps} hidden=${document.hidden}`);
            frames = 0; maxGap = 0; previous = 0; started = now;
            if (++windows < 3) handle = video.requestVideoFrameCallback(frame);
        }
    };
    handle = video.requestVideoFrameCallback(frame);
    return () => { cancelled = true; video.cancelVideoFrameCallback(handle); };
}
