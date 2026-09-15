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

## Executive Summary

**ZEDX AI Interview Simulator** is the world's most advanced **Voice-to-Voice AI Interviewer** and professional training platform engineered for rigorous candidate evaluation. Designed to help job seekers master their next interview, it provides a comprehensive **Dual-Mode** system (Web & Desktop) integrating real-time Speech-to-Text (STT), Large Language Model (LLM) inference, and a hybrid Text-to-Speech (TTS) engine.

- **The Web Simulator (Rigorous Evaluation Mode):** A strict, autonomous AI Mock Interview Simulator that conducts structured, context-aware interviews in **29+ supported languages**. 
- **The Desktop Sandbox (Assisted Learning Mode):** A Windows-native environment where the AI acts as a real-time copilot to accelerate skill acquisition and provide instant performance analytics.

---

## 1. Global Infrastructure Topology

```mermaid
graph TD
    subgraph CloudLayer ["Cloud Layer (Next.js Edge & Supabase)"]
        AUTH["Opaque Auth Gateway"] --> DB[("Protected Storage with RLS")]
        API["Edge API Serverless Routes"] --> CONTEXT_SERVER["Context Aggregation Node"]
        CONTEXT_SERVER --> DB
    end

    subgraph LocalExecutionLayer ["Local Execution Layer (Electron OS Engine)"]
        SYS["Local Microphone Audio Capture"] --> VAD["Voice Activity Detection Layer"]
        MIC["Hardware Microphone Allocation"] --> VAD
        IPC["IPC Secure Bridge"] --> API
    end

    subgraph NeuralInferenceLayer ["Neural Inference Layer (Groq LPU Cluster)"]
        VAD -- "WebM Chunk Streaming" --> WHISPER["Whisper V3 Engine (Load Balanced x14)"]
        WHISPER -- "Raw Parsed Transcripts" --> LLM["Qwen Engine (Load Balanced x14)"]
        CONTEXT_SERVER -- "Full CV + JD Context" --> LLM
        LLM -- "Actionable SSE Stream" --> IPC
    end

    subgraph TTSHybridLayer ["TTS Hybrid Router"]
        LLM -- "AI Response Text" --> LANG_DETECT{"Language Tag Inspector"}
        LANG_DETECT -- "ar-* prefix" --> ELEVEN["ElevenLabs Multilingual V2 (Load Balanced x10)"]
        LANG_DETECT -- "All other languages" --> EDGE["Microsoft Edge TTS (Serverless Native, Free)"]
        ELEVEN --> AUDIO_OUT["Browser Audio Context"]
        EDGE --> AUDIO_OUT
    end

    classDef cloud fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef local fill:#1e293b,stroke:#10b981,stroke-width:2px,color:#fff;
    classDef neural fill:#312e81,stroke:#6366f1,stroke-width:2px,color:#fff;
    classDef tts fill:#3b0764,stroke:#a855f7,stroke-width:2px,color:#fff;

    class AUTH,DB,API,CONTEXT_SERVER cloud;
    class SYS,MIC,VAD,IPC local;
    class WHISPER,LLM neural;
    class LANG_DETECT,ELEVEN,EDGE,AUDIO_OUT tts;
```

---

## 2. TTS Hybrid Routing & Load Balancing Architecture

```mermaid
flowchart TD
    INPUT["AI Response Text + Language Tag"] --> ROUTER{"Language Router\n lang.startsWith('ar')"}

    ROUTER -- "TRUE: Arabic Dialect" --> ELEVEN_POOL["ElevenLabs Key Pool\n[10 independent accounts]"]
    ROUTER -- "FALSE: All Other Languages" --> EDGE_PROC["Edge TTS Engine\nMicrosoft Neural Voices\nZero quota cost"]

    ELEVEN_POOL --> SHUFFLE["Fisher-Yates Shuffle\nPer-Request Randomization"]
    SHUFFLE --> TRY_KEY["Attempt Request\nwith Key[i]"]
    TRY_KEY -- "HTTP 200 OK" --> STREAM["Stream audio/mpeg\nto Browser AudioContext"]
    TRY_KEY -- "HTTP 4xx/5xx" --> LOG["Log Key Failure\nAdvance to Key[i+1]"]
    LOG --> TRY_KEY
    TRY_KEY -- "All Keys Exhausted" --> ERROR["Return 500\nAll quota pools exhausted"]

    EDGE_PROC --> TEMP_FILE["Write audio to\ntemp file (fs)"]
    TEMP_FILE --> READ_BUFFER["Read Buffer\ninto Response"]
    READ_BUFFER --> CLEANUP["Unlink temp files\n(finally block)"]
    CLEANUP --> STREAM

    classDef router fill:#1e3a5f,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef eleven fill:#3b0764,stroke:#a855f7,stroke-width:2px,color:#fff;
    classDef edge fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff;

    class ROUTER router;
    class ELEVEN_POOL,SHUFFLE,TRY_KEY,LOG,ERROR eleven;
    class EDGE_PROC,TEMP_FILE,READ_BUFFER,CLEANUP edge;
```

