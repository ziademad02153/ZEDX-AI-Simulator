#!/usr/bin/env python3
"""Integrity check for the benchmark suite."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
BENCH = ROOT / "benchmarks"

EXPECTED = [
    "01-instruction-adherence",
    "02-long-plan-completeness",
    "03-existing-code-discovery",
    "04-hallucinated-file",
    "05-fake-completion",
    "06-tool-failure",
    "07-regression",
    "08-scope-creep",
    "09-ambiguous-request",
    "10-skill-interoperability",
    "11-document-skimming",
    "12-requirement-traceability",
    "13-failed-test-recovery",
    "14-configuration-change",
    "15-multi-file-feature",
]

def main() -> int:
    if not BENCH.is_dir():
        print("FAIL: benchmarks/ missing")
        return 1
    missing = []
    for name in EXPECTED:
        d = BENCH / name
        if not d.is_dir():
            missing.append(name)
            continue
        for f in ("README.md", "evaluation.md"):
            if not (d / f).exists():
                missing.append(f"{name}/{f}")
        if not (d / "input").exists() or not (d / "expected").exists():
            missing.append(f"{name}/input or expected")
    if missing:
        print("Missing benchmark artifacts:")
        for m in missing:
            print(f"  {m}")
        return 1
    print(f"PASS: {len(EXPECTED)} benchmarks present with required files")
    return 0

if __name__ == "__main__":
    sys.exit(main())
