# Editorial rules and model comparison — October 10, 2026

## Decision

**Keep GPT-5.4 Mini as the configured model.** Better evidence coverage, explicit editorial priorities and clearer templates produced the largest practical gains in this pilot. GPT-5.4 handled tool planning more reliably before those fixes, but did not establish enough extra usefulness to justify its higher routine cost after the final evidence fix.

This is an assistant's assessment of a small, sequential comparison, not a blinded human review or a statistically established model ranking. The final code is local and has not been deployed. Public AI remains disabled.

## What changed

- Prioritize a supported change in shots or recoveries over a routine passing count, then select a complementary event. Avoid filling every slot and repeating the same kind of observation.
- Offer complete equal-window comparisons early in a half, using windows of 5–15 minutes rather than waiting for two full 15-minute intervals. Neither interval crosses half-time. The new recovery measure counts recorded recovery events only, not the legacy broader recovery/interception/tackle ball-win statistic.
- Identify the player and timestamp in passing/shot stories; remove ambiguous references such as “this shot.” Name substitutes and give explicit time windows for passing pairs and player involvement.
- Supply candidate summaries and measurements to guide investigation. These do not authorize publication: claims still require tool retrieval and independent recomputation.
- Enumerate retrieved claim IDs in the response schema; expose incompatible evidence pairs; enforce Fan/Analyst story limits. With no verified claims available, the response must abstain.
- Make the initial evidence query cover a complete, server-bounded recent window, including the earlier comparison interval. The model may then choose a useful follow-up query. This directly addresses the failure where Mini repeatedly queried only the latest interval.
- Keep existing rejection of unsupported claims, invalid visualization choices and overlapping evidence. After validation, remove repeated editorial groups while retaining the model's first choice and record any omissions. No automatic paid retries or cross-model fallback were added.

Current director/cache version: `director-1.1.2`.

## Method and complete results

We tested eight case slots: pressure Fan twice, pressure Analyst, quiet Fan, post-substitution Analyst, an unfamiliar balanced synthetic seed, favorite-player Fan, and a permitted Arsenal–Leicester historical fixture. Identical fixtures, cutoffs, audiences and preferences were used across the original Mini, revised Mini and revised GPT-5.4 arms. The original code was copied before editing. Sources were matched across the two revised model arms at each stage.

Both deployments used Azure GlobalStandard on the same resource, their default non-reasoning configuration, the same three-request/four-tool maximum, 1,800 output-token cap, and normal production validation. Returned reasoning-token counts were zero. Calls were paced 20 seconds between workflows. No inference cache bypass is claimed: workflows made real provider calls, and provider-side prompt caching varied.

| Stage                  | Code  | Accepted / cases | HTTP calls | Estimated cost | Estimate without cached-token discounts | Median seconds |
| ---------------------- | ----- | ---------------: | ---------: | -------------: | --------------------------------------: | -------------: |
| original-mini          | 1.0.2 |            8 / 8 |         21 |      $0.092874 |                               $0.121645 |           5.20 |
| revised-mini           | 1.1.0 |            6 / 8 |         17 |      $0.067680 |                               $0.092218 |           3.45 |
| revised-gpt54          | 1.1.0 |            7 / 8 |         20 |      $0.334660 |                               $0.423652 |           5.22 |
| revised-mini-hardened  | 1.1.1 |            3 / 4 |          9 |      $0.046363 |                               $0.050597 |           3.67 |
| revised-gpt54-hardened | 1.1.1 |            4 / 4 |         11 |      $0.242477 |                               $0.257165 |           6.88 |
| revised-mini-final     | 1.1.2 |            2 / 2 |          4 |      $0.024348 |                               $0.024348 |           3.33 |
| revised-gpt54-final    | 1.1.2 |            2 / 2 |          6 |      $0.146160 |                               $0.146160 |           5.75 |

There were **36 workflow attempts**, **32 accepted results**, and **88 HTTP 200 responses**. Four editorial plans were correctly rejected; HTTP success does not imply a publishable story. No Azure 429 occurred in this paced comparison. Total returned-usage estimate: **$0.95456210**, with no unresolved usage reservations, under the new $2 / 90-request test allowance. The earlier Foundry evaluation has its own ledger and is excluded from this total.

All four failures are retained:

1. Revised Mini, unfamiliar match: selected a comparison from the shortlist without retrieving its full evidence.
2. Revised Mini, historical match: selected two observations with too much evidence overlap.
3. Revised GPT-5.4, historical match: the same overlap rejection.
4. Hardened Mini, historical match: queried only the latest interval twice, then returned `publish` with an empty story list. The verifier rejected that inconsistent abstention.

The final first-query constraint and empty-evidence response rule address the remaining coverage and abstention failure. Both models then passed the unfamiliar and historical cases. **Only those two paid cases were rerun on the final 1.1.2 code**, not the entire live matrix. Earlier successful cases do not constitute a full final-version reliability benchmark.

## Final paired checks

| Case           | Mini cost | GPT-5.4 cost | Mini time | GPT-5.4 time | Assistant assessment                                                                                                  |
| -------------- | --------: | -----------: | --------: | -----------: | --------------------------------------------------------------------------------------------------------------------- |
| unfamiliar-fan |    1.474¢ |       8.970¢ |     3.06s |        6.23s | Identical narrative and selected story IDs.                                                                           |
| historical-fan |    0.961¢ |       5.646¢ |     3.60s |        5.28s | Both preserve the score, latest goal and shot increase. GPT-5.4 adds the forward-pass increase; Mini is more concise. |

