/** Record only the candidate's turn; audio stays in memory and is discarded after transcription. */
export function recordInterviewAnswer(stream: MediaStream): { finish: () => Promise<Blob>; cancel: () => void } {
    const tracks = stream.getAudioTracks().filter(track => track.readyState === 'live');
    if (!tracks.length || typeof MediaRecorder === 'undefined') throw new Error('Audio recording unavailable');
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
        .find(type => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(new MediaStream(tracks), mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    let finishPromise: Promise<Blob> | null = null;
    let failure: Error | null = null;
    recorder.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data); };
    recorder.onerror = () => { failure = new Error('Audio recording failed'); };
    recorder.start(1000);
    return {
        finish() {
            if (finishPromise) return finishPromise;
            finishPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => { chunks.length = 0; reject(new Error('Audio recorder did not stop')); }, 5000);
                recorder.onstop = () => {
                    clearTimeout(timeout);
                    const blob = new Blob(chunks, { type: recorder.mimeType });
                    chunks.length = 0;
                    if (failure || blob.size === 0) reject(failure || new Error('No audio recorded'));
                    else resolve(blob);
                };
                if (recorder.state === 'inactive') { clearTimeout(timeout); reject(failure || new Error('Audio recorder already stopped')); }
                else recorder.stop();
            });
            return finishPromise;
        },
        cancel() {
            recorder.ondataavailable = null;
            chunks.length = 0;
            if (recorder.state !== 'inactive') recorder.stop();
        }
    };
}

export async function transcribeInterviewAnswer(audio: Blob, token: string, language: string): Promise<string> {
    const data = new FormData();
    const extension = audio.type.includes('mp4') ? 'mp4' : audio.type.includes('ogg') ? 'ogg' : 'webm';
    data.append('file', audio, `answer.${extension}`);
    // Whisper accepts ISO-639-1: Filipino uses the Tagalog code, tl.
    data.append('language', language === 'fil-PH' ? 'tl-PH' : language);
    data.append('purpose', 'web_mock_interview');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 22000);
    try {
        const response = await fetch('/api/transcribe', {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: data, signal: controller.signal
        });
        const result = await response.json();
        if (!response.ok || typeof result.text !== 'string' || !result.text.trim()) throw new Error('Answer transcription unavailable');
        return result.text.trim();
    } finally { clearTimeout(timeout); }
}
