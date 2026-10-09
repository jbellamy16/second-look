# AI evaluation and release gate

## Status for this implementation

No live OpenAI or Foundry calls were made. Actual API usage and cost: **0 requests, $0**. Mocked token counts and timings are test fixtures, never evidence of live cost or latency. No public deployment or paid infrastructure was created.

The default repeatable suite covers 180 combinations: pressure/substitution/quiet × seeds 202632/43/71 × timestamps 0/1800/3300/3804/5400 × Fan/Analyst × OpenAI/Foundry. It compares score, evidence counts, timestamps, mandatory context and rendered claims with regenerated event data. Additional tests reject forged evidence/statistics, unknown facts, duplicate facts, arbitrary free-form prose, omitted score/abstention/goal context, wrong tools, incomplete responses, refusal and HTTP failures. Ordinary tests never require a provider key.

```sh
npm run check
npm run eval:ai
npm run test:e2e
```

Report: `artifacts/ai-evaluation.json`. CI uploads it separately. A real Redis integration test runs in CI; locally it runs when `REDIS_TEST_URL` points at a disposable test Redis instance. It uses isolated random keys and cleans up those keys only. It checks concurrent workers, persistent total counts, lock ownership, cached responses, and failure cooldown. Other tests check production fail-closed behavior and local fallback controls.

## What automation proves, and what it does not

| Dimension            | Repeatable check                                                                    | Remaining judgment                                                      |
| -------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Factual accuracy     | Every displayed claim is rendered from server-verified facts                        | Review wording for misleading implications and omissions                |
| Unsupported claims   | Only enumerated IDs accepted; no model prose enters UI                              | Review whether the supplied templates themselves overstate evidence     |
| Evidence consistency | Counts, IDs, teams, windows and visible prefixes compared                           | Football relevance of each observation                                  |
| Narrative quality    | Bounded output and required context                                                 | Readability, repetition, coherence and usefulness, scored 1–5           |
| Fan / Analyst        | Accessible versus measurement-focused wording; distinct outputs when patterns exist | Does each audience learn something useful?                              |
| Relevance            | Editorial ranking factors and required decisive context                             | Blind comparison against deterministic recap; don't assume AI is better |
| Latency              | End-to-end and provider timings recorded                                            | Live p50/p95 only after a larger authorized sample                      |
| Cost                 | Returned token usage, cache reuse and standard-rate estimate                        | Provider billing, failures without usage, regional and negotiated rates |
| Fallback             | Disabled, missing store, limits, malformed output and provider failure              | Usability when inference is slow or repeatedly unavailable              |

Mock outputs follow the deterministic baseline on purpose. A perfect result means contract correctness, not an impressive model. The AI chooses verified sentences rather than writing unconstrained prose. That design prevents unsupported generated sentences, but cannot guarantee a good editorial choice or that every source template is semantically perfect.

## Semantic review before enabling public AI

A human reviewer must compare the real output, deterministic baseline and event evidence. Automated assertions and an assistant's code review do **not** satisfy this gate. Leave the gate pending until someone records their review.

Use at least these cases:

- Pressure at 63:24: Harbor high ball wins and shots are each 4 versus 0 in equal preceding windows. Two of the high wins are followed by a shot within the same recorded possession. Do not turn this association into proof of a pressing system or causation. No percentage increase from zero.
- Substitution just before and after 55 minutes: the actual substitution may occur later at a possession boundary. Before the recorded event, do not mention the change; afterward, do not claim it caused improved performance.
- Quiet opening and quiet demo timestamp: abstain from announcing a tactical shift without qualifying evidence. A score or individual chance may still be reportable.
- Rewind: compare identical timestamps in the full event array and truncated prefix. No later goal, player change, or shot may influence the story.
- Full time: no prediction of further play; suggest revisiting a recorded moment.
- Preferences and repetition: follow a player/team, revisit a previously inspected pattern, and disable categories. Check whether personalization improves relevance without hiding score context.

For each output record factual errors, misleading implications, omitted decisive events, narrative quality (1–5), audience fit (1–5), relevance (1–5), and preference versus the deterministic baseline (AI/tie/baseline). Note the reviewer and date. Any factual error blocks public enablement. Require no unsupported claims and a clear usefulness benefit before expanding AI scope; otherwise keep deterministic selection and improve the candidates/prompt.

Current human sign-off: **pending**. Current live editorial benefit: **unmeasured**.

## Small authorized live check

Only after the owner explicitly authorizes spending:

1. Configure ignored `.env.local` with `AI_ENABLED=true`, `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and `OPENAI_MODEL=gpt-5.4-mini`. For isolated local testing, set `AI_USAGE_STORE=memory`; for production, an existing TLS Redis store is mandatory. Set conservative quotas. Do not create a service as part of this procedure without separate approval.
2. Run `SECOND_LOOK_AUTHORIZE_LIVE=yes npm run eval:live`. It runs two pressure recaps, Fan and Analyst, for **at most four new Responses requests**, subject to cache and usage limits. This command is deliberately separate from CI.
3. Inspect `artifacts/ai-live-evaluation.json`, including provider, cache flag, usage completeness, timing, evidence, and empty human-review fields. A cached result is not a new live test. An offline result fails the live test; provider errors may have incurred unknown billable usage.
4. Review against the deterministic baseline and submit a human sign-off. Expand to the remaining scenarios only with an agreed additional request budget.
5. Restore `AI_ENABLED=false` after local testing. Foundry uses the same steps with its endpoint/key/deployment and `AI_PROVIDER=foundry` when access returns.

The cost helper estimates standard GPT-5.4 Mini token charges at $0.75/M input, $0.075/M cached input and $4.50/M output, verified in the [official model documentation](https://developers.openai.com/api/docs/models/gpt-5.4-mini) on October 9, 2026. Unknown models, missing usage, and Foundry return unknown cost; the helper never assumes they are free. Compare estimates to actual billing. Alerts are not spending caps.

## Operator prerequisites

Before public inference, verify the existing host's TLS Redis connection, consistent settings across workers, persistence/no-eviction, short command timeouts, global limits and failure behavior. The persistent total reservation count is intentionally not automatically reset. Document every increase in allowance. Deployment stays manual. Per-user authentication/allocation remains a consideration for an expanded audience; the global limits protect the shared demo allowance but cannot ensure fair access among anonymous visitors.
