import { TtsSession } from '@mintplex-labs/piper-tts-web';
import { AMY_OPENING_TEXT } from './piper-amy-opening';

const scope = self as unknown as {
    onmessage: ((event: MessageEvent<{ id: number; text?: string }>) => void) | null;
    postMessage: (message: unknown) => void;
};
let session: Promise<TtsSession> | undefined;
let warmed = false;
let openingAudio: Blob | undefined;
let queue = Promise.resolve();
scope.onmessage = ({ data }) => {
    queue = queue.then(async () => {
        try {
            if (!session) {
                let cached = false;
                try {
                    const root = await navigator.storage.getDirectory();
                    const dir = await root.getDirectoryHandle('piper');
                    const model = await dir.getFileHandle('en_US-amy-medium.onnx');
                    cached = (await model.getFile()).size > 0;
                } catch { /* The engine downloads the model when no saved copy is available. */ }
                scope.postMessage({ id: data.id, cached });
            }
            session ||= TtsSession.create({ voiceId: 'en_US-amy-medium', progress: ({ loaded, total }) => scope.postMessage({ id: data.id, progress: { loaded, total } }) });
            const engine = await session;
            // Prepare the actual opening in setup, before declaring the voice ready.
            // Keep its audio in the worker for immediate playback when the interview begins.
            if (!warmed) { openingAudio = await engine.predict(AMY_OPENING_TEXT); warmed = true; }
            const audio = data.text ? (data.text === AMY_OPENING_TEXT ? openingAudio : await engine.predict(data.text)) : undefined;
            scope.postMessage({ id: data.id, audio });
        } catch (error) {
            console.warn('Amy engine failed:', error instanceof Error ? error.message : 'Unknown runtime error');
            session = undefined;
            warmed = false;
            openingAudio = undefined;
            TtsSession._instance = null;
            scope.postMessage({ id: data.id, error: error instanceof Error ? error.message : 'Amy speech generation is unavailable' });
        }
    });
};
