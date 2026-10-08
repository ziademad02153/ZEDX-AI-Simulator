# Piper phonemizer runtime

Source package: `@diffusionstudio/piper-wasm@1.0.0`.
The package metadata declares MIT and names Konstantin Paulus as its author.

Original binary URLs:
- https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm
- https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data

`piper-data-*.bin` reconstruct the unmodified `.data` binary in the order
listed in `data-manifest.json`. Its byte length and SHA-256 are recorded there
and verified by `tests/piper-runtime-assets.test.mjs`.

These are phonemizer runtime assets, not the Amy voice model. They are loaded
before interviews, cached in the browser, and provided to Piper as worker-local
blob URLs. They remove per-utterance requests to the phonemizer CDN.
