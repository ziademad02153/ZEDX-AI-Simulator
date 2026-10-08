import { TtsSession } from '@mintplex-labs/piper-tts-web';

const scope = self as unknown as {
    onmessage: ((event: MessageEvent<{ id: number; text?: string; prepare?: boolean }>) => void) | null;
    postMessage: (message: unknown) => void;
};
let session: Promise<TtsSession> | undefined;
let warmed = false;
let preparedText: string | undefined;
let preparedAudio: Blob | undefined;
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
            // Warm the runtime once; hardware setup prepares the whole personalized opening.
            // Avoid generating both a generic and a named full introduction.
            if (!warmed) { await engine.predict('Ready.'); warmed = true; }
            const audio = data.text ? (data.text === preparedText ? preparedAudio : await engine.predict(data.text)) : undefined;
            if (data.prepare && data.text) { preparedText = data.text; preparedAudio = audio; }
            scope.postMessage({ id: data.id, audio });
        } catch (error) {
            console.warn('Amy engine failed:', error instanceof Error ? error.message : 'Unknown runtime error');
            session = undefined;
            warmed = false;
            preparedText = undefined;
            preparedAudio = undefined;
            TtsSession._instance = null;
            scope.postMessage({ id: data.id, error: error instanceof Error ? error.message : 'Amy speech generation is unavailable' });
        }
    });
};
