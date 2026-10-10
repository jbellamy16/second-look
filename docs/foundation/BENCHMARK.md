# Synthetic realism benchmark

Reproduce with `npm run data:benchmark`. Machine-readable distributions,
per-player involvement, per-period 15-minute attacking activity and samples are
in [benchmark.json](benchmark.json). Third-party comparisons use the CC BY 4.0
Wyscout dataset; [credit and changes](../../data/historical/LICENSE.md).

| Sample                             | Passes / 90 |   Completion | Mean reference pass distance | Shots / 90 |
| ---------------------------------- | ----------: | -----------: | ---------------------------: | ---------: |
| Original pressure demo             |         421 |       88.60% |                      12.04 m |         18 |
| Original substitution demo         |         431 |       89.10% |                      11.48 m |         19 |
| Original quiet demo                |         327 |       85.63% |                       8.16 m |          2 |
| Arsenal–Leicester                  |      770.24 |       81.22% |                      20.87 m |      31.33 |
| Liverpool–Manchester City          |      911.58 |       84.55% |                      20.40 m |      25.01 |
| Huddersfield–Manchester City       |      801.28 |       85.61% |                      18.33 m |      16.87 |
| Balanced pressure, three seeds     |     881–886 | 83.63–86.86% |                18.03–18.57 m |      13–24 |
| Balanced substitution, three seeds |     878–887 | 83.20–85.71% |                17.76–18.62 m |      14–22 |
| Balanced quiet, three seeds        |     586–592 | 82.37–85.81% |                17.97–18.44 m |        5–8 |

The original generator underproduces passes, favors short forward actions, and
has high completion. Its sparse quiet scenario is intentionally illustrative.
The optional balanced profile changes pacing, directional spread and success
probability within the same generator. It keeps deterministic seeds, player
participation, connected pass/carry/shot relationships and the shared validation
pipeline. The public UI's three default seeds remain unchanged to preserve the
hackathon story. The balanced profile is exposed through `SyntheticMatchSource`
for evaluation; it is not silently substituted for the demo.

These comparisons are descriptive, not a fitted or validated realism model.
The three recorded fixtures are a selected sample, not a representative season.
Rates divide by replay duration including stoppage and excluding the interval.
Reference distances assume 105 × 68 metres, not actual stadium dimensions.
Provider definitions differ (e.g. restart passes); event-distribution counts
cannot be interpreted as direct quality scores.

Wyscout lacks reliable possession identifiers, so sequence length is **null**.
Synthetic sequence means count pass/carry/shot actions by generated possession
and period. Player involvement counts recorded actions, not off-ball influence.
Shot-location means and activity bins are supplied in JSON, including sample sizes
where relevant; they do not measure defensive shape, pressing or player tracking.
StatsBomb's local comparison is separately stored under ignored `.cache` because
its redistribution/commercial terms are restricted.

Next: benchmark a predeclared broader selection across teams and match states,
report quantiles and variability, and evaluate the balanced profile on held-out
fixtures. Do not optimize a generator to reproduce one final or three scorelines.

## Broader held-out evaluation (October 2026)

Reproduce from the checksum-verified Figshare cache:

```
python3 scripts/prepare-benchmark-sample.py /tmp/btl-wyscout
npx tsx scripts/evaluate-generator.ts
```

The selection is fixed before reading event metrics: sort the 377 non-reference
2017–18 Premier League fixtures chronologically, take index 5 then every tenth.
This gives 38 fixtures across 18 teams, spanning the season without filtering on
scores. It is a systematic sample, not a claim of season-wide representativeness.
Balanced profiles use 20 new seeds (1000–1019) per scenario; no parameters were
adjusted using this evaluation.

37 fixtures pass canonical validation. Chelsea–Manchester City (2499781) is
rejected: the published event selection contains a failed-save goal tag but no
matching scoring action. The adapter correctly refuses to invent a goal to
reconcile the 0–1 metadata. The evaluation records this rejection and exits
nonzero to flag incomplete coverage. Do not silently substitute another fixture.
The report includes the selection and failure in
[expanded-benchmark.json](expanded-benchmark.json).

| Metric                       | Historical median (10th–90th percentile, n=37) | Balanced pressure median (10th–90th, n=20) |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------ |
| Passes / 90                  | 809.02 (687.93–1013.78)                        | 882 (865–887)                              |
| Completion                   | 83.36% (79.73–87.24%)                          | 84.29% (82.91–85.55%)                      |
| Mean reference pass distance | 20.41 m (18.56–21.79 m)                        | 18.30 m (17.63–18.68 m)                    |
| Shots / 90                   | 20.62 (15.97–25.47)                            | 20 (15–24)                                 |

Balanced improves pacing relative to the original demo, but passes remain shorter
and match-to-match pass-volume variability is much narrower. Quiet scenarios
remain deliberately sparse. These are descriptive comparisons, not a validated
realism score. The UI now offers **Balanced (experimental)** in Demo controls;
**Curated demo** remains the default. Narration reconstructs the selected profile
server-side, so explanations cannot accidentally use the other profile's events.

Third-party data: Wyscout · Pappalardo & Massucco (2019), CC BY 4.0.
The raw evaluation sample remains in ignored `.cache`; it is not a production
fixture catalog. See [attribution and transformations](../../data/historical/LICENSE.md).
