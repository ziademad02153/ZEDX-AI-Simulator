# Gemini CLI Adapter

Official discovery paths (precedence low → high):
1. Built-in
2. Extension
3. User: `~/.gemini/skills/` or `~/.agents/skills/`
4. Workspace: `.gemini/skills/` or `.agents/skills/`

`.agents/skills/` is the interoperable alias recommended for cross-tool portability.

## Installation

### User scope (all projects)
```bash
# link for development
gemini skills link /path/to/super-gemini --scope user

# or install from git / package
gemini skills install /path/to/super-gemini --scope user
```

### Workspace scope (current project only)
```bash
mkdir -p .agents/skills
cp -r /path/to/super-gemini .agents/skills/
# or
gemini skills link /path/to/super-gemini --scope workspace
```

## Activation & Management
- `/skills list` — see discovered skills
- `/skills reload` — refresh after changes
- Model calls `activate_skill`; user consent is required; then SKILL.md + directory access are injected.
- Interaction with `GEMINI.md`: Skills are on-demand expertise; GEMINI.md is persistent workspace context. Both may be active. Explicit user requirements and host constraints still take precedence.

## Security / Consent
Gemini CLI prompts for consent before granting a skill directory access. Super Gemini never bypasses host consent.

## Reload after edit
After modifying SKILL.md or references, run `/skills reload` or restart the session.

## Validation
Use the skill’s own `scripts/validate_skill.py` or Gemini CLI’s packaging/validation helpers if available.

Reference official docs: https://geminicli.com/docs/cli/skills/ and https://geminicli.com/docs/cli/creating-skills/
(Note: as of mid-2026 some tiers migrated to Antigravity CLI; the skill format remains the same.)
