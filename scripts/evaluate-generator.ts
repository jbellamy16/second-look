import { readFile, writeFile } from "node:fs/promises";
import { normalizeWyscout } from "../src/lib/sources/historical";
import { SyntheticMatchSource } from "../src/lib/sources/synthetic";
import { benchmarkMatch } from "../src/lib/sources/benchmark";
const manifest = JSON.parse(
  await readFile(".cache/wyscout-benchmark/selection.json", "utf8"),
);
const historical: ReturnType<typeof benchmarkMatch>[] = [];
const failures: { id: number; reason: string }[] = [];
for (const id of manifest.ids) {
  try {
    historical.push(
      benchmarkMatch(
        normalizeWyscout(
          JSON.parse(
            await readFile(`.cache/wyscout-benchmark/${id}.json`, "utf8"),
          ),
        ),
      ),
    );
  } catch (error) {
    failures.push({ id, reason: String(error) });
  }
}
const source = new SyntheticMatchSource();
const seeds = Array.from({ length: 20 }, (_, i) => 1000 + i);
const generated = (["pressure", "substitution", "quiet"] as const).flatMap(
  (scenario) =>
    seeds.map((seed) => ({
      scenario,
      seed,
      ...benchmarkMatch(source.read(scenario, { seed, profile: "balanced" })),
    })),
);
const metrics = [
  "passesPer90",
  "passCompletion",
  "meanPassReferenceMetres",
  "shotsPer90",
] as const;
function distribution(rows: ReturnType<typeof benchmarkMatch>[]) {
  return Object.fromEntries(
    metrics.map((k) => {
      const values = rows
        .flatMap((r) => (r[k] === null ? [] : [r[k]!]))
        .sort((a, b) => a - b);
      const quantile = (p: number) =>
        values.length ? values[Math.round((values.length - 1) * p)] : null;
      return [
        k,
        {
          n: values.length,
          min: quantile(0),
          p10: quantile(0.1),
          median: quantile(0.5),
          p90: quantile(0.9),
          max: quantile(1),
        },
      ];
    }),
  );
}
const report = {
  ...manifest,
  validationFailures: failures,
  syntheticSeeds: seeds,
  summary: {
    historical: distribution(historical),
    balanced: Object.fromEntries(
      ["pressure", "substitution", "quiet"].map((s) => [
        s,
        distribution(generated.filter((g) => g.scenario === s)),
      ]),
    ),
  },
  limitations: [
    "A systematic 38-fixture sample is broader than three curated references, not a representative model of all football.",
    "Held out from the previous three-fixture comparison; no generator parameters were fitted in this evaluation.",
    "Provider action definitions differ. No Wyscout possession/tracking is reconstructed.",
    "Quantiles describe match-level metrics, not goodness-of-fit or statistical significance.",
    "The curated demo remains the default. Balanced remains experimental.",
  ],
  historical,
  generated,
};
await writeFile(
  "docs/foundation/expanded-benchmark.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    { fixtures: historical.length, failures, summary: report.summary },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
