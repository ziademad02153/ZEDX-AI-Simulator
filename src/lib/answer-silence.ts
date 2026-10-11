/** Acoustic turn endpointing, independent of language and browser transcription. */
export function createAnswerSilenceDetector(onFinished: () => void, onStarted: () => void) {
    let started = false;
    let finished = false;
    let onset: number | null = null;
    let lastVoice: number | null = null;
    let noiseFloor = 0.002;
    return {
        reset() { started = false; finished = false; onset = null; lastVoice = null; },
        sample(samples: Float32Array, now: number, listening: boolean) {
            let energy = 0;
            for (const value of samples) energy += value * value;
            const rms = Math.sqrt(energy / Math.max(1, samples.length));
            const voiced = rms > Math.max(0.008, noiseFloor * 3);
            if (!listening) {
                // Calibrate only while the candidate is not answering; exclude loud playback.
                if (rms < 0.02) noiseFloor = noiseFloor * 0.98 + rms * 0.02;
                this.reset();
                return;
            }
            if (finished) return;
            if (voiced) {
                onset ??= now;
                lastVoice = now;
                if (!started && now - onset >= 150) { started = true; onStarted(); }
            } else {
                onset = null;
                if (started && lastVoice !== null && now - lastVoice >= 3000) {
                    finished = true;
                    onFinished();
                }
            }
        },
    };
}
