# Super Gemini

Portable Agent Skill that enforces a disciplined engineering execution protocol for Gemini and any Agent Skills-compatible agent.

**Core loop:** UNDERSTAND → INSPECT → PLAN → EXECUTE → VERIFY → AUDIT → COMPLETE

## What it is
A behavioral protocol packaged as an open Agent Skill. It improves instruction adherence, completeness, verification discipline, and truthful completion reporting.

## What it is not
- Not a model-weight modification
- Not a guarantee of zero hallucinations or perfect coding
- Not a replacement for specialized domain skills
- Not locked to a single Gemini version or host

## Installation

### Generic Agent Skills clients
Copy or link the `super-gemini/` directory into the client’s skill path (commonly `~/.agents/skills/`).

### Gemini CLI
```bash
gemini skills link /path/to/super-gemini --scope user   # or workspace
# or place under .agents/skills/ or .gemini/skills/
```

### Gemini API
Render a system instruction and inject it:
```bash
python scripts/render_gemini_system_prompt.py
```
See `adapters/gemini-api/` for details.

## Validation
```bash
python scripts/validate_skill.py
python scripts/check_references.py
python scripts/run_benchmarks.py
python scripts/audit_skill.py
```

## Benchmarks & Tests
See `benchmarks/` and `tests/`. These check protocol presence and structural integrity; they do not claim to measure model intelligence.

## Limitations
See `references/research-notes.md` section D.

## License
Apache-2.0
