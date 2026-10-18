# Website CV Checker and Builder implementation plan

Status: proposed design based on repository review on 2026-10-18. No feature implementation or database deployment performed. Scope: website only; preserve Electron and current interview behavior.

Implementation update and overriding product clarification: the code-only tools are now implemented locally; see `docs/testing/cv-tools.md` for verification and remaining scope. CV Checker must start with file upload only and run automatically, with no CV text, job-title, JD or skill-entry fields. Both tools use English UI/findings/default template headings. Optional job tailoring in the original proposal is not part of this checker screen. The current seven-rule checklist is not the full semantic/layout ATS review envisioned below; do not claim the entire plan is complete.

## Product contract

One shared resume workspace: upload or enter information, inspect findings, edit a structured draft, export a text PDF, then start an interview using the approved text and optional job description. Builder and basic checking work without an AI provider. AI review and rewriting are explicit optional operations.

Do not claim an ATS acceptance probability, universal compatibility, or an employer hiring score. Distinguish observed problems, heuristic warnings, and semantic suggestions. Text pasted by the user cannot establish the original file's layout quality. Missing job keywords are not proof of missing ability; never insert them automatically.

## Repository findings and reuse

| Existing asset | Reuse and required adaptation |
| --- | --- |
| `src/app/dashboard/resumes/page.tsx` | Existing resume list, upload, paste and interview entry point. Extend into workspace rather than duplicate saved-resume management. |
| `src/lib/resume-service.ts` | Authenticated Supabase resume CRUD. Add update/version handling; current maximum-ten check is client-side and needs authoritative enforcement. |
| `src/lib/resume-store.ts` | Separate legacy localStorage representation. Do not introduce another competing source of truth; inspect consumers and isolate legacy use. |
| `src/app/api/parse-resume/route.ts` | Authenticated PDF/TXT extraction with unpdf and 5 MB limit. Current whitespace normalization removes line breaks; provide structured extraction without breaking current interview callers. It does not implement OCR or DOCX. |
| `pdfjs-dist`, `unpdf`, `tesseract.js` in package.json | Existing extraction/OCR dependencies. Dependency presence is not a working browser OCR pipeline; prototype and measure before enabling OCR. |
| `src/lib/download-report-pdf.ts` | Existing jsPDF/blob lifecycle useful as reference. Current html2canvas export embeds images; do not use that renderer for resume PDFs. |
| `src/lib/browser-print-document.ts` | Reference for print fallback and escaping. Print fallback is not a completed automatic PDF download. |
| `src/app/api/generate/route.ts` | Existing server credentials, provider fallback, auth and reservations. Provider logic is nested in the interview route and consumes question quota; extract a shared provider helper with regression tests, not a direct CV call to this route. |
| `supabase_schema.sql`, runtime/payment migrations | Existing ownership policies, entitlements, atomic reservation pattern. Source schema is not evidence of deployed schema. Existing resume policies list SELECT/INSERT/DELETE, not UPDATE. |
| `src/lib/store.ts`, dashboard/new | Existing interview context containing resumeText/jobDescription. Pass an approved draft snapshot through current setup and retain current language/type/level selection. |
| Dashboard layout, navbar, UI components, themes | Reuse navigation, responsive shells, buttons, validation presentation and branding. Resume preview itself stays white/black in both themes. |
| Pricing/privacy pages and CI suites | Extend feature explanations, actual provider data flow and feature limits; keep payment, language, report and interview regressions green. |

## Architecture and proposed modules

