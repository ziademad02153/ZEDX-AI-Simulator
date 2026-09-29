# Super Gemini — Research Notes

Generated during skill construction (2026-09-18). Sources are official documentation and public repositories only. Community reports are treated as signals of failure modes, not as scientific proof of universal behavior.

## A. Officially Documented Behavior

### Agent Skills Specification (agentskills.io / agentskills/agentskills)

- A skill is a directory containing at minimum `SKILL.md` (YAML frontmatter + Markdown body).
- Required frontmatter: `name` (1-64 chars, lowercase a-z0-9-, no leading/trailing/consecutive hyphens, must match directory name), `description` (1-1024 chars, plain scalar, describes what + when).
- Optional: `license`, `compatibility` (≤500 chars), `metadata` (string→string map), `allowed-tools` (experimental space-separated list).
- Progressive disclosure: metadata always loaded; body loaded on activation; scripts/references/assets loaded on demand.
- Recommended: keep SKILL.md body <500 lines / <5k tokens; references one level deep; relative paths from skill root.
- Additional directories (`scripts/`, `references/`, `assets/`, or any others) are permitted.
- Validation via skills-ref (or equivalent) checks frontmatter and naming.

### Gemini CLI Agent Skills

- Discovery tiers (lowest→highest precedence): built-in → extension → user (`~/.gemini/skills/` or `~/.agents/skills/`) → workspace (`.gemini/skills/` or `.agents/skills/`).
- `.agents/skills/` is the interoperable alias.
- Activation: model calls `activate_skill` tool; user consent required; then SKILL.md body + directory access injected.
- Management: `/skills list|link|enable|disable|reload`, `gemini skills install|uninstall|list|link|enable|disable`.
- Skills are on-demand expertise, distinct from persistent `GEMINI.md` context files.
- Creation: manual or via built-in skill-creator; standard structure `SKILL.md` + optional scripts/references/assets.
- Note (as of mid-2026): unpaid/Google One tier migrated from Gemini CLI to Antigravity CLI; documentation still describes the skill system.

### Gemini API

- System instructions are supplied by the host application via the `system_instruction` field (or equivalent in Interactions API).
- Tool/function calling is application-managed: model emits function_call steps; host executes and returns results.
- Built-in tools (Google Search, Code Execution, etc.) and custom function declarations can be combined.
- Multi-turn state is maintained by the host (contents history or interaction ID).
- No automatic discovery of arbitrary SKILL.md files; host must inject relevant instructions.
- Current stable/preview models (September 2026) include Gemini 3.8 Flash, Gemini 3.1 Pro (preview), Gemini 3.7/3.6/3.5 Flash family, Live variants, image/video/audio specialists, Deep Research, Antigravity Agent, etc. Model IDs are versioned and change; skills must not hard-code obsolete IDs.

### Capability Variation

- Not every host exposes filesystem, shell, web search, code execution, structured output, or thinking controls.
- Thinking / extended reasoning levels are model- and host-dependent; do not assume they are always available or must be exposed to the user.

## B. Reported Community Problems (Signals Only)

Public GitHub issues, discussions, and anecdotal reports frequently mention:

- Instruction skipping or partial adherence on long plans.
- Premature “done” claims without verification.
- Hallucinated file existence or non-existence.
- Shallow reading of PLAN.md / SPEC.md / large documents.
- Tool results treated as success merely because the tool was invoked.
- Duplicate implementations instead of extending existing code.
- Scope creep or silent target substitution.
- Incomplete multi-file features.
- Weak recovery after test/build failures.

These are observed failure modes that a disciplined execution protocol can mitigate. They are not guaranteed to occur on every request or every model version.

## C. Super Gemini Design Decisions

1. Behavioral protocol, not model modification. Enforce UNDERSTAND → INSPECT → PLAN → EXECUTE → VERIFY → AUDIT → COMPLETE.
2. Evidence-first language and requirement traceability (Requirement → Implementation → Verification).
3. Portable core (Agent Skills format) with thin adapters for Gemini CLI, generic Agent Skills clients, and Gemini API (system-instruction renderer).
4. No chain-of-thought exposure; use concise internal state, checklists, and evidence records.
5. Graceful degradation when tools/filesystem/search are unavailable — never pretend inspection or execution occurred.
6. Existing-code-first and scope-control rules to reduce unnecessary rewrites and creep.
7. Explicit completion statuses: COMPLETE / PARTIALLY_COMPLETE / BLOCKED / FAILED with evidence.
8. Benchmarks and tests target the protocol itself, not abstract model intelligence.
9. No marketing claims that the skill “turns Gemini into Claude”, “eliminates hallucinations”, or “guarantees perfect coding”.

## D. Things That Cannot Be Guaranteed

- Perfect instruction adherence on every turn (models remain probabilistic).
- Elimination of all hallucinations.
- Identical behavior across every Gemini model version or host.
- Automatic skill discovery by raw Gemini API calls (host injection required).
- That every host implements scripts, allowed-tools, consent, or progressive disclosure identically.
- That community-reported failure modes will never reappear after protocol application.
- Forward compatibility with future, currently undocumented model APIs or thinking controls.

The skill improves reliability of capable models through disciplined process; it does not add intelligence that the underlying model lacks.
