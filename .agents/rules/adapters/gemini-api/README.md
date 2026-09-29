# Gemini API Adapter

The Gemini API does not automatically discover or load SKILL.md files. The host application must inject the Super Gemini protocol as a system instruction (or equivalent developer message).

## Components
- `system-instruction-template.md` — canonical text block
- `integration-guide.md` — how to wire it
- `../../scripts/render_gemini_system_prompt.py` — renderer that produces a clean system-instruction string from the core sources

## Minimal Integration
1. Run the renderer (or copy the template).
2. Place the resulting text into the `system_instruction` field of the generateContent / interactions request.
3. Supply whatever tools the host implements (filesystem, shell, search, code execution, custom functions).
4. Manage multi-turn state and tool-result injection on the application side.
5. Never claim the model inspected files or ran commands it could not access.

## Tool Responsibility
Tool execution remains the host’s responsibility. Super Gemini only supplies the behavioral discipline the model should follow when tools are available.

## Graceful Degradation
If the host supplies no tools or limited context, the model must still follow Intent Lock, evidence language, and truthful completion. It must never invent tool results.
