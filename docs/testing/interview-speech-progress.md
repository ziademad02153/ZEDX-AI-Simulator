# Interview speech progress verification

Date: 2026-10-11. Scope: website mock interviews.

## Behavior

Questions start hidden. Words appear during playback, and the complete original
question remains after playback finishes. The existing question/history/report
text is not replaced by the partial display text.

- Egyptian and formal Arabic request ElevenLabs character alignment in the same
  synthesis request. Valid alignment controls word start times using the media
  playback clock. Missing or incompatible alignment uses the duration estimate.
- Amy uses an estimated word timeline derived from each existing audio chunk's
  duration. It does **not** provide exact word alignment. Chunk boundaries retain
  the original question's offsets, including whitespace and punctuation.
- Browser speech uses actual word boundary events when supplied by the selected
  voice. Otherwise it estimates progress after playback starts. Estimated native
  progress freezes on pause and the end event reveals the full question.
- Superseded playback, page unmount, and early completion stop progress callbacks.
- Text uses the session language, automatic writing direction, and Unicode word
  segmentation; a fallback supports browsers without Intl.Segmenter.
- The question bubble retains its identity during word updates and does not
  replay its entrance animation for every word.

No additional alignment API request, new model download, or English voice provider
was introduced. Existing TTS authentication, rate limiting and API key failover
remain in place. The legacy audio response is still supported.

## Verification

`npm run test:languages`: **130 passed, 0 failed**.

Coverage includes the 30 language catalog's real question samples, provider
routing for all languages, native start/boundary/end events, phonetic-name offset
mapping, paused/waiting media, completion, stale callbacks, chunk whitespace,
invalid alignment, and Arabic timestamp API authentication/rate limiting/failover.
These automated provider tests use controlled test doubles; they do not prove
that a device has all 30 browser voices installed.

TypeScript (`tsc --noEmit --incremental false`), ESLint for the new progress
module, and `git diff --check` passed.

### Actual browser playback

Chrome executed the actual page's `speakText` handler, the actual progress module,
and the question bubble's React/Framer Motion markup. Assertions checked partial
prefixes, monotonic progression, the complete final text in the rendered DOM,
language/direction attributes, and listening beginning after playback ended.

| Playback case | Result | Display updates including initial/final state |
| --- | --- | --- |
| Amy short English question | Passed | 11 |
| Amy multi-chunk English question | Passed | 42 |
| Egyptian Arabic / ElevenLabs recording | Passed | 8 |
| Formal Arabic / ElevenLabs recording | Passed | 8 |
| Installed English Web Speech voice | Passed | 16 |

A live ElevenLabs synthesis request returned audio and 28 aligned characters,
with the alignment text exactly matching the original Arabic question. That
recording and its real alignment were used for both Arabic browser playback
cases. Browser tests stubbed the application's session/auth response, so this
was not a complete signed-in production interview or a microphone/STT test.

The test machine exposed English and Egyptian Arabic native voices only.
French/Spanish and the remaining native voice implementations were not audibly
tested; their routing/event behavior and text segmentation were covered by the
automated tests. No claim of exact synchronization is made for estimated paths.

Local browser test artifacts are in `.data/speech-progress-browser-result.json`,
`.data/speech-progress-arabic-result.json`, and
`.data/speech-progress-preview.png`. The local runner is
`.data/speech-progress-browser.cjs`, using the existing Piper trial Vite server
on port 43189 and the bundled Playwright runtime. These are test assets, not
application routes or deployed downloads.

## Release state

Implemented and tested locally. No commit, push, or deployment was performed as
part of this task. The pre-existing change to `electron/main.js` was not edited.
