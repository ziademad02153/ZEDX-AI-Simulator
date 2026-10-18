# Website interview type and difficulty verification

Scope: website mock-interview question generation only. Desktop candidate-answer
prompts and Electron behavior are not changed. The shared introductory question
remains part of the current question count; it is not a specialized assessment.

## Regression coverage

`npm run typecheck` and `npm run test:ci` cover all twelve type/level prompt
contracts, desktop prompt isolation, rejection/retry of type or depth mismatches,
and safe usage release when the settings reviewer gives an incomplete verdict.

## Bounded live checks

These commands make real, billable provider requests using configured credentials.
Inputs are synthetic; authentication, profile and usage database calls are test
doubles. They do not measure production auth, subscription enforcement or database
availability. Scripts require `--live`, make sequential requests and preserve the
route's request deadlines and bounded retries. They never print credentials.

```
node tests/website-type-level-calibration.mjs --live
node tests/website-type-level-calibration.mjs --live --arabic
node tests/website-type-level-calibration.mjs --live --expert-only --arabic
node tests/website-type-level-followups.mjs --live
```

The follow-up run consumes the English main-question results. Synthetic outputs
are written under ignored `.data/website-type-level-*.json`. Live completion is
not a deterministic quality assertion; inspect the actual questions.

The October 18 checks exposed missing transition markers caused by conflicting
spoken-text instructions, behavioral questions drifting into implementation,
overloaded beginner prompts and rejection of narrow expert follow-ups. Changes
make the marker mandatory, sharpen type/depth instructions and add settings
review to the existing semantic check. Narrow expert probes are explicitly valid.

Observed successful batches: 12 English main questions, 12 Egyptian-Arabic main
questions, and 12 English follow-ups. Following the final Expert clarification,
four Expert main questions were checked again in each language successfully.
Earlier attempts failed protocol/validation; successful batches are a smoke-test
result, not a universal accuracy percentage. Raw results remain local in `.data`.

Remaining limits: the reviewer is another model call, not independent human
validation. Some beginner questions still include related implementation detail;
some intermediate scenarios can be demanding. Perceived difficulty varies by
profession and candidate. The fixture is software development; it does not prove
all roles, all languages, all provider fallbacks or all future sessions behave
correctly. No full microphone/browser session or deployment is certified here.