- `src/lib/cv/schema.ts`: versioned structured document and validation shared by builder/checker/export. Stable IDs for sections and bullets; optional fields rather than invented content.
- `src/lib/cv/extraction.ts`: raw text, lines, page count, available position metadata, extraction warnings and provenance. Preserve raw input and normalized search representation separately. Text snippets remain traceable to source section/page when available.
- `src/lib/cv/checks.ts`: pure deterministic rules. Each finding carries rule ID, severity, evidence, location, explanation and applicable input type. Return unknown/not assessed when evidence is unavailable.
- `src/lib/cv/job-match.ts`: lexical matching with Unicode-aware normalization, token boundaries, curated aliases and phrase handling (C++, C#, .NET). Label results as explicit mentions; do not infer required/preferred status or semantic equivalence from raw counts.
- `src/lib/cv/pdf.ts`: independent text-based exporter with embedded licensed Unicode fonts, measured wrapping and page breaks. Start with existing jsPDF; test Arabic shaping, bidi, copied text and extraction order. If it cannot meet those gates, select a text-capable alternative after a measured prototype, rather than shipping a raster PDF.
- `src/components/cv/*`: controlled forms, section ordering, preview, source-linked findings and accept/reject suggestions. UI language, CV language and AI review language are separate settings.
- Proposed routes: `/dashboard/resumes/check`, `/dashboard/resumes/build`, and authenticated CV save/review endpoints. Share resume loading and version selection with the existing list.

Structured document: schemaVersion, documentLanguage, contact, summary, experiences, education, projects, skills, certifications, optional sections and sectionOrder. No photo, tables, icons or personal demographic fields in the initial template. Fields and sections are optional depending on career stage. The builder must support students without professional experience.

## Code-only checker

1. Input validation, extraction success, empty/scanned/encrypted file states, file/page/text budgets, character anomalies and suspiciously low text coverage.
2. Contact validation with locale-aware conservative warnings. Do not require a phone, a LinkedIn account, or a fixed address format for everyone.
3. Section recognition, missing information, blank entries, duplicate bullets, date-order inconsistencies and inconsistent date formats. Do not penalize career gaps or lack of numeric achievements by default.
4. Repeated wording, unusually long bullets and missing concrete evidence as suggestions, not proof of poor candidacy. An absence of metrics never authorizes inventing numbers.
5. Job phrase coverage with quoted evidence, optional user confirmation of extracted job requirements and no universal score. Lack of a JD disables job-specific matching, not the general checker.
6. Layout warnings only where PDF metadata provides evidence. Reading-order/column inference is heuristic; extracted text alone cannot prove every ATS will read the source correctly.

Suggested states: critical extraction issue, needs attention, suggestion, passed, not assessed. If any aggregate indicator is later introduced, publish its rule weights and name it a ZEDX checklist result, not ATS pass probability.

## Builder and export

Start with manual entry and existing saved text. Automatic text-to-structured conversion is a separate assisted import: deterministic parsing offers uncertain fields for confirmation; AI parsing is optional. Preserve the source and do not silently fill uncertain dates, employers or names.

One polished single-column A4 template first, black text on white, conventional headings, usable font size, clickable contact links and automatic page flow. Add/remove/reorder sections and bullets, save drafts, undo edits, preview on desktop/mobile and download PDF without AI calls. Never squeeze content into unreadable text to force one page.

Before accepting the exporter, render representative PDFs and extract them again with unpdf: compare important text, reading order, punctuation, names, Arabic and mixed Latin skills; check actual selectable text, long URLs, multipage boundaries and absent clipping. No screenshot-based PDF. Browser Save as PDF remains an explicit fallback.

## Optional AI and cost controls

Use existing configured provider credentials server-side; no separate ATS vendor is required for this design. Reuse provider infrastructure only after extracting the helper safely; do not mix CV review into interview question accounting.

User-triggered semantic review targets one successful response per document/JD/language/prompt version. A successful response may still require bounded retries; do not promise exactly one billed provider request. Rewriting a selected bullet/summary is a distinct bounded action. Typing, preview, saving, downloads and reopening a result never call AI.

Send only necessary text; remove contact data from semantic review where possible. Strict input/output budgets, timeouts and bounded attempts; validate structured responses and quoted evidence. Invalid output must not be presented as fact. Never silently truncate a CV and claim complete analysis. Treat CV/JD as untrusted data, including embedded instructions.

Cache per owner with a hash of normalized relevant input, language, provider/model policy and checker/prompt version. Deduplicate concurrent identical requests with an idempotency key and atomic pending/succeeded/failed state. Check cache before reserving quota. Expire abandoned reservations; reserve/commit/release per operation. User quota release on failure does not undo provider charges.

Log operation, latency, token usage when returned, retries and cache hits, without CV text/contact details. Measure real consumption across short/long Arabic/English inputs before setting prices or feature quotas. Do not infer cost from key count or assume the cheapest model is adequate.

## Persistence and access

Proposed additive changes: structured draft and revision on resumes (or a dedicated versioned document table after assessing deployed schema); separate review result table and generic feature-usage ledger. Reviews reference immutable input versions so edits cannot apply stale suggestions to changed bullets. Define retention and delete linked reviews/cache when a resume/account is deleted.

Keep current text content populated from the approved structured draft for existing interview compatibility. Enforce size/count/ownership and optimistic revision checks on the server/database; add appropriate UPDATE permission and ownership checks. Never trust user-supplied owner IDs, tier or client counters. Cache is private per user. No public resume storage is needed for the initial version; avoid persisting original binary uploads unless the product explicitly requires it.

Database grants and row policies must both match each operation; test user A/user B/unauthenticated access. Provider and service-role secrets stay server-only. Review actual deployed schema, migrations and rollback before deployment. Reference: https://supabase.com/docs/guides/database/postgres/row-level-security .

## Delivery order and completion gates

1. Foundation: freeze schema and checker result contract; create representative synthetic English/Arabic fixtures; fix extraction preservation through a backwards-compatible shared helper. Confirm no interview upload regression.
2. Code-only vertical slice: manual builder, draft persistence, deterministic checker and text PDF. PDF extraction/render gates must pass before calling this an ATS-oriented builder. Preview and export must work with provider networking disabled.
3. Assisted import: existing saved CV/upload to confirmed structured fields; preserve original and handle failed/scanned inputs. Initially offer paste/manual correction. Optional local OCR only after browser download/time/memory/privacy tests; OCR confidence warnings remain visible. DOCX is a later separately scoped dependency, not advertised at launch.
4. Optional semantic review: shared provider helper, separate CV quota/ledger, private caching, evidence-linked validated suggestions, explicit apply/reject/undo. Provider failure leaves builder/basic checker usable.
5. Integration: save approved version, start interview using that version and JD, update navigation/pricing/privacy, delete/export controls and responsive/RTL behavior.
6. Staging then controlled release: verify schema and real provider behavior, measure usage, test two-user isolation and duplicate clicks, run typecheck + full CI, then a real browser journey from upload through PDF and interview setup. Roll out behind separate builder/checker/AI flags; rollback flags and preserve user drafts rather than destructive schema reversal.

## Acceptance matrix

- Fresh graduate, experienced professional, nontechnical role, incomplete CV, Arabic, English and mixed scripts.
- Text PDF, TXT/paste, two-column source, image-only/encrypted/malformed/oversized PDF, long and empty JD, prompt injection, HTML/script-like text.
- Literal skill collisions (Java/JavaScript), aliases, required/preferred uncertainty, no job description, no numeric achievements and honest missing experience.
- PDF copied text and extraction round trip, actual RTL reading order, long bullets/links, multiple pages, mobile preview, no clipping or raster pages.
- Save/reload/update conflicts, outdated suggestions, cross-user access, deleted document/cache, expired plan, duplicate review requests, cache-key invalidation and provider timeout/invalid JSON.
- Assert zero provider calls for basic checks/manual builder/save/PDF/cache hit; count and cap provider attempts for review/rewrite and verify feature quota independently from interview quota.

## Scope boundaries and open decisions

No universal ATS guarantee, hiring prediction, keyword stuffing, invented experiences, external ATS API, mandatory paid OCR, new model marketing names, or Electron changes. Initial AI feature quota and pricing remain a measured product decision. English and Arabic export are intended, but neither is declared ready before extraction/layout tests pass. Existing repository review is not a live production database audit or complete line-by-line audit of every website file.
