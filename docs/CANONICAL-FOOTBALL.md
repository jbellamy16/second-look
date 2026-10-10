# Unified football data foundation — schema 1.0.0

Between the Lines now loads synthetic scenarios and recorded matches through one
validated TypeScript contract. This extends the historical implementation merged
in PR #12; it does not replace its UI, seeded demonstration, Foundry integration,
or deployment targets.

## Standards reviewed and design decisions

- [SPADL](https://socceraction.readthedocs.io/en/latest/documentation/spadl.html)
  provides a useful action vocabulary: game, period, ordering, time, actor,
  start/end, action type and result. We retain those concepts, but do not reduce
  an archival event feed to on-ball actions or synthesize intermediate actions.
- [Kloppy](https://kloppy.pysport.org/user-guide/concepts/coordinates/) distinguishes
  coordinate units, origin, orientation and pitch dimensions. Its explicit
  distinction between event and tracking data informs our capability boundary.
  See also its [time model](https://kloppy.pysport.org/user-guide/concepts/time/).
- [StatsBomb Open Data](https://github.com/hudl/open-data) supplies rich identifiers,
  millisecond timing, related events, possession IDs, restart qualifiers and
  lineups. Those concepts inform the adapter; the provider payload is not our API.

We use Zod and TypeScript at runtime. No Python process, database, live feed, or
provider request is needed to serve a match. The existing Python Wyscout downloader
is an optional offline acquisition utility only.

## Contract and validation

The authoritative implementation is `src/lib/sources/model.ts`:
`matchSchema`, `normalizedEventSchema`, `validateMatch`, and `MatchSource`.
The generated structural [JSON Schema](foundation/match.schema.json) is useful to
new adapters; callers must also run `validateMatch` for cross-record invariants.

| Area          | Contract                                                                                                                                                                                                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version       | Exact `schemaVersion: "1.0.0"`; unsupported versions fail. Explicit migrations are required for breaking changes.                                                                                                                                                                   |
| Match         | ID, synthetic/historical/live kind, title, date, competition, nullable season/venue, status, replay duration, periods, final score, attribution, source URL and provenance. Current adapters serve finished matches.                                                                |
| Provenance    | Provider, original match ID, adapter version, revision/seed, license URL, redistribution status and preserved metadata.                                                                                                                                                             |
| Teams         | Stable source identifiers plus actual names, short display names, accessible display colors, starting lineup, bench, formation when recorded. Colors for real teams are application display colors, not claims about club kits.                                                     |
| Players       | Stable IDs, source IDs, names, nullable shirt numbers, known role or explicit `Unavailable`, and team association. Original source position histories remain in raw metadata.                                                                                                       |
| Event         | Unique ID, match ID, deterministic zero-based order, time, period-relative seconds, team ID, nullable actor ID, type, nullable location, optional endpoint/result/xG, possession ID or null, qualifiers, related-event references, statistical metadata and complete source record. |
| Substitution  | `actorId` and `outgoingId` identify the outgoing player; the legacy `playerId` identifies the incoming player. Lineup participation changes only at the recorded/reveal time.                                                                                                       |
| Goals         | `scoringTeam` is authoritative. A scoring shot remains one shot. The demo's existing separate goal marker links to its shot, and only that marker credits the score. Own goals credit the opponent. Shootout events do not alter the match score.                                   |
| Unknown types | Retained as `other`, with source type and full raw metadata. No invented replacement actions.                                                                                                                                                                                       |

`harbor` and `riverside` are compatibility **home/away display slots**, not provider
identities. Every event also has `teamId`; the actual identities and names are
in match metadata. Wyscout player IDs preserve the published identifiers;
StatsBomb player IDs are namespaced. Cross-match storage should key IDs with
`provenance.provider`, not assume unrelated providers share an ID namespace.
Legacy `playerId: "0"` means unavailable; canonical `actorId` is null.

Validation rejects duplicate IDs, incorrect order, time outside a period/match,
inconsistent period offsets, unknown actors/recipients, cross-team associations,
invalid lineups/substitution participation, dangling related-event references,
unsupported xG/possession claims, invalid coordinates, and unreconciled final scores.
Preserved `source.raw` data is not substituted for validated canonical fields.

## Coordinates and rendering

All canonical locations are percentages on a 100 × 100 standardized rectangle.
The origin is the top-left corner **in the action-executing team's attacking
frame**; x increases toward its opponent's goal, y increases downward.

- Synthetic and Wyscout percentages use the identity transform.
- StatsBomb 120 × 80 locations use x / 120 × 100 and y / 80 × 100.
- Each record preserves original start/end arrays, including shot height when
  present, and a versioned transform identifier. Out-of-bounds StatsBomb coordinates
  remain in the original record and have no canonical plotted point; no clamping.
- Rendering uses home-right / away-left in every period. Away points rotate 180°:
  `(100-x, 100-y)`. SVG projection is `(50+9*x, 45+5.5*y)`.
- This is a stable schematic orientation. None of these adapters establishes
  stadium direction; halftime does not imply an invented physical switch of ends.
  A future provider with physical direction must normalize at its adapter boundary.
- Reference distances use 105 × 68 metres **only as a comparison convention**.
  These are not measured distances on the original stadium pitch.
- Historical replay draws recorded action locations and pass connections. It does
  not animate inferred ball travel, player movement or continuous tracking.
  Shot endpoints and StatsBomb freeze frames remain in original metadata rather
  than being turned into trajectories or fabricated off-ball positions.

## Time and event relationships

`time` is monotonic replay time, excluding the halftime interval, retaining
stoppage. `periodSeconds` preserves the source precision. `periods` supports 1H,
2H, E1, E2 and PS. Display clocks reset to the appropriate nominal clock start;
stoppage is shown as `45+mm:ss`, `90+mm:ss`, etc. Equal timestamps retain provider
index order (or original Wyscout array order). Selection cannot include an event
with a greater order than the selected record.

Wyscout has no recorded kickoff/whistle events: its second-half offset is one
second after the ceiling of the last first-half event, and at least 2700. The
replay ends at the final available event/metadata time. No whistles are invented.
Substitutions are known only to a minute: preserve `reportedMinute` and reveal
at that minute's end. This conservative reveal may follow an entering player's
first recorded action. Player activity at sub-minute precision is not asserted.

StatsBomb uses period-relative millisecond timestamps and actual period transition
records. Its next period begins 0.001 replay seconds after the ceiling of the
previous period's final timestamp. A complete import requires both start and end
records for each supplied period. Own Goal For/Against pairs remain intact, but
only Own Goal Against credits a goal. Source indexes and related IDs are retained.

Wyscout has no reliable possession IDs in this dataset. Its sequence UI shows a
bounded same-team passage, stopping on contested/interrupted play, not a proven
possession. StatsBomb uses its recorded possession ID, period, team and selection
cutoff; opposing defensive events can share that possession ID. Synthetic sequence
IDs are generated deterministically. None is converted into possession time.

## Source interface and application integration

`MatchSource.load(id): Promise<MatchData>` is implemented by `SyntheticMatchSource`,
`WyscoutMatchSource` (the explicit alias of the existing `HistoricalMatchSource`),
and `StatsBombMatchSource`. Source selection resolves fixtures in the server
repository. Provider interpretation stays inside adapters.

Both interfaces use the same `useMatchPlayback` clock, `Pitch`, calculation engine,
pattern detector, evidence projection, ranking and AI service. `matchInsights`,
`matchSequence`, `matchStatistics` and `matchEvidence` accept canonical data.
Existing synthetic commentary keeps its specialized presentation wording and
preferences via the compatible `buildEvidence` composer; it consumes validated
canonical projections and the same statistics/detector/evidence transport.
Historical compatibility names remain exported to avoid breaking consumers.

`calculateStatistics` is the single calculation implementation. The legacy
synthetic `statistics()` and historical statistics adapter both delegate to it.
`matchStatistics` applies source capability checks and the requested cutoff:
unsupported xG, on-target, recovery and high-win counts return null, as does pass
accuracy when all outcomes are unknown. Missing xG on any shot makes total xG
unavailable. Possession percentage is always unavailable in this sprint.

Historical comparison windows must lie in one period. The synthetic demo retains
its deliberately continuous comparison scope, preserving its existing 63:24
story despite its nominal period clock. High-ball-win detection requires an
explicit capability; both recorded providers disable that claim rather than
interpret a failed duel or interception as a sustained recovery.

OpenAI, Microsoft Foundry and offline fallback retain their structured fact
selection, tool calling, factual validation, rate/usage controls and attribution.
Both evidence composers send compact event references, never complete raw records,
full-match metadata, future outcomes or source payloads. Restricted research data
cannot trigger external AI through the research route. This sprint made no paid
model requests and does not claim new live Foundry verification.

## Generator and benchmarks

The default `SyntheticMatchSource.read(scenario)` preserves all three original
seeded scenarios. Its optional `{seed, profile: "balanced"}` parameter uses the
same generator with shorter action/restart gaps, a wider pass-distance distribution,
more failed passes and moderated shot probability. This is an opt-in analytical
profile; the official demo remains unchanged.

Run `npm run data:benchmark`. Public results and caveats are in
[the benchmark report](foundation/BENCHMARK.md) and [JSON](foundation/benchmark.json).
The optional `--local-statsbomb` comparison writes only into ignored `.cache`.

## Rights and deployment

[Dataset rights](DATA-RIGHTS.md) records the independent per-file review.
Three Wyscout fixtures are available in Real Match by default. No club crests,
player photos, league artwork or broadcast media were added. Third-party source
records live separately under `data/historical`, with their own license notice.

StatsBomb originals, canonical fixture and derived research output stay in ignored
`.cache/statsbomb`. They are never imported statically into a production bundle.
`npm run data:statsbomb` verifies pinned SHA-256 checksums and validates a complete
fixture. For local inspection only:

```sh
npm run data:statsbomb
AI_ENABLED=false STATSBOMB_RESEARCH_ENABLED=true npm run dev -- --hostname 127.0.0.1
```

The production runtime rejects this fixture even if that flag is set. The local
catalog adds it only after a successful validated import. Builds do not download
data. Cloudflare's existing sanitized staging build copies only the licensed
`data/historical` directory. Azure's existing standalone preparation is preserved.

The synthetic-only hackathon build still uses `HISTORICAL_MATCHES_ENABLED=false`
at build and runtime. Dataset permission does not waive the competition's
synthetic-data requirement. Keep the existing submission materials and synthetic
recording separate from historical product evidence.

## Next adapters

Implement `MatchSource`, preserve source IDs/metadata, declare capabilities,
normalize coordinates/time once, and pass `validateMatch`. Add contract fixtures
with missing data, goals/own goals, substitutions, ties and period transitions.
A licensed live feed will additionally need incremental ordering, correction and
reconnection policies; none is integrated or purchased here. Before promoting
the balanced generator, evaluate a wider league/season sample and statistical
uncertainty rather than optimize toward one match.

## Shared match experience

Both source experiences use `MatchShell` for Match centre, Insights, Match stats,
Lineups, Player focus and Settings. Source switching retains the section and each
source's replay state; background playback is suspended. Preferences and appearance
synchronize on this device. Statistics share a capability-aware comparison view;
unavailable metrics never become fabricated zeroes.

Pitch views explicitly separate recent actions (last 60 seconds, up to ten records),
pattern evidence and passage playback. Dense patterns aggregate counts into pitch
areas with responsive cell sizes; records remain individually selectable. Coincident
events share a selectable count at the actual location. Numbers identify event order
or area counts, never inferred player positions. Goal emphasis follows `scoringTeam`,
including own goals, instead of requiring a provider-specific `goal` event type.

Historical passages are chronological context: up to twelve records in the thirty
seconds preceding the selection, bounded by its period, order and viewer cutoff.
They may include both teams, duels, stoppages and unlocated records. They do not assert
continuous possession. The shared replay controls preserve real timestamps and allow
individual record stepping; historical playback does not interpolate ball or player
motion. Synthetic endpoint interpolation remains labeled schematic generated motion.

Historical insight comparisons retain two complete windows within one half. When no
trend qualifies, both sources share recorded match context: goals, recent attempts or
substitutions, then shot or pass totals with inspectable evidence. Match centre,
Insights and Catch Me Up use this hierarchy from kickoff without weakening comparison
thresholds. The curated synthetic narrative retains its explicitly labeled continuous
comparison scope; benchmark activity bins remain period aware for both sources.
