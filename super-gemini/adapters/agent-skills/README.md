# Generic Agent Skills Adapter

Super Gemini follows the open Agent Skills specification (agentskills.io). Any client that implements progressive disclosure of name/description → SKILL.md body → on-demand resources can use the canonical skill directory unchanged.

## Installation
Copy or link the entire `super-gemini/` directory into the client’s skill search path (commonly `~/.agents/skills/` or a project-local equivalent).

## Expected Behavior
- Client surfaces the skill’s name and description at session start.
- On matching task, client loads SKILL.md.
- Model may then request references/, scripts/, or assets/ as needed.

## Graceful Degradation
Clients differ. Super Gemini does not require:
- automatic skill activation
- script execution support
- allowed-tools pre-approval
- consent UI
- reference pre-loading

If a capability is missing, the model follows the core protocol with the tools the host actually provides and never pretends otherwise.

## Validation
Run `scripts/validate_skill.py` (or the client’s equivalent) against the skill root.
