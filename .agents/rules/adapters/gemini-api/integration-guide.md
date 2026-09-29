# Gemini API Integration Guide

## 1. Obtain the System Instruction
Preferred:
```bash
python scripts/render_gemini_system_prompt.py > system_prompt.txt
```
Alternatively use the static template in this directory.

## 2. Inject into the Request
Python (google-genai / Interactions API style):
```python
from google import genai

client = genai.Client(...)
interaction = client.interactions.create(
    model="gemini-3.8-flash",  # or current Pro/Flash
    system_instruction=open("system_prompt.txt").read(),
    tools=[...],  # host-defined tools
    input=user_message,
)
```

REST equivalent: set the `system_instruction` field with a `parts` array containing the text.

## 3. Multi-Turn / State
Keep conversation history (or interaction ID) so the model retains the locked intent and prior evidence. Re-inject the system instruction on each new interaction if the API does not persist it.

## 4. Tool Loop
When the model emits function_call steps:
1. Execute the function in the host environment.
2. Return the real result (success or failure) with the matching call id.
3. Never fabricate a successful result.

## 5. Verification Loop
The protocol expects the model to request verification after implementation. The host must allow the model to call the relevant tools (test runner, type checker, etc.) and must return honest output.

## 6. Limitations
- No automatic skill discovery.
- No automatic reference loading; the rendered prompt already contains the core protocol. Additional reference files can be supplied as extra context if the host wishes.
- Model version and tool surface are controlled by the host; the skill adapts.