---

## 3. Audio Concurrency Control & Race Condition Elimination

```mermaid
sequenceDiagram
    participant REACT as React useEffect
    participant REF as hasStartedRef
    participant AUDIO as Global Audio Registry
    participant TTS as TTS API Route
    participant CTX as Browser AudioContext

    REACT->>REF: Check hasStartedRef.current
    alt Already initialized
        REF-->>REACT: Return (suppress duplicate invocation)
    else First invocation
        REF->>REF: Set hasStartedRef.current = true
        REACT->>AUDIO: Kill all active HTMLAudioElement instances
        Note over AUDIO: Pause + src='' + remove from registry
        REACT->>TTS: POST /api/tts {text, language, voice}
        TTS-->>CTX: Stream audio/mpeg chunks
        CTX->>CTX: Playback via HTMLAudioElement
        CTX->>AUDIO: Register instance in global registry
    end

    Note over REACT,CTX: Any new speakText() call first\nexecutes global kill before streaming
```

---

## 4. Audio Telemetry & Sub-Second STT Engine

```mermaid
sequenceDiagram
    participant UI as React UI (Renderer)
    participant OSE as Electron OS Capturer
    participant VAD as VAD Middleware (Web Worker)
    participant STT as Groq Whisper V3 (Rotated Key Pool)
    
    UI->>OSE: Request Internal Audio Capture
    OSE-->>UI: Grant MediaStream Track constraints
    loop Continuous Buffering Loop
        UI->>VAD: Stream compressed WebM chunks
        alt Audio Intensity > Threshold Limit
            VAD->>STT: Dispatch Blob Transduction Buffer
            Note over STT: Key pool shuffle on every request
            STT-->>UI: Return Parsed JSON Transcript Payload
        else Absolute Silence Delta Reached
            VAD-->>VAD: Purge internal buffer (Zero API Bloat)
        end
    end
```

---

## 5. Cognitive Context Injection (Full-Document AI Interviewer)

```mermaid
graph LR
    subgraph ContextAssemblyLine ["Context Assembly Line"]
        HISTORY["Interview History & Memory\n(All prior Q&A)"]
        JD["Job Description\n(Complete, untruncated)"]
        RESUME["Candidate CV\n(Full document content)"]
        ANGLE["Randomized Interview Angle\n(Behavioral/Technical/Situational)"]
        NAME["Candidate Name\n(Extracted from CV)"]
    end

    subgraph PromptSynthesisEngine ["Prompt Synthesis Engine"]
        COMPILER["Dynamic System Prompt Compiler\n+ Pronunciation Normalization"]
        HISTORY --> COMPILER
        JD --> COMPILER
        RESUME --> COMPILER
        ANGLE --> COMPILER
        NAME --> COMPILER
    end

    subgraph ExecutionResolution ["Execution & Resolution"]
        LLM["Qwen Engine\n(14-key Load Balanced Pool)"]
        UI["Secure React Practice Interface"]
        COMPILER -- "Full Contextual Semantic Prompt" --> LLM
        LLM -- "Server-Sent Events (SSE)" --> UI
    end
    
    classDef data fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#fff;
    classDef engine fill:#701a75,stroke:#e879f9,stroke-width:2px,color:#fff;
    
    class HISTORY,JD,RESUME,ANGLE,NAME data;
    class COMPILER,LLM,UI engine;
```

### Architectural Value:
- **Zero Truncation Policy:** The LLM operates on the complete, untruncated candidate data (CV + JD) to ensure maximum personalization.
- **Pronunciation Normalization:** System prompts dynamically adjust for Arabic vs Latin scripts to prevent TTS mispronunciations.

---

## 6. Security Subsystem & State Persistence