Mini used two requests for each final case; GPT-5.4 used three. The measured larger-model costs were approximately six times Mini's in this pair, reflecting both unit rates and extra investigation work. Cache effects and the small sequential sample limit generalization; the table above also gives estimates without cache discounts.

Example from the final unfamiliar-match test, identical across models:

> At 70:00, Harbor Athletic 1–1 Riverside FC. 54:23: Goal by Milo Serrano · Harbor Athletic. Harbor recorded 4 shots from 57:30 to 70:00, compared with 2 in the preceding equal window. Harbor won the ball at 66:27 before Leon Costa's shot at 66:42 in the same possession.

The original Mini response for that case selected a recovery/shot relationship and a repeated passing pair, without the shot-increase comparison. Both revised Fan pressure repeats selected the change in shots plus a named recovery-to-shot moment, while the original Mini omitted the shot increase on one repeat. Both revised models produced identical narratives on the initial pressure Fan, repeat, Analyst and quiet cases. GPT-5.4's first-pass reliability advantage was real in this small sample (7/8 versus 6/8), but it also failed the historical overlap rule.

The revised post-substitution Mini output named Nico Wells and described his recorded contribution without claiming it caused improvement. GPT-5.4 omitted that optional detail. Favorite-player relevance remained mixed: one Mini run chose a passing pair unrelated to the favorite, while later runs from both models selected the same match-wide change and specific shot. More human review is needed to decide when personalization should outrank general match developments.

## Accuracy and limits

Accepted claims were recomputed from canonical recorded events. Cutoff checks, actual evidence membership and prefix invariance passed in the live harness. Score/latest-goal context remained server-owned. The assistant identified no unsupported factual claim in the accepted sample. This does not validate all source data or establish perfect football analysis.

Editorial interest remains a judgment. The final historical GPT-5.4 answer contains one extra valid statistic; this pilot does not show that users benefit enough from that addition to pay more for every investigation. A larger model could still help broader open-ended tasks that this constrained application does not yet support. There is no claim about other models or reasoning levels.

Human football review and production shared-usage-store verification remain pending. “Spot on” is not guaranteed. Public inference was not enabled or redeployed during this work.

## Cost sources and infrastructure

Rates checked against [OpenAI's GPT-5.4 model documentation](https://developers.openai.com/api/docs/models/gpt-5.4) and Microsoft's [GPT-5.4 Foundry announcement](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/introducing-gpt-5-4-in-microsoft-foundry/4499785) and [Mini pricing announcement](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/introducing-openai%E2%80%99s-gpt-5-4-mini-and-gpt-5-4-nano-for-low-latency-ai/4500569). Per million tokens: Mini $0.75 input / $0.075 cached / $4.50 output; GPT-5.4 $2.50 / $0.25 / $15, within the short-context pricing band. These are token-based estimates, not inspected billing invoices.

The temporary `between-the-lines-gpt54-eval` deployment (GPT-5.4 `2026-03-05`) was deleted after testing. Existing `between-the-lines-gpt54-mini` (`2026-03-17`) remains selected and its temporary test throughput increase was restored to 10 units. No provisioned-throughput purchase or new hosting service was made. Before public inference, throughput must be sized for multi-request investigations alongside persistent application spending limits; the restored low Azure allocation is not a guarantee of production capacity.

## Verification and artifacts

- Final type checking and production build passed; **308** unit/API/integration checks passed, with two optional environment/data-dependent skips.
- The revised templates and observer passed **111** production-browser checks; 36 hidden historical-UI checks were skipped. Subsequent schema/query changes passed the final unit/build checks and real paired provider calls. Historical model evaluation used the licensed backend fixture despite the public UI hiding recorded sources.
- The 200-case director and 180-case narration matrices are offline evaluations included in those checks, not extra paid tests.
- Runtime request limits, timeouts, source licensing restrictions, safe fallbacks, secret handling and public inference flags remain in force.

`eval/editorial.live.eval.ts` and `vitest.editorial-live.config.ts` are separate from normal tests and CI. They require explicit `SECOND_LOOK_AUTHORIZE_EDITORIAL_COMPARISON=yes`, a whitelisted `SECOND_LOOK_EDITORIAL_VARIANT`, and the exact configured Azure resource/deployment. `SECOND_LOOK_EDITORIAL_ROUND=hardened|final` labels follow-ups; `SECOND_LOOK_FOUNDRY_CASES` selects diagnostic cases. The persistent ledger enforces $2 and 90 HTTP attempts across all variants and rounds. Do not clear it to obtain more spending. The temporary stronger-model deployment has been removed, so rerunning that arm requires explicit re-provisioning within an authorized scope.

Ignored local evidence: `artifacts/editorial-comparison-ledger.json`, `artifacts/editorial-comparison-summary.json`, the seven `artifacts/editorial-*.json` phase reports, `artifacts/editorial-original-source.tar.gz`, and `artifacts/editorial-source-manifest.json`. Original and revised outcomes, all failures, token usage and permitted public outputs remain available. API keys and private reasoning are excluded; human-review fields remain null.
