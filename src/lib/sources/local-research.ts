import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { validateMatch } from "./model";
import type { Fixture } from "./catalog";
export const researchEnabled = () =>
  process.env.NODE_ENV === "development" &&
  process.env.STATSBOMB_RESEARCH_ENABLED === "true";
export async function loadResearchMatch(id: string) {
  if (!researchEnabled() || id !== "statsbomb-8658")
    throw new Error("Research fixture disabled");
  const match = validateMatch(
    JSON.parse(
      await readFile(
        join(process.cwd(), ".cache/statsbomb/8658.canonical.json"),
        "utf8",
      ),
    ),
  );
  if (match.id !== id || match.provenance.redistribution !== "restricted")
    throw new Error("Research fixture mismatch");
  return match;
}
export async function researchFixtures(): Promise<Fixture[]> {
  if (!researchEnabled()) return [];
  try {
    const m = await loadResearchMatch("statsbomb-8658");
    return [
      {
        id: m.id,
        title: m.title,
        date: m.date!,
        competition: `${m.competition} · ${m.season}`,
        provider: "StatsBomb · local research only",
      },
    ];
  } catch {
    return [];
  }
}
