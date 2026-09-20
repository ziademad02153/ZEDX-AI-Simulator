# Skill Interoperability

Super Gemini is an execution-quality and orchestration layer. It is not a replacement for specialized domain skills.

## When Another Skill Is Relevant
1. Identify the skill from its description or host discovery.
2. Read its instructions if the host permits.
3. Decide whether it is required or merely helpful.
4. Activate / use it for its domain expertise.
5. Preserve Super Gemini’s verification, audit, and truthful-completion rules after the specialized skill finishes.
6. Do not create duplicate functionality that the other skill already supplies.
7. Do not override the other skill’s domain-specific correctness rules without clear justification.

## Graceful Degradation
Hosts differ in support for:
- automatic skill activation
- scripts
- allowed-tools
- consent prompts
- progressive disclosure of references

If a specialized skill cannot be loaded, note the limitation and continue with best-effort application of Super Gemini’s own protocol. Never pretend a skill was used when it was not.
