<div align="center">
  <img src="public/zedx-logo.png" alt="ZEDX AI Simulator Logo" width="180"/>
  <h1>ZEDX AI Simulator</h1>
  <h3>Professional AI Interview Simulation & Training Infrastructure</h3>

  <!-- Tech Stack Badges -->
  <p>
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Groq-FF6B35?style=for-the-badge&logo=groq&logoColor=white" alt="Groq" />
    <img src="https://img.shields.io/badge/ElevenLabs-000000?style=for-the-badge&logoColor=white" alt="ElevenLabs" />
  </p>
</div>

ZEDX personalizes voice interview practice using a CV, job description, role,
difficulty and selected language. The website supports 30 session languages;
installed browser voices depend on the user's device. Reports use BARS 0–5,
with null for insufficient evidence rather than an invented zero score.

[Watch the demo](https://youtu.be/EFQORaZ4DN4)

## Local setup

Use Node.js 22 LTS and npm. Run `npm ci`, then create an untracked `.env.local`:

| Variable | Purpose |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Development project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Browser publishable/compatible anon credential |
| SUPABASE_SERVICE_ROLE_KEY | Server-only privileged credential |
| GROQ_API_KEY | Server-side LLM/STT credential |
| ELEVENLABS_API_KEY | Server-side Arabic TTS credential |

Numbered provider keys are optional. Pool size follows configured credentials,
not a fixed number of accounts or a guaranteed capacity. Payment/email/analytics
features have separate route configuration. Never commit actual credentials.
For a fresh database, review `supabase_schema.sql` and ordered migrations in
`supabase/migrations/` in a development project; verify permissions, policies
and RPCs before production. The README is not an automatic database bootstrap.

Run `npm run dev`, open http://localhost:3000, sign in and configure an interview.
Allow microphone/camera during setup. Production media capture needs a secure
browser context. Use `npm run build` and `npm start` for a production build.
Electron has a separate entry point and existing `npm run electron:dev` script.

## 1. System boundaries

```mermaid
flowchart TD
    USER[Candidate] --> WEB[Browser interview]
    WEB --> AUTH[Supabase authentication]
    WEB --> API[Next.js server API routes]
    API --> CHECK[Session, entitlement and usage checks]
    CHECK --> GROQ[Generation and transcription]
    CHECK --> AR[Arabic synthesis]
    WEB --> LOCAL[Local Amy or installed browser voice]
    WEB --> DATA[Supabase data access and RLS]
    API --> RPC[Privileged server RPCs and persistence]
```

Code: [interview page](src/app/mock-interview/page.tsx),
[generation](src/app/api/generate/route.ts),
[transcription](src/app/api/transcribe/route.ts), [TTS](src/app/api/tts/route.ts).
These are Next.js server handlers; this diagram does not assert an Edge runtime
or an Electron IPC-to-provider connection.

## 2. Speech routing

```mermaid
flowchart TD
    TEXT[Question and selected language] --> LANG{Language}
    LANG -->|Arabic| API[Authenticated ElevenLabs API]
    API --> KEYS[Shuffle configured keys]
    KEYS --> TRY[Attempt synthesis with timestamps]
    TRY -->|Success| PLAY[Audio playback]
    TRY -->|Failure| NEXT{Another key?}
    NEXT -->|Yes| TRY
    NEXT -->|No| ERROR[Recoverable speech failure]
    LANG -->|English Amy selected| CACHE[Prepare cached model and runtime]
    CACHE --> SYNTH[Local synthesis]
    SYNTH -->|Success| PLAY
    SYNTH -->|Failure| PAUSE[Pause; retry or explicit browser voice choice]
    LANG -->|Other or browser selected| NATIVE[Matching installed browser voice]
    NATIVE -->|Available| PLAY
    NATIVE -->|Unavailable| ERROR
```

Code: [provider selection](src/lib/web-interview-language.ts),
[Amy](src/lib/piper-amy.ts), [TTS API](src/app/api/tts/route.ts).
Valid Arabic alignment controls progress; Amy timing is estimated from chunk
duration. Native voices use boundary events when available, estimates otherwise.
[Verification and limits](docs/testing/interview-speech-progress.md).
Cached bytes do not guarantee synthesis speed or successful playback.

## 3. Playback lifecycle

```mermaid
sequenceDiagram
    participant UI as Interview page
    participant LIFE as Playback lifecycle
    participant VOICE as Speech provider
    participant TEXT as Question progress
    UI->>LIFE: New speech request
    LIFE->>LIFE: Cancel prior playback and progress
    UI->>TEXT: Hide until playback starts
    UI->>VOICE: Prepare or synthesize
    alt Successful playback
        VOICE->>TEXT: Start and timing events
        TEXT->>UI: Reveal question during playback
        VOICE->>UI: Playback ended
        UI->>TEXT: Keep complete original question
        UI->>UI: Start candidate recording
    else Failure
        VOICE->>UI: Error
        UI->>UI: Pause without advancing
    end
```

Code: `speakText` in the [page](src/app/mock-interview/page.tsx) and
[progress module](src/lib/interview-speech-progress.ts). Request IDs and cleanup
prevent obsolete playback from advancing the current turn.

## 4. Candidate recording and automatic submission

```mermaid
sequenceDiagram
    participant MIC as Candidate microphone
    participant DET as Acoustic detector
    participant REC as MediaRecorder
    participant UI as Interview page
    participant API as Transcription API
    UI->>REC: Begin after question playback
    MIC->>DET: PCM energy samples
    MIC->>REC: Answer audio
    DET->>DET: Activity then 3 seconds silence
    DET->>UI: Finish once
    UI->>REC: Stop recording
    REC->>UI: Audio blob
    UI->>API: Authenticated upload and selected language
    alt Valid transcription
        API->>UI: Verified answer text
        UI->>UI: Save answer and generate next step
    else Failure
        API->>UI: Error
        UI->>UI: Retain audio for retry
    end
```

Code: [silence detector](src/lib/answer-silence.ts),
[recording and transcription](src/lib/web-answer-recording.ts).
Browser recognition supplies provisional captions, not the saved answer or
submission timer. No manual Send Answer is required. This is an energy detector,
not a speech classifier: noise can delay submission and quiet speech can be
missed. [Tests and remaining hardware checks](docs/testing/answer-silence.md).

## 5. Question generation

```mermaid
flowchart LR
    CV[Resume] --> PROMPT[Question prompt and server instructions]
    JD[Job description] --> PROMPT
    HISTORY[History] --> PROMPT
    SETTINGS[Role, language, level and track] --> PROMPT
    PROMPT --> GUARD[Usage reservation and bounded attempts]
    GUARD --> ENGINE[GPT-6 Astra / Claude 5.1 / Qwen]
    ENGINE --> JSON[JSON question response]
    JSON --> QUALITY[Question type and repetition checks]
    QUALITY --> UI[Save original question and play speech]
```

The three names are intentional product/UI marketing labels. Actual provider
identifiers and fallback order are separate configuration in
[the generation route](src/app/api/generate/route.ts); labels are not literal
provider model IDs. This route returns JSON, not an SSE question stream.
Context is bounded by API history/text limits and provider context/token budgets;
Website interview generation uses distinct contracts for Role-Specific, Behavioral,
Technical and Project Deep Dive, combined with Beginner, Intermediate or Expert
depth. Follow-up focus angles remain within the chosen type. A fresh setup's
selected difficulty takes precedence over an older browser-saved value. The first
spoken introduction remains a shared warm-up; subsequent assessment questions use
these contracts. The server also reviews generated questions for type/depth fit
alongside repetition, retries up to three proposals within the existing deadline,
and returns a recoverable error with usage release when no proposal is valid.
Focused follow-ups are judged within their parent question, not as a full new
expert scenario. Prompt regression tests cover all 12 combinations, but live-model
adherence and perceived difficulty still require representative session review.
there is no universal zero-truncation guarantee. At most one focused follow-up
per main question is requested. [Question quality logic](src/lib/interview-question-quality.ts).

## 6. Interview state and recovery

```mermaid
stateDiagram-v2
    [*] --> Setup
    Setup --> Generating: Context and permissions ready
    Generating --> Speaking: Question ready
    Generating --> GenerationError: Failure
    GenerationError --> Generating: Retry
    Speaking --> Listening: Playback ends
    Speaking --> SpeechError: Failure
    SpeechError --> Speaking: Retry or explicit voice choice
    Listening --> Transcribing: Activity then 3 seconds silence
    Transcribing --> AnswerError: Failure
    AnswerError --> Transcribing: Retry retained audio
    AnswerError --> Speaking: Record again
    Transcribing --> Generating: Valid answer; questions remain
    Transcribing --> Reporting: Interview complete
    Reporting --> ReportReady: Generated and persisted
    ReportReady --> [*]
```

Code: [interview page](src/app/mock-interview/page.tsx),
[report generation client](src/app/dashboard/report/[id]/page.tsx).
Failure recovery must retain the current question and prevent duplicate answers.
Authentication/paywall errors are not successfully completed questions.
CV/JD are untrusted: prompt guards reduce risk but do not prove injection impossible.

## 7. Evaluation and PDF export

```mermaid
flowchart TD
    SESSION[Verified exchanges and context] --> API[Generate-report API]
    API --> EVAL[Evaluator JSON]
    EVAL --> VALIDATE[Rubric, evidence and language validation]
    VALIDATE --> SCORE[BARS 0 to 5; null if insufficient evidence]
    SCORE --> DB[Persist report]
    DB --> PAGE[React report page]
    PAGE --> HTML[Escaped report HTML]
    HTML --> CANVAS[Browser layout and html2canvas]
    CANVAS --> PDF[jsPDF A4 pages]
    PDF --> DOWNLOAD[Blob URL and download link]
```

Code: [report API](src/app/api/generate-report/route.ts),
[rubric](src/lib/rubric-evaluator.ts), [HTML](src/lib/pdf-report-generator.ts),
[PDF download](src/lib/download-report-pdf.ts).
Save as PDF downloads a real file; the optional print page is separate.
Client export rasterizes pages, so text selection/search and accessibility differ
from a PDF containing embedded text. Schema validity does not prove judgment quality.

## 8. Capacity and failure boundaries

```mermaid
flowchart TD
    REQUEST[Interview request] --> AUTH[Session and entitlement]
    AUTH --> LIMIT[Database-backed usage and rate checks]
    LIMIT --> WORK[Bounded provider attempts]
    WORK -->|Success| RESULT[Validate and persist]
    WORK -->|Timeout or failure| RETRY[Return error and offer recovery]
    RESULT --> METRICS[Measure latency, errors and usage]
    RETRY --> METRICS
    METRICS --> SCALE[Plan scaling from measured capacity]
```

Local Amy consumes user CPU/memory; STT/LLM and Arabic synthesis consume provider
resources. Credentials are not unlimited throughput. See [capacity plan](SCALABILITY.md).

## Verification and release

Run `npm run typecheck` and `npm run test:ci`. The workflow
`.github/workflows/ci.yml` runs both on PRs and main pushes without production
credentials. Controlled tests do not certify every browser voice, real provider,
production RLS deployment or concurrent-user capacity.

Before release, test a signed-in interview, failure/retry, real microphones in
quiet/noisy conditions, English/Arabic playback and PDF download. Run an
authorized staging load test before quoting capacity. Update diagrams alongside
code changes and distinguish local, committed and deployed behavior.

[Project rules](PROJECT_RULES.md). Engineered and developed by Ziad Emad.
