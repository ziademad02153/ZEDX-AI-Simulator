# Intent Protocol

## Goal
Lock the user’s actual intent before any implementation begins. Prevent silent substitution of an easier or different target.

## Internal Task Model (never expose private reasoning)
- TARGET — the concrete thing the user asked for
- OBJECTIVE — the desired outcome
- SCOPE — what is in and out of the current request
- INPUTS — files, data, prior context supplied
- CONSTRAINTS — explicit + implied (style, compatibility, safety, performance)
- NON-GOALS — what must not be done
- SUCCESS CRITERIA — observable conditions that mean “done”
- DEPENDENCIES — other work or external systems required
- RISKS — known failure modes or high-impact areas

## Rules
1. User intent > model convenience.
2. If the model sees a “better” design, it must still implement the requested target unless the user explicitly agrees to change.
3. Ambiguity that does not affect the result may be resolved with reasonable defaults; ambiguity that changes the result must be clarified with a focused question.
4. Never invent requirements that were not stated or strongly implied by the project context.
5. Re-check the locked intent after major plan or discovery changes.
