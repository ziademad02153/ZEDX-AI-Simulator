import { TtsSession } from '@mintplex-labs/piper-tts-web';

const scope = self as unknown as {
    onmessage: ((event: MessageEvent<{ id: number; text?: string }>) => void) | null;
    postMessage: (message: unknown) => void;
};
let session: Promise<TtsSession> | undefined;
let warmed = false;
let queue = Promise.resolve();
scope.onmessage = ({ data }) => {
    queue = queue.then(async () => {
        try {
            session ||= TtsSession.create({ voiceId: 'en_US-amy-medium', progress: ({ loaded, total }) => scope.postMessage({ id: data.id, progress: { loaded, total } }) });
            const engine = await session;
            // Initialize the phonemizer and inference path before declaring the voice ready.
            // This audio stays inside the worker and is never played or saved in an interview.
            if (!warmed) { await engine.predict('Ready.'); warmed = true; }
            const audio = data.text ? await engine.predict(data.text) : undefined;
            scope.postMessage({ id: data.id, audio });
        } catch (error) {
            console.warn('Amy engine failed:', error instanceof Error ? error.message : 'Unknown runtime error');
            session = undefined;
            warmed = false;
            TtsSession._instance = null;
            scope.postMessage({ id: data.id, error: error instanceof Error ? error.message : 'Amy speech generation is unavailable' });
        }
    });
};
