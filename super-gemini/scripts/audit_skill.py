#!/usr/bin/env python3
"""High-level audit helper for Super Gemini."""

from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent

def run(cmd: list[str]) -> int:
    print(f"→ {' '.join(cmd)}")
    return subprocess.call(cmd, cwd=ROOT)

def main() -> int:
    scripts = ROOT / "scripts"
    rc = 0
    rc |= run([sys.executable, str(scripts / "validate_skill.py")])
    rc |= run([sys.executable, str(scripts / "check_references.py")])
    rc |= run([sys.executable, str(scripts / "run_benchmarks.py")])
    if rc == 0:
        print("\nAUDIT PASS")
    else:
        print("\nAUDIT FAIL")
    return rc

if __name__ == "__main__":
    sys.exit(main())
