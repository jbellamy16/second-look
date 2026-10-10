# Foundation delivery and validation

This sprint extends PR #12 on current `origin/main`. It preserves the synthetic
demo and the licensed public Wyscout experience, adds canonical schema 1.0.0,
retains a development-only StatsBomb adapter, and shares playback/statistics
across sources. No deployment, paid model invocation, paid data acquisition or
cloud resource creation was performed.

## Deliverables

- [Canonical contract, coordinates, time and integration](../CANONICAL-FOOTBALL.md)
- [Machine-readable structural JSON Schema](match.schema.json)
- [Per-file licenses and attribution review](../DATA-RIGHTS.md)
- [Realism benchmark and limitations](BENCHMARK.md), [full results](benchmark.json)
- [Historical replay desktop](historical-desktop.png)
- [Historical replay mobile](historical-mobile.png)
- [Evidence / Catch Me Up](historical-evidence.png)
- [Preserved synthetic demo](synthetic-desktop.png)
- [Historical replay recording](historical-replay.webm)

The public historical screenshots/recording use the CC BY 4.0 Wyscout dataset.
Data collected by Wyscout; published by Luca Pappalardo and Emanuele Massucco
(2019), [Soccer match event dataset](https://doi.org/10.6084/m9.figshare.c.4415000).
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The application adapts
event records into a canonical model and schematic replay; no endorsement implied.
No StatsBomb dataset, derived benchmark or media is included here.

## Validation

- `npm run typecheck`: passed.
- `VERIFY_LOCAL_STATSBOMB=true AI_ENABLED=false npm test`: **171 passed**;
  one Redis integration test skipped locally because no Redis test service was
  configured. CI supplies Redis and runs that test; the local-only StatsBomb
  test instead skips there. All provider calls in these tests are mocked.
- `npm run build`: production standalone build passed.
- Standalone browser suite: 96 checks across desktop, Android and iPhone-sized
  Chromium, covering source switching, score/timestamp safety, evidence, motion,
  accessibility, dark appearance, reduced motion, 320px layout and blocked
  restricted-data routes.
- Cloudflare sanitized staging build, Worker dry-run packaging and all **96**
  Worker browser checks passed. No Worker was deployed.
- `python3 scripts/import-wyscout.py .cache/wyscout`: independently checked seven
  versioned item licenses/checksums; reproduced all three committed fixtures
  byte-for-byte. Their event-derived final scores reconcile to source metadata.
- `npm run data:statsbomb`: SHA-256-pinned acquisition, complete local conversion
  and match validation passed. Every original record is retained; paired own-goal
  observations count once. Actual names, locations, periods and timestamps are
  preserved. All research files stay in ignored `.cache/statsbomb`.
- Local research browser workflow: play, pause, speed, seek, event/passage selection,
  Analyst Mode, Catch Me Up, final score and rewind passed without external AI.
- `npm run data:benchmark`: reproducible public results over three Wyscout matches,
  three preserved demo scenarios and nine balanced-profile scenario/seed pairs.

The Worker run exposed a replay-clock resampling bug under accelerated test time;
the shared clock now uses one monotonic sample per play/speed segment. The dialog
contrast check waits for entrance animations to complete before measuring text.
The final suites retain those checks rather than disabling motion or accessibility.

Reproduce public review media against a running offline server:

```sh
REVIEW_URL=http://127.0.0.1:3000 node scripts/review-foundation.mjs
```

`--local-research` writes research media only into ignored `.cache/statsbomb/review`.
The public recording is historical product evidence, not the official synthetic
hackathon demonstration. Existing hackathon submission materials are preserved.

## Practical limits and next steps

1. Expand the benchmark to a predeclared sample across teams/seasons before making
   realism claims or promoting the optional balanced profile over the demo.
2. Obtain explicit StatsBomb permissions and meet its publication requirements
   before any public/commercial distribution. The current adapter remains local.
3. Before a licensed live adapter, specify incremental updates, corrections,
   reconnection and event ordering; current adapters deliver complete snapshots.
4. Preserve versioned contracts and capability checks when adding event vocabulary,
   measured pitch dimensions or richer player-position history.
