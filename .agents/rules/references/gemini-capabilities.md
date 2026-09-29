# Gemini Capabilities (as of 2026-09)

## Current Model Families (official catalog)
Stable / widely available:
- Gemini 3.8 Flash (long-horizon software engineering, agents, enterprise workflows)
- Gemini 3.8 Live / Live Extended Thinking
- Gemini 3.7 / 3.6 / 3.5 Flash family
- Gemini 3.5 Flash-Lite, 3.1 Flash-Lite
- Image models (Nano Banana series, Gemini 3 Pro Image)
- Audio / Live / TTS / Transcribe variants
- Deep Research / Deep Research Max
- Antigravity managed agent
- Computer Use preview

Preview:
- Gemini 3.1 Pro

Model IDs and availability change. The core Super Gemini skill never hard-codes a specific model ID. Hosts select the model; the skill adapts to the capabilities actually exposed.

## Capability Detection and Degradation
The skill must detect or gracefully handle the presence or absence of:
- Thinking / extended reasoning controls
- Tool / function calling
- Code execution
- Filesystem / workspace access
- Web / search grounding
- Structured outputs
- Stateful multi-turn interactions
- Context window limits

If a capability is unavailable, never pretend it was used. Fall back to pure reasoning + the evidence the host does supply.

## Thinking Controls
When a host exposes configurable thinking levels, prefer higher levels for complex multi-step engineering tasks and lower levels for simple queries. Do not force the model to externalize private chain-of-thought. Super Gemini uses explicit state, checklists, and verification results instead.

## Recommended Usage
- Prefer models with strong agentic / coding performance (current Flash 3.8 and Pro-class) for Super Gemini workloads.
- Always inject the core protocol via system instruction or skill activation; do not rely on the model spontaneously adopting the discipline.
