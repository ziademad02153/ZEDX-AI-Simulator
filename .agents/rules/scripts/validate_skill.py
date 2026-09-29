#!/usr/bin/env python3
"""Structural validation for Super Gemini skill."""

from pathlib import Path
import re
import sys
import yaml

ROOT = Path(__file__).resolve().parent.parent
REQUIRED_DIRS = ["references", "scripts", "assets", "adapters", "benchmarks", "tests"]
REQUIRED_REFS = [
    "research-notes.md",
    "execution-protocol.md",
    "intent-protocol.md",
    "context-protocol.md",
    "planning-protocol.md",
    "verification-protocol.md",
    "completion-protocol.md",
    "failure-recovery.md",
    "skill-interoperability.md",
    "security.md",
    "gemini-capabilities.md",
    "architecture.md",
]

def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    sys.exit(1)

def main() -> int:
    skill_md = ROOT / "SKILL.md"
    if not skill_md.exists():
        fail("SKILL.md missing")

    content = skill_md.read_text(encoding="utf-8")
    if not content.startswith("---"):
        fail("SKILL.md missing YAML frontmatter")

    parts = content.split("---", 2)
    if len(parts) < 3:
        fail("Malformed frontmatter")

    try:
        meta = yaml.safe_load(parts[1])
    except Exception as e:
        fail(f"YAML parse error: {e}")

    name = meta.get("name")
    if name != "super-gemini":
        fail(f"name must be 'super-gemini', got {name!r}")
    if ROOT.name != "super-gemini":
        fail("Directory name must match name field")

    desc = meta.get("description", "")
    if not isinstance(desc, str) or not (1 <= len(desc) <= 1024):
        fail("description must be 1-1024 characters")
    if ": " in desc:
        fail("description must not contain colon-space (plain scalar rule)")
    if "<" in desc or ">" in desc:
        fail("description must not contain < or >")

    for d in REQUIRED_DIRS:
        if not (ROOT / d).is_dir():
            fail(f"Missing required directory: {d}")

    for r in REQUIRED_REFS:
        if not (ROOT / "references" / r).exists():
            fail(f"Missing reference: references/{r}")

    # Basic path sanity
    for p in ROOT.rglob("*"):
        if p.is_file() and " " in p.name:
            print(f"WARN: space in filename {p.relative_to(ROOT)}")

    print("PASS: Super Gemini structural validation succeeded")
    return 0

if __name__ == "__main__":
    sys.exit(main())
