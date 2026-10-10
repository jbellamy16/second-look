# Phase 6: historical football and match intelligence

Synthetic remains the default, including its seeded scenarios, player identities,
intelligence and demo controls. **Real Match** opens complete recorded event
replays, initially at kickoff with final-score spoilers off. Nothing is live.

## Available matches

| Match                               | Date (UTC) | Published result | Original events | Match ID |
| ----------------------------------- | ---------- | ---------------- | --------------- | -------- |
| Arsenal – Leicester City            | 2017-08-11 | 4–3              | 1,768           | 2499719  |
| Liverpool – Manchester City         | 2018-01-14 | 4–3              | 1,876           | 2499943  |
| Huddersfield Town – Manchester City | 2017-11-26 | 1–2              | 1,593           | 2499841  |

All are from the Premier League 2017–18 season (source competition 364,
season 181150). The displayed Premier League name is plain factual text; the
source competition name is “English first division”. Metadata substitutes add
6, 5 and 6 records respectively. Goal events are reconciled to the match records
before a match can load. This is the authoritative source for this integration;
we do not claim independent official-league statistics verification.

## Rights and reproducibility

The [figshare collection](https://figshare.com/collections/Soccer_match_event_dataset/4415000)
is the source, not an unofficial mirror. The event, match, team, player,
competition and mapping items **each** specify CC BY 4.0. See
[data attribution](../data/historical/LICENSE.md) and the saved item-level
[metadata](../data/historical/sources.json). The interface credits Wyscout,
Pappalardo & Massucco, the license, and the research paper. Data is selected and
normalized; that adaptation is disclosed. No separate visual assets are used.

To reproduce the selection (about 80 MB of public originals, cached locally):

```sh
python3 scripts/import-wyscout.py /tmp/btl-wyscout
```

The importer verifies pinned MD5 checksums and version-specific licenses before
writing the three match files. The application runs entirely from these local
files; it never downloads data during playback or builds. Do not run a generic
formatter over the compact match JSON; use the importer for reproducibility.

## Shared source boundary

`MatchSource.load(id)` returns validated `MatchData`. `SyntheticMatchSource` wraps
the existing deterministic generator; `HistoricalMatchSource` parses Wyscout
records. The synthetic interface uses its synchronous `read` variant and projects
the same normalized events into the existing pitch/intelligence UI. Both use
`normalizedEventSchema` and match-level uniqueness, time and provenance checks.

The server repository allowlists the three historical IDs and lazy-loads each
file once. Request handlers retrieve canonical server data, never client-supplied
events or facts. The common model retains nullable positions and possession IDs,
source event/type/tag IDs, source team/player IDs, period-relative time and
source precision. The historical event ID is `wyscout-{matchId}-{eventId}`.
`harbor` and `riverside` are legacy **home/away display slots** in shared UI code;
original numerical identities and actual names remain in match metadata and every
event's provenance. They do not substitute fictional clubs into historical data.

## Conversion rules

- **Periods:** only 1H and 2H in this curated league selection. Unsupported extra
  time or penalty-shootout periods fail validation rather than being silently
  flattened. `periodSeconds` retains the full source decimal `eventSec`.
- **Timeline:** second half starts one second after the ceiling of the latest
  first-half event, never before 45:00. This keeps first-half stoppage in order.
  The interval is omitted. The displayed clock resets to 45:00 at the second-half
  boundary; stoppage displays `45+mm:ss` / `90+mm:ss`. Replay ends at the ceiling
  of the final available event/metadata record, not an invented whistle.
- **Coordinates:** percentages, x toward the opponent's goal and y toward the
  right side from that team's perspective, as defined by the source. The pitch
  uses home-right/away-left throughout. This is schematic orientation, not the
  physical direction the teams played in the stadium. No physical switch of
  ends can be inferred. Pass starts/ends are retained. Shot endpoints can encode
  goalmouth outcomes and are **not** treated as pitch destinations. Save attempts,
  goalkeeper-leaving-line/unknown types, interruptions and metadata substitutions
  are not plotted. Located duels, touches, fouls, offside and restarts may be
  selected without pretending that they are passes. Only pass arrows are drawn.
- **Missing fields:** absent locations are null, never a centre-spot fallback.
  No recipients, xG or jersey numbers are invented. Unidentified player IDs stay
  identifiable as unknown. No off-ball locations, movement trails or tracking.
- **Scoring:** event type 10 and free-kick subtypes 33/35 are attempts, including
  penalties. Goal tag 101 counts only on attempts; goalkeeper failed saves may
  carry the same tag and must not create another goal. Own-goal tag 102 credits
  the opposing team while retaining the actual actor/team. A scoring shot stays
  one event with a `scoringTeam` field, not an extra invented goal record.
- **Passes:** event type 8 only; includes crosses. Restart attempts are separate.
  Tag 1801/1802 gives known completion/failure. Missing outcome tags remain unknown.
  Forward/backward means endpoint x greater/less than start x; equal x is neither.
- **Substitutions:** actual `teamsData.*.formation.substitutions` records, with
  their source JSON path as provenance (there is no original event ID for these).
  Time is known to the minute only. Display `~67′`, reveal at the end of that
  reported minute to avoid implying exact timing, and do not plot a location.
  This conservative reveal can lag the first actual event by the entering player.
  Match metadata player `goals`/`ownGoals` fields are not used as event counts.
- **Possession:** no reliable possession IDs in these files. Do not infer possession
  time, possession percentages or uninterrupted sequences from contested duels.
  Sequence exploration shows up to eight preceding same-team, same-period recorded
  actions, stopping on interruptions/duels/team changes or gaps over 15 seconds.
  It is explicitly a recorded **passage**, not a proven possession.

## Intelligence and spoiler boundaries

The existing shot-frequency and passing-activity detector is reused with actual
team names and events. Its two equal 15-minute windows must lie in the same half;
there is no comparison during the first 30 minutes of either half. This avoids
presenting interval/period boundary effects as a tactical change. High-ball-win
and pressing claims are disabled: a duel, tackle tag or interception tag alone
does not prove a sustained recovery.

Available context: attempts, completed/attempted passes, forward/backward passing,
attacking-third pass/shot/touch activity, interception-tagged actions, named player
involvements and period counts. Interception-tagged actions are labelled literally.
Unequal partial-period totals are not rates. No trained chance quality, possession
time, continuous positions, tactical formations or causal substitution effects.

Score, event feed, pitch, candidate insights, player samples, recap facts, provider
evidence and sequence selection all use the same playback cutoff. Final scores
appear in the selector only after “Reveal final score”; the current score always
follows replay. Full data is downloaded to the browser to support seeking, so this
is a **presentation spoiler control**, not secrecy against network inspection.

Proactive notices use deterministic observations only, run during play, deduplicate
overlapping evidence by team/category, require at least three sufficiently novel
events, and have a 30-second notification cooldown. They can be dismissed and
expire after eight seconds. No proactive API calls or precomputation jobs run.

## AI operation

See [OpenAI configuration and evaluation](PHASE-6-AI.md). Historical and synthetic
modes share the Responses adapters, validated fact-selection contract, usage
store, concurrency deduplication and one-hour validated-response cache. Fan mode
uses accessible factual sentences; Analyst mode includes counts and comparison
limitations. Catch Me Up always supplies score/latest-goal/abstention context;
AI can choose supporting observations, not write unconstrained football claims.

## Deployment and hackathon separation

`HISTORICAL_MATCHES_ENABLED=false` **at build and runtime** hides the Real Match
selector and returns 404 from both historical APIs. The home page is prerendered,
so changing only the runtime setting does not remove an already-built selector.
Rebuild for a synthetic-only submission. Existing synthetic controls and Foundry
remain intact. Historical rights are independently documented above; avoid using
real-match screenshots as the synthetic hackathon demonstration. An OpenAI result
is labelled OpenAI, never Microsoft Foundry.

No hosted deployment is performed by this phase. Node standalone and Cloudflare
CI verification cover deployability. Public inference still needs the existing
shared TLS Redis usage store, operator quotas and human editorial review; offline
historical replay does not require credentials or Redis.
