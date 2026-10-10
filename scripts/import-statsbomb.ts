/** Offline acquisition only. Serving a replay never calls a provider. */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { normalizeStatsBomb } from "../src/lib/sources/statsbomb";
export const revision = "4b73468fc5b0f1950f9f66fada70ad3a4f9327cb";
const root = new URL("../.cache/statsbomb/", import.meta.url);
const paths = {
  competitions: "data/competitions.json",
  matches: "data/matches/43/3.json",
  events: "data/events/8658.json",
  lineups: "data/lineups/8658.json",
};
await mkdir(root, { recursive: true });
const manifest = JSON.parse(
  await readFile(
    new URL("../data/statsbomb-manifest.json", import.meta.url),
    "utf8",
  ),
) as { revision: string; files: Record<string, string> };
if (manifest.revision !== revision) throw new Error("Revision mismatch");
const records: Record<string, unknown> = {};
for (const [key, path] of Object.entries(paths)) {
  const url = `https://raw.githubusercontent.com/hudl/open-data/${revision}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${path} (${res.status})`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== manifest.files[path])
    throw new Error(`Checksum mismatch: ${path}`);
  records[key] = JSON.parse(bytes.toString());
}
const competitions = records.competitions as {
  competition_id: number;
  season_id: number;
}[];
if (!competitions.some((c) => c.competition_id === 43 && c.season_id === 3))
  throw new Error("Competition missing");
const match = (records.matches as { match_id: number }[]).find(
  (m) => m.match_id === 8658,
);
const input = {
  match,
  events: records.events,
  lineups: records.lineups,
  revision,
};
const canonical = normalizeStatsBomb(input);
await writeFile(new URL("8658.raw.json", root), JSON.stringify(input));
await writeFile(
  new URL("8658.canonical.json", root),
  JSON.stringify(canonical),
);
console.log(
  `Validated ${canonical.events.length} original records, ${canonical.players.length} players and ${canonical.periods.length} periods. Score reconciled. Saved to ignored .cache/statsbomb/; no distribution rights granted.`,
);
