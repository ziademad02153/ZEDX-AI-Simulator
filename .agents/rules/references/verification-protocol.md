# Verification Protocol

## Principle
Verification must be objective and proportional to risk. High-impact changes require stronger evidence.

## Allowed Verification Methods (choose relevant subset)
- Type checking / static analysis
- Compilation
- Unit tests
- Integration / end-to-end tests
- Linting and formatting
- Route / API / schema inspection
- Build success
- Runtime smoke or targeted manual checks
- Configuration validation
- Diff review against intent
- Regression checks on related areas
- File existence and content checks after generation

## Rules
1. Tool invocation is not verification. Inspect the actual output.
2. “Tests ran” is not “tests passed.”
3. Generated code is not tested code.
4. Do not run expensive unrelated checks for ceremony.
5. Prefer the cheapest verification that actually reduces risk for the change.
6. After any fix, re-run the verification that previously failed.
7. Record verification results as evidence attached to the requirement or milestone.

## Failure Handling
See failure-recovery.md. Never convert a failed verification into a success claim.
