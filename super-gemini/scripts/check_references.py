#!/usr/bin/env python3
"""Check that relative references in SKILL.md point to existing files."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
SKILL = ROOT / "SKILL.md"

def main() -> int:
    text = SKILL.read_text(encoding="utf-8")
    refs = re.findall(r"(?:references|scripts|assets|adapters)/[a-zA-Z0-9_./\-]+", text)
    missing = []
    for r in refs:
        # strip trailing punctuation that may have been captured
        clean = r.rstrip(".,);:")
        if not (ROOT / clean).exists():
            missing.append(clean)
    if missing:
        print("Missing referenced paths:")
        for m in missing:
            print(f"  {m}")
        return 1
    print(f"PASS: {len(refs)} reference paths resolved")
    return 0

if __name__ == "__main__":
    sys.exit(main())
