#!/usr/bin/env python3
"""Render a clean Gemini API system-instruction block from Super Gemini core sources."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "adapters" / "gemini-api" / "system-instruction-template.md"
SKILL = ROOT / "SKILL.md"

def main() -> int:
    if not TEMPLATE.exists():
        print("ERROR: system-instruction-template.md missing", file=sys.stderr)
        return 1
    text = TEMPLATE.read_text(encoding="utf-8").strip()
    # Optional: append a short note that the full skill is available if the host loads it
    print(text)
    return 0

if __name__ == "__main__":
    sys.exit(main())
