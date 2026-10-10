import { mkdir, readFile, writeFile } from "node:fs/promises";
import { SyntheticMatchSource } from "../src/lib/sources/synthetic";
import { normalizeWyscout } from "../src/lib/sources/historical";
import { normalizeStatsBomb } from "../src/lib/sources/statsbomb";
import { benchmarkMatch } from "../src/lib/sources/benchmark";
const source = new SyntheticMatchSource();
const synthetic = ["pressure", "substitution", "quiet"].map((id) =>
  benchmarkMatch(source.read(id)),
);
const balanced = ["pressure", "substitution", "quiet"].flatMap((id) =>
  [42, 99, 2026].map((seed) => ({
    ...benchmarkMatch(source.read(id, { seed, profile: "balanced" })),
    profile: "balanced",
    seed,
  })),
);
const historical = await Promise.all(
  ["2499719", "2499943", "2499841"].map(async (id) =>
    benchmarkMatch(
      normalizeWyscout(
        JSON.parse(await readFile(`data/historical/${id}.json`, "utf8")),
      ),
    ),
  ),
);
await mkdir("docs/foundation", { recursive: true });
await writeFile(
  "docs/foundation/benchmark.json",
  JSON.stringify(
    {
      synthetic,
      balanced,
      historical,
      limitations: [
        "Three selected matches are an exploratory reference, not a representative training set.",
        "Wyscout possession sequence lengths are unavailable; possession is not inferred.",
        "Pass distances use a standardized 105x68 reference pitch, not measured physical distances.",
        "Counts depend on provider event definitions. Rates include stoppage time, exclude the interval.",
        "Public results use CC BY 4.0 Wyscout data: see data/historical/LICENSE.md.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.table(
  [...synthetic, ...balanced, ...historical].map(
    ({
      id,
      passesPer90,
      passCompletion,
      meanPassReferenceMetres,
      shotsPer90,
    }) => ({
      id,
      passesPer90,
      passCompletion,
      meanPassReferenceMetres,
      shotsPer90,
    }),
  ),
);
if (process.argv.includes("--local-statsbomb")) {
  const match = normalizeStatsBomb(
    JSON.parse(await readFile(".cache/statsbomb/8658.raw.json", "utf8")),
  );
  await writeFile(
    ".cache/statsbomb/benchmark.json",
    JSON.stringify(benchmarkMatch(match), null, 2),
  );
  console.log(
    "StatsBomb comparison saved locally only; not included in public results.",
  );
}
