# ARCHITECTURE DOCUMENTATION

## Overview

ZEDX consists of two distinct frontend clients sharing a unified Next.js API and Supabase backend:

1. **Web Mock Interview Platform**
   - File: `src/app/mock-interview/page.tsx`
   - Route: `/mock-interview`
   - Flow: `/dashboard/new` -> `/dashboard/new/how-to-use` -> `/mock-interview`
   - Responsibility: Practice interview sessions with video recording, camera analysis, and AI questions.

2. **Electron Desktop Stealth Copilot**
   - File: `src/app/desktop-assistant/page.tsx`
   - Route: `/desktop-assistant`
   - Flow: `/login?desktop=true` -> `/dashboard/new` -> `/desktop-assistant`
   - Responsibility: Real-time, transparent HUD overlay for live interview assistance. Hidden from screen sharing.

---

## Directory & Route Map

| Feature / Client | Route | File Path |
| :--- | :--- | :--- |
| Desktop Stealth HUD | `/desktop-assistant` | `src/app/desktop-assistant/page.tsx` |
| Web Mock Interview | `/mock-interview` | `src/app/mock-interview/page.tsx` |
| Web Hardware Test | `/dashboard/new/how-to-use` | `src/app/dashboard/new/how-to-use/page.tsx` |
| Interview Setup | `/dashboard/new` | `src/app/dashboard/new/page.tsx` |
| Electron Main Process | Desktop Native | `electron/main.js` |
| Electron Preload Bridge | Desktop Native | `electron/preload.js` |

---

## Modification Protocol

- Any work related to the website training, video preview, or mock interview must strictly be applied to `src/app/mock-interview/page.tsx`.
- Any work related to the desktop HUD, transparent overlay, hotkeys, screen OCR, or real-time interview cheating must strictly be applied to `src/app/desktop-assistant/page.tsx` and `electron/`.
- Under no circumstances should code from one domain be copied into the other without review.
