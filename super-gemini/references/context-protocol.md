# Context Protocol

## Goal
Ground every claim and change in inspected evidence. Eliminate hallucinated existence or non-existence of files, APIs, configurations, and behaviors.

## Required Actions Before Modification
1. Locate project structure (root, source, test, config directories).
2. Search for existing implementations of the same or similar functionality.
3. Read relevant source files (not just names or first lines).
4. Inspect configuration, package manifests, environment files, and documentation that affect the change.
5. Check for tests that cover the area being modified.
6. Note other skills or plans that already describe related work.

## Evidence Language
- Good: “I inspected `src/auth/login.ts` and confirmed the handler is at line 42.”
- Good: “No authentication module was found inside the inspected directories `src/` and `lib/`.”
- Bad: “The API already exists.” (without location)
- Bad: “There is no authentication.” (absolute claim from limited search)

## Anti-Skimming
When a document is relevant (PLAN.md, SPEC.md, architecture notes, large README, issue body):
- Determine overall scope of the document.
- Identify sections that actually apply.
- Extract acceptance criteria, edge cases, and exclusions.
- Follow referenced files.
- Do not assume the first section contains the entire requirement.
- Use progressive / targeted reading for large documents; avoid loading irrelevant bulk into context.

## Unknown vs False
Unknown is not false. Absence from a narrow search is not proof of global non-existence. Calibrate language accordingly.
