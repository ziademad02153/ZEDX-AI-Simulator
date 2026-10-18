# CV tools release verification

The public /cv-checker and /cv-builder routes are independent of interviews and require no interview session. Processing and spelling checks run locally; no provider API credits are used. CV content is held in component memory. The editable-copy block and appearance toggle have been removed.

## Checks performed

- TypeScript validation passed.
- Full CI: 281 passing tests, zero failures (payments 18, security 10, reports 62, languages 138, regressions 33, CV 20).
- CV tests exercise real text PDF generation/extraction, multipage and Arabic export, original PDF page rendering through the production reader, image-only files, column heuristics, hidden direction glyphs, spelling, scoring and severity ordering.
- Actual user-supplied PDF audit identified a reserved example portfolio URL and three hidden direction glyphs. Result: 85 on assessed rules, with high and medium findings. Source files were not modified or committed.
- Generated English PDF name and section spacing were rendered and inspected offline.
- The final appearance-toggle removal passed TypeScript and all 20 CV tests again.

## Behavior and limits

Upload PDF/TXT only, up to 5 MB, 15 PDF pages and 40,000 extracted characters. Original PDF preview and extracted text are available. Image-only/unreadable text gets no invented score. DOCX and OCR are not implemented.

Fourteen weighted rules produce a score out of 100 over assessed rules, with evidence and practical fixes. Categories disclose coverage. Full grammar, factual accuracy, semantic suitability and employer-specific ATS selection are not assessed. No universal ATS parse percentage or hiring guarantee is claimed.

PDF export writes selectable text. English uses standard Helvetica; Arabic uses the locally licensed Amiri font. PDF.js main/worker, standard fonts and English dictionary are served from local assets copied during predev/prebuild.

Theme styles inherit website tokens and saved light/dark/system preferences. The PDF preview deliberately stays white. Theme preference regression tests passed. Final browser testing on desktop/mobile remains unverified because the saved browser origin permission denies access. Automated checks do not establish a live browser journey.

No changes to Electron or database schema are part of this release.
