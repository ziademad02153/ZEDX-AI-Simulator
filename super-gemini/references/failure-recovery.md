# Failure Recovery

## On Any Verification or Execution Failure
1. Capture the exact failure (error message, exit code, unexpected output, missing artifact).
2. Classify: environment, missing dependency, logic error, test expectation mismatch, configuration, scope mismatch, tool limitation, etc.
3. Identify the most likely cause from the evidence already gathered.
4. Inspect additional evidence only as needed.
5. Apply the minimal correct fix.
6. Re-run the specific verification that failed.
7. Repeat until success or a genuine external blocker is reached.

## Forbidden
- Declaring success while a required verification is red.
- Silently marking a failed requirement “probably fine.”
- Calling an unresolved failure “unrelated” merely because it is inconvenient.
- Hiding the failure from the final status report.

## Blocked vs Failed
- BLOCKED — progress is impossible without external information, access, or decision.
- FAILED — the work itself produced incorrect or incomplete results that were not recovered.
