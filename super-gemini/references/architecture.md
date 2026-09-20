# Architecture

## Design Principle
Super Gemini is a portable behavioral protocol packaged as an Agent Skill. The canonical core is host-agnostic. Thin adapters supply host-specific installation and injection guidance.

## Directory Layout
```
super-gemini/
├── SKILL.md                 # Concise activation + protocol
├── LICENSE
├── references/              # Progressive disclosure detail
├── scripts/                 # Validation, rendering, audit helpers
├── assets/templates/        # Reusable matrices and checklists
├── adapters/
│   ├── agent-skills/        # Generic clients
│   ├── gemini-cli/          # Gemini CLI / .agents/skills
│   └── gemini-api/          # System-instruction injection
├── benchmarks/              # Behavioral scenarios
└── tests/                   # Structural and integrity tests
```

## Progressive Disclosure
1. Metadata (name + description) — always visible
2. SKILL.md body — loaded on activation
3. references/, scripts/, assets/ — loaded only when needed

## Portability Guarantees
- No hard dependency on Gemini CLI proprietary APIs
- No Gemini-only tool names inside the core protocol
- No assumption that every host implements scripts or consent
- Core instructions remain valid for any Agent Skills-compatible agent
- Gemini API path requires explicit host injection of the rendered system prompt

## State Model (conceptual)
TaskState holds intent, scope, constraints, requirements[], current_phase, completed/failed/blocked items, evidence[], changed_files[], verification_results[], final_status.
This is an execution abstraction, not a chain-of-thought transcript.
