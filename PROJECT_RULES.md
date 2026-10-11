# ZEDX-AI implementation rules

## Scope and truth

Website interview and Electron have separate entry points. Do not apply a desktop
assistant persona or capture rule to the web interviewer. Preserve desktop behavior
unless explicitly requested. Code, tests and diagrams must agree.

## Website interview contract

- Use the 30-language catalog for session questions, speech, transcription and reports.
- Record the candidate only after question playback completes.
- Automatically submit once after candidate activity followed by **3 seconds of
  acoustic silence**. No manual Send Answer requirement. Initial silence does not
  submit an empty answer; resumed speech postpones submission.
- Browser recognition is provisional captioning; recorded-audio transcription is
  the saved answer. Retain failed audio for retry instead of scoring provisional text.
- At most one targeted follow-up per main question; reject repeated/paraphrased
  questions and requests for details already supplied.
- Generation, playback or transcription failure must not advance the interview.

## Speech and timing

Arabic uses the authenticated ElevenLabs route. English Amy executes locally when
selected; other/browser-selected speech uses installed voices. Cached bytes do not
prove readiness, fast inference or successful playback. Reveal text during speech
and preserve the original question for reports. Document actual alignment versus
estimated word timing. Cancel obsolete recording/playback/progress callbacks.

The acoustic endpoint is an energy detector, not semantic speech recognition.
Test quiet speech, interruptions and background noise. Keep the 3-second contract
if the detector is replaced. Hardware cleanup must not stop current question audio.

## Models and capacity

Preserve the existing three marketing/UI model names: GPT-6 Astra / Claude 5.1 / Qwen.
Actual provider IDs/fallbacks are independent configuration. Key pool size follows
configured credentials, not a fixed 5/10/14-account capacity. Keep bounded attempts
and deadlines; respect provider limits and context budgets. Do not promise universal
sub-second latency, zero truncation or unlimited concurrency.

## Evaluation and export

Use BARS 0–5; insufficient evidence is null, not an invented zero or answer.
Preserve traceable evidence, coverage and session language. Validate evaluator JSON;
a valid schema does not guarantee judgment quality. Save as PDF downloads a PDF blob;
the print page is separate. Escape untrusted report HTML and test long text, RTL,
zero/unrated scores and download cleanup.

## Security and verification

Keep service-role/provider credentials server-only. Browser publishable credentials
do not replace authorization/RLS. Verify session, ownership, entitlement and usage
on server/database paths. Review migrations and verify database changes in the target
environment. Treat CV/JD as untrusted; guards reduce prompt-injection risk, not eliminate it.

Run `npm run typecheck` and `npm run test:ci` before merging. Update linked diagrams
and verification notes. Test doubles are not a live-system audit. Distinguish local,
committed and deployed changes. Obtain real microphone and staging load measurements
before claiming hardware compatibility or concurrent capacity.
