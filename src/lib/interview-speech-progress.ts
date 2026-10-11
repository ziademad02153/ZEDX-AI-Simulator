// Real provider boundaries take precedence. Without them, progress is an
// estimate tied to the playback clock, never a second speech/alignment request.
export type SpeechWord = { start: number; end: number; weight: number };
export type CharacterAlignment = {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
};

export function speechWords(text: string, language: string): SpeechWord[] {
    const segments = typeof Intl.Segmenter === 'function'
        ? Array.from(new Intl.Segmenter(language, { granularity: 'word' }).segment(text))
        : Array.from(text.matchAll(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+/gu), match => ({
            index: match.index, segment: match[0], isWordLike: /[\p{L}\p{N}]/u.test(match[0]),
        }));
    const words: SpeechWord[] = [];
    for (const segment of segments) {
        if (segment.isWordLike) {
            words.push({ start: segment.index, end: segment.index + segment.segment.length,
                weight: Math.max(1, Array.from(segment.segment).length) });
        } else if (words.length) {
            words[words.length - 1].end = segment.index + segment.segment.length;
        }
    }
    if (!words.length && text) words.push({ start: 0, end: text.length, weight: 1 });
    return words;
}

export function alignmentWordStarts(text: string, words: SpeechWord[], alignment?: CharacterAlignment): number[] | undefined {
    if (!alignment || !Array.isArray(alignment.characters) || !alignment.characters.every(character => typeof character === 'string') || alignment.characters.join('') !== text ||
        !Array.isArray(alignment.character_start_times_seconds) ||
        alignment.characters.length !== alignment.character_start_times_seconds.length) return;
    let offset = 0;
    const starts = new Map<number, number>();
    let previous = -1;
    for (let i = 0; i < alignment.characters.length; i++) {
        const time = alignment.character_start_times_seconds[i];
        if (!Number.isFinite(time) || time < 0 || time < previous) return;
        starts.set(offset, time);
        previous = time;
        offset += alignment.characters[i].length;
    }
    const result = words.map(word => starts.get(word.start));
    return result.every(time => time !== undefined) ? result as number[] : undefined;
}

export function estimatedWordStarts(words: SpeechWord[], duration: number): number[] {
    const total = words.reduce((sum, word) => sum + word.weight, 0);
    let weight = 0;
    return words.map(word => { const start = total ? duration * weight / total : 0; weight += word.weight; return start; });
}

// Retain offsets in the original question even when chunking normalizes whitespace.
export function locateSpeechChunk(text: string, chunk: string, from: number): { start: number; end: number } {
    const escaped = chunk.trim().split(/\s+/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
    const match = new RegExp(escaped, 'u').exec(text.slice(from));
    if (!match) throw new Error('Speech chunk does not match the question');
    return { start: from + match.index, end: from + match.index + match[0].length };
}

export function spokenTextMap(text: string, transform: (part: string) => string) {
    const spans: { start: number; end: number; originalStart: number }[] = [];
    let spoken = '';
    for (const match of text.matchAll(/\s+|\S+/gu)) {
        const part = transform(match[0]);
        spans.push({ start: spoken.length, end: spoken.length + part.length, originalStart: match.index });
        spoken += part;
    }
    return { text: spoken, originalIndex: (index: number) => {
        const span = spans.find(item => index >= item.start && index < item.end);
        return span?.originalStart ?? text.length;
    } };
}

type ProgressOptions = { text: string; language: string; active: () => boolean; reveal: (text: string) => void };

export function followMediaSpeech(audio: HTMLMediaElement, options: ProgressOptions & { alignment?: CharacterAlignment }) {
    const words = speechWords(options.text, options.language);
    const exact = alignmentWordStarts(options.text, words, options.alignment);
    let stopped = false, frame = 0, visible = -1;
    const update = () => {
        if (stopped || !options.active()) { stop(); return; }
        if (!audio.paused && !audio.ended && audio.readyState >= 2) {
            const starts = exact ?? estimatedWordStarts(words, Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 1e9);
            let index = -1;
            while (index + 1 < starts.length && starts[index + 1] <= audio.currentTime) index++;
            if (index > visible) { visible = index; options.reveal(options.text.slice(0, words[index].end)); }
        }
        frame = requestAnimationFrame(update);
    };
    const finish = () => { if (!stopped && options.active()) options.reveal(options.text); stop(); };
    const stop = () => {
        stopped = true;
        cancelAnimationFrame(frame);
        audio.removeEventListener('ended', finish);
        audio.removeEventListener('error', stop);
    };
    audio.addEventListener('ended', finish);
    audio.addEventListener('error', stop);
    frame = requestAnimationFrame(update);
    return stop;
}

export function followNativeSpeech(utterance: SpeechSynthesisUtterance, options: ProgressOptions & { originalIndex: (index: number) => number }) {
    const words = speechWords(options.text, options.language);
    let stopped = false, started = false, paused = false, exact = false;
    let elapsed = 0, lastTick = 0, visible = -1, frame = 0;
    const revealWord = (index: number) => {
        if (!stopped && options.active() && index > visible && words[index]) {
            visible = index;
            options.reveal(options.text.slice(0, words[index].end));
        }
    };
    const update = (now: number) => {
        if (stopped || !options.active()) { stop(); return; }
        if (started && !paused) {
            elapsed += Math.max(0, now - lastTick) / 1000;
            // Boundary-capable voices usually emit their first event immediately.
            // Allow a grace period before estimating for voices without boundaries.
            if (!exact && elapsed > 0.35) {
                const duration = Math.max(0.3, words.reduce((sum, word) => sum + Math.max(0.16, word.weight * 0.055), 0) / (utterance.rate || 1));
                const starts = estimatedWordStarts(words, duration);
                let index = 0;
                while (index + 1 < starts.length && starts[index + 1] <= elapsed) index++;
                // Only the end event reveals the entire question on estimated voices.
                revealWord(Math.min(index, Math.max(0, words.length - 2)));
            }
        }
        lastTick = now;
        frame = requestAnimationFrame(update);
    };
    const start = () => { started = true; lastTick = performance.now(); revealWord(0); };
    const pause = () => { paused = true; };
    const resume = () => { paused = false; lastTick = performance.now(); };
    const boundary = (event: SpeechSynthesisEvent) => {
        if (event.name !== 'word' || !Number.isFinite(event.charIndex)) return;
        exact = true;
        const original = options.originalIndex(event.charIndex);
        const index = words.findIndex(word => original >= word.start && original < word.end);
        if (index >= 0) revealWord(index);
    };
    const finish = () => { if (!stopped && options.active()) options.reveal(options.text); stop(); };
    const stop = () => {
        stopped = true; cancelAnimationFrame(frame);
        utterance.removeEventListener('start', start);
        utterance.removeEventListener('pause', pause);
        utterance.removeEventListener('resume', resume);
        utterance.removeEventListener('boundary', boundary);
        utterance.removeEventListener('end', finish);
        utterance.removeEventListener('error', stop);
    };
    utterance.addEventListener('start', start);
    utterance.addEventListener('pause', pause);
    utterance.addEventListener('resume', resume);
    utterance.addEventListener('boundary', boundary);
    utterance.addEventListener('end', finish);
    utterance.addEventListener('error', stop);
    frame = requestAnimationFrame(update);
    return stop;
}
