# ZEDX-AI capacity planning

This is a measurement plan, not a claim of deployed capacity. Check current billing,
quotas and policy state in the relevant dashboards; code does not establish them.

## Workload and acceptance criteria

Define concurrent active interviews, main questions, follow-up frequency, answer
length, language mix and devices. 100 sessions with 40 questions does not imply
4,000 simultaneous requests. Agree p50/p95/p99 latency and failure/retry targets.
Measure silence waiting separately from provider processing time.

| Boundary | Measurements |
| --- | --- |
| Client Amy | Cold download, cached startup, synthesis time, memory, playback errors, webcam responsiveness |
| Browser voice | Installed languages, start/boundary/end behavior, errors |
| STT/LLM/TTS | Request/token/audio usage, 429s, timeout/retry rates, quota headroom |
| Hosting | API concurrency, execution duration, latency, memory, bandwidth and errors |
| Database | Query/RPC latency, locks, connection pressure, CPU/storage and auth errors |
| Reports/PDF | Evaluation/validation failures, long-document render time, browser memory |

## Decisions

- Reproduce the bottleneck before upgrading. Row count alone is not an upgrade trigger;
  inspect queries, indexes and connections.
- Provider key rotation supports failover, not unlimited capacity or automatic quota
  multiplication. Keep retries bounded and monitor user-visible failures.
- Verify the existing migration-backed usage and rate guards in staging before growth.
- Cache public static voice assets where appropriate. Do not share personalized
  CV/JD/answer-derived cache entries across users. Private caching needs ownership,
  expiry and invalidation.
- Verify current plan terms, quotas and prices before purchase. Upgrades do not
  guarantee uptime; document outage recovery separately.

## Staging evidence

Use authorized staging, synthetic CVs and dedicated accounts. Ramp concurrency,
include mixed languages and 40-question sessions, failure/retry and recovery.
Set a cost budget and stop conditions; do not run unbounded production load tests.
Record revision, configuration, devices/browsers, sample size, latency percentiles,
errors and resource use. Unit tests and 50 synthetic audio turns do not establish
production concurrent capacity. Repeat when changes or failures justify it.