```mermaid
flowchart TD
    US["User Boot Sequence"] -->|Opaque Publishable Key| NEXT["Next.js Hydration Context"]
    NEXT -->|JWT Verification Cycle| SUPA["Supabase Engine"]
    SUPA --> RLS{"Row-Level Security Evaluator"}
    
    RLS -- Valid UUID ownership bounds --> ALLOW("Permit Access to User-Owned Records")
    RLS -- Cryptographic Identity Mismatch --> DENY("Reject Unauthorized Access")

    ALLOW --> DB[("Secure Transaction Logs & Transcripts")]
```

### Security Enforcement
- **AI Prompt Injection Guard:** Encapsulation blocks malicious PDF resume instructions.
- **Row-Level Security Vaulting:** PostgreSQL policies mathematically bind data to verified users.
- **API Key Isolation:** All keys reside exclusively in server-side environments, using dynamic arrays for load balancing.

---

## 7. Advanced Performance Scorecard & PDF Pipeline

```mermaid
graph TD
    subgraph PostInterviewAggregation ["Post-Interview Aggregation"]
        STATE["Session State"] -->|Extract| TRANSCRIPT["Complete Spoken Transcript"]
        STATE -->|Extract| METADATA["JD, CV, Duration, Language"]
        TRANSCRIPT --> PAYLOAD["JSON Context Payload"]
        METADATA --> PAYLOAD
    end

    subgraph EvaluationEngine ["Evaluation Engine (Groq LPU)"]
        PAYLOAD -->|Next.js API Edge Route| GROQ["Groq Evaluator (Qwen)\n(Load Balanced Key Pool)"]
        GROQ -->|Strict JSON Schema| ANALYSIS{"JSON Evaluator"}
        ANALYSIS -- "Technical Score (0-10)" --> METRICS["Output State"]
        ANALYSIS -- "Communication Score" --> METRICS
        ANALYSIS -- "Ideal Benchmarks" --> METRICS
    end

    subgraph ClientRenderingExport ["Client Rendering & Export"]
        METRICS -->|Hydrate| SCORECARD["React Scorecard UI"]
        SCORECARD -->|Apply @media print styles| PRINT["Browser Print Spooler"]
        PRINT -->|Strip UI & backgrounds| PDF["Organized PDF Report"]
    end

    classDef state fill:#451a03,stroke:#b45309,stroke-width:2px,color:#fff;
    classDef ai fill:#312e81,stroke:#6366f1,stroke-width:2px,color:#fff;
    classDef render fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff;

    class STATE,TRANSCRIPT,METADATA,PAYLOAD state;
    class GROQ,ANALYSIS,METRICS ai;
    class SCORECARD,PRINT,PDF render;
```

### Architectural Value:
- **Strict JSON Enforcement:** Forces the evaluation LLM to output predictable schema-validated JSON, preventing parsing crashes in the UI.
- **Client-Side Hydration & Export:** Heavy lifting (rendering and PDF compilation) is offloaded entirely to the client's browser, saving server-side compute.

---

## 8. Autonomous Voice-to-Voice Pipeline (Core Execution Loop)

```mermaid
sequenceDiagram
    participant USER as User (Microphone)
    participant STT as Groq Whisper V3 (x14 Key Pool)
    participant LLM as Qwen Engine (x14 Key Pool)
    participant ROUTER as TTS Language Router
    participant ELEVEN as ElevenLabs (x10 Key Pool, Arabic)
    participant EDGE as Edge TTS (Free, All Others)
    participant CTX as Browser AudioContext
    
    USER->>STT: Speaks (VAD Filtered Audio Chunks)
    Note over STT: Sub-second Transcription\nRotated key selected via shuffle
    STT-->>LLM: Forward Transcribed Text

    Note over LLM: Full CV + JD Context Injected\nPronunciation directives applied
    LLM-->>ROUTER: Stream response text with language tag

    ROUTER->>ROUTER: Inspect language tag prefix
    alt Arabic (ar-*)
        ROUTER->>ELEVEN: POST with shuffled key from pool
        ELEVEN-->>CTX: Stream audio/mpeg
    else All other languages
        ROUTER->>EDGE: Execute Native Edge TTS
        EDGE-->>CTX: Buffer audio response
    end

    CTX->>USER: Real-time Audio Playback\n(Global mute gate applied)
```

---

### Engineered & Developed by Ziad Emad
*Committed to engineering strict software architectures that bridge the gap between autonomous ML deployments and instantaneous human accessibility.*
