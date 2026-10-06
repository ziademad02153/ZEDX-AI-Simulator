# PROJECT ARCHITECTURE & DEVELOPMENT RULES

## Critical Separation of Products

This repository contains two distinct products that share the same backend, but MUST remain physically and logically separated in the frontend.

### 1. Web Platform (Mock Interview & Candidate Practice)
- **Primary Routes**:
  - `/mock-interview` (`src/app/mock-interview/page.tsx`): Main web interview simulator with video, camera, AI speech questions, and evaluation.
  - `/dashboard/new/how-to-use` (`src/app/dashboard/new/how-to-use/page.tsx`): Camera/Mic calibration and onboarding.
  - `/dashboard/*`: User dashboards, session history, reports, and payments.
- **Purpose**: A self-contained web training platform where the AI acts as an interviewer and the candidate answers questions on camera.
- **Permitted Features**: Camera feeds, audio synthesis, interview scorecards, practice tests, independent answer evaluation.

### 2. Desktop Application (Real-Time Stealth Cheating Copilot)
- **Primary Route**:
  - `/desktop-assistant` (`src/app/desktop-assistant/page.tsx`): Real-time HUD overlay.
- **Electron Container**:
  - `electron/main.js`, `electron/preload.js`, `electron/app-wrapper.html`.
- **Purpose**: A real-time, stealth, screen-share-proof cheating assistant running on the candidate's machine during live interviews (Zoom, Teams, Google Meet).
- **Core Requirements**:
  - Completely transparent, frameless, draggable window with Ghost Mode (hidden from screen capture via Electron setContentProtection).
  - Voice Activity Detection (VAD) listening to the interviewer's voice and feeding it to Groq Whisper STT.
  - Fast AI generation of first-person interview answers (structured, concise, spoken tone).
  - Screen capture OCR via Tesseract worker.
  - Manual mic/listening toggle button.
  - NO camera feeds, NO AI interviewer speaking to the candidate, NO practice cards.

---

## Strict Development Rules for Human Developers and AI Agents

1. **NEVER modify Desktop code when working on Web features**:
   - If a request is for "web", "mock interview", "training", "simulator", or "practice":
     Only edit files in `src/app/mock-interview/`, `src/app/dashboard/`, or web components.
   - DO NOT edit `src/app/desktop-assistant/page.tsx` or `electron/`.

2. **NEVER modify Web code when working on Desktop features**:
   - If a request is for "desktop", "assistant", "HUD", "stealth app", "cheating copilot", or "hotkeys":
     Only edit `src/app/desktop-assistant/page.tsx` or `electron/`.
   - DO NOT edit `src/app/mock-interview/page.tsx`.

3. **Routing Separation**:
   - `src/app/dashboard/new/page.tsx` directs desktop users to `/desktop-assistant` and web users to `/dashboard/new/how-to-use` -> `/mock-interview`.
   - Any access to `/interview` redirects desktop sessions to `/desktop-assistant`.
