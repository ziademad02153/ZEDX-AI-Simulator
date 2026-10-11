# Automatic answer submission verification

The web interview records after question playback. The actual acoustic detector
submits once after sustained activity followed by 3 seconds of detected silence.
Browser transcription does not control timing; initial silence does not submit.

## Automated checks

`tests/answer-silence.test.mjs` executes the actual detector with controlled PCM.
It covers initial silence, transients, timing boundaries, resumed speech,
interviewer exclusion and 50 sequential turns. These are simulations, not 50
complete signed-in interviews or proof of real-microphone speech detection.
Additional fixtures cover quiet above-threshold speech and low background noise,
and explicitly demonstrate the limits with loud continuous noise and speech
below the threshold. Passing these tests does not remove those limitations.

A Chrome Web Audio/MediaRecorder check using the actual helper and synthetic input
produced a nonempty audio blob and one submission about 3.1 seconds after silence,
without browser recognition. The local runner is
`.data/verify-answer-silence-browser.cjs`; it is not a deployed route.

## Hardware acceptance still required

Test real signed-in interviews with real microphones on weak/typical devices:
quiet and short answers, normal pauses, fan/street noise, speech over noise and
background tabs. Record missed speech, premature submission, submission latency
and transcription errors.

Energy thresholds are not a neural speech classifier. Loud continuous background
sound can keep a turn open; speech below the threshold can be missed. Browser
scheduling also means 3 seconds is a detection interval, not exactly 3.000 seconds
of wall-clock delay. Do not describe noise-related guarantees as verified.

No real-microphone noisy-room or concurrent-user load acceptance run was performed
as part of the documentation/CI update.
