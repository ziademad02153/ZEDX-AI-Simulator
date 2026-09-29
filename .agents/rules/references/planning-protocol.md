# Planning Protocol

## Requirement Matrix
Every important user or document requirement becomes a row:

| ID | DESCRIPTION | SOURCE | SCOPE | IMPLEMENTATION LOCATION | STATUS | VERIFICATION METHOD |
|----|-------------|--------|-------|--------------------------|--------|---------------------|

Statuses progress strictly:
DISCOVERED → PLANNED → IMPLEMENTED → VERIFIED
(or FAILED / BLOCKED / NOT_APPLICABLE)

Code emission alone never advances a requirement to COMPLETE.

## Long-Horizon Tasks
Break into milestones. Each milestone has:
- Goal
- Requirements (subset of the matrix)
- Dependencies
- Implementation notes
- Verification steps
- Status

Maintain compact progress state. Do not rediscover the same facts repeatedly. Do not mark a milestone complete without its verification.

## Scope Control
Before touching a file ask: “Is this required for the locked intent?”
Forbidden without explicit request:
- Unrelated refactors
- Cosmetic rewrites of untouched areas
- Architecture changes outside the request
- Dependency upgrades
- Renaming unrelated symbols
- Formatting the entire project
- Changing systems outside the requested surface (e.g., backend when only frontend was asked)

## Traceability
Requirement → Implementation location → Verification evidence.
This chain is the primary defense against incomplete delivery.
