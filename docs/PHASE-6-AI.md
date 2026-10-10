# Phase 6 OpenAI setup and verification

The original OpenAI Responses and Microsoft Foundry adapters are preserved.
The initial OpenAI model is **`gpt-5.4-mini`**, which supports Responses, function
calling and structured outputs in the [official model documentation](https://developers.openai.com/api/docs/models/gpt-5.4-mini).
The [structured output guide](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
underpins the strict fact-ID schema. The model retrieves a timestamp-bound packet,
then chooses verified facts. The server supplies the actual wording and mandatory
match context. This is genuine optional model selection, not free-form generation.

## Exact local configuration

Use the ignored `.env.local` in the repository root. Edit it locally; never paste
a real key into source control, screenshots, chat, or a `NEXT_PUBLIC_*` variable.
Create a project API key in the [OpenAI platform](https://platform.openai.com/api-keys)
and place its value after `OPENAI_API_KEY=`. Existing settings may be retained.

```dotenv
AI_ENABLED=false
AI_PROVIDER=openai
OPENAI_API_KEY=YOUR_LOCAL_PROJECT_KEY
OPENAI_MODEL=gpt-5.4-mini
AI_USAGE_STORE=memory
AI_MINUTE_LIMIT=2
AI_HOURLY_LIMIT=2
AI_DAILY_LIMIT=2
AI_TOTAL_LIMIT=2
HISTORICAL_MATCHES_ENABLED=true
```

The allowance above is **two uncached narrations**, at most **four provider HTTP
requests**, since each narration uses evidence retrieval plus structured selection.
Memory limits are for isolated development and reset with the process; they are
not a persistent spending cap. Production requires the existing TLS Redis store
(`AI_REDIS_URL=rediss://…`, `AI_USAGE_STORE=redis`), with a persistent total limit
and the same quotas across workers. Configure only an allowance you approve.

```sh
npm run ai:check
npm run dev
```

The first command reports presence/configuration only, never validates the key or
calls the provider. For this phase it reported an existing key and inference OFF.
To authorize local interactive inference yourself, change `AI_ENABLED=true` and
restart the development server, then select Real Match, seek to 30:00 in
Arsenal–Leicester and press **Explain with OpenAI**, or open **Catch me up** and
press that button. Playing, seeking, switching sources or receiving a notification
does not call the model. Restore `AI_ENABLED=false` and restart when finished.

Use `AI_PROVIDER=offline` for deterministic explanations, or `AI_PROVIDER=foundry`
with `FOUNDRY_ENDPOINT`, `FOUNDRY_API_KEY`, `FOUNDRY_DEPLOYMENT` and the same opt-in
and usage controls. Foundry endpoint validation, API-key header and truthful
provider attribution remain unchanged. Never label OpenAI as Foundry.

## Optional live historical check — only with an approved allowance

The existing separately gated live runner now accepts a canonical historical ID.
Its default remains the synthetic pressure fixture. After explicit authorization
for **at most four new HTTP requests**:

```sh
AI_ENABLED=true SECOND_LOOK_AUTHORIZE_LIVE=yes SECOND_LOOK_LIVE_MATCH_ID=2499719 npm run eval:live
```

This checks Fan and Analyst historical recaps at 30:00, logs returned token usage,
latency, cache status and selection validation to `artifacts/ai-live-evaluation.json`,
and leaves the file's normal inference setting unchanged. It never runs in CI.
A cache hit is not a new live test; error requests may still be billable. The
transport guard caps four requests per invocation. Each invocation requires its
own allowance. This command was **not run during Phase 6**.

## Evaluation result and limitations

Phase 6 actual paid requests: **0**. Actual new API cost: **$0**.
Historical live OpenAI/Foundry latency, token cost and editorial benefit remain
**unmeasured**. Prior authorized synthetic evaluations are recorded separately in
[AI-EVALUATION.md](AI-EVALUATION.md); they are not new historical live results.

Automated checks cover:

- Full recorded-event preservation and source IDs, period ordering and stoppage,
  own goals, penalties, failed-save duplicate tags, and final-score reconciliation.
- Synthetic scenarios through the shared model without changing their events.
- Counts against raw provider events; missing positions/outcomes; unsupported
  periods; score mismatch and duplicate rejection; no invented possessions/xG.
- Real observations recomputed over every minute of each match, with counts and
  evidence windows checked; no synthetic high-recovery claims in historical mode.
- Arbitrary cutoff recaps and passages; future/forged ID rejection; both audiences;
  mocked OpenAI and Foundry retrieval/schema/provider attribution; fallback,
  concurrent deduplication and cached historical explanations; bounded payloads.
- Browser playback, speed, pause, seek, event selection, match switching, source
  switching, spoiler controls, notification deduplication, no background inference,
  stale-response cancellation, accessibility and mobile overflow.

A machine-readable offline report is generated by `npm test` at
`artifacts/historical-evaluation.json` and uploaded in CI. The retained release
copy is `docs/phase-6/evaluation.json`.

Example deterministic observations, checked against the actual source events:

| Match and cutoff                 | Verified observation                                               | Interpretation limit                                |
| -------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| Arsenal–Leicester, 30:00         | Arsenal 153 passes vs 83 in the preceding 15 minutes; 5 shots vs 3 | Activity, not possession duration or chance quality |
| Liverpool–Manchester City, 39:00 | Liverpool 3 shots vs 1                                             | Shot volume does not prove a tactical change        |
| Huddersfield–Manchester City     | Source includes an own goal and a penalty; score reconciles to 1–2 | No duplicate goal from the accompanying failed save |

Synthetic mode supports generator-specific high ball wins and synthetic xG.
Historical mode uses only supported event observations. Both abstain when windows
or evidence are insufficient. Narrative wording is deliberately constrained;
mocked tests prove contract correctness, not model quality. Human evaluation of
football relevance, readability and usefulness is still needed before expanding
public inference, as specified by the existing evaluation gate.
