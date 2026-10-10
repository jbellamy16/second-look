import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { pitchGroups } from "../src/lib/sources/replay-view";
import { normalizeWyscout } from "../src/lib/sources/historical";
import { historicalSequence } from "../src/lib/sources/intelligence";
import { pitchEvents } from "../src/lib/sources/model";
import { SyntheticMatchSource } from "../src/lib/sources/synthetic";
const raw = JSON.parse(readFileSync("data/historical/2499841.json", "utf8"));
const match = normalizeWyscout(raw);
describe("honest event presentation", () => {
  it("conserves every event when turning 161 pass arrows into area counts", () => {
    const cutoff = match.secondHalfStart + 2100;
    const passes = pitchEvents(
      match.events.filter(
        (e) =>
          e.time <= cutoff &&
          e.time > cutoff - 900 &&
          e.team === "riverside" &&
          e.type === "pass",
      ),
    );
    expect(passes).toHaveLength(161);
    const cells = pitchGroups(passes, true);
    expect(cells.length).toBeLessThan(100);
    expect(cells.flatMap((c) => c.events.map((e) => e.id)).sort()).toEqual(
      passes.map((e) => e.id).sort(),
    );
    for (const cell of cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.x).toBeLessThanOrEqual(90);
    }
  });
  it("groups opposing duel records at the same location without moving their coordinates", () => {
    const events = pitchEvents(
      match.events.filter((e) => e.time <= 3853 && e.time > 3793),
    );
    const before = JSON.stringify(events);
    const groups = pitchGroups(events, false);
    expect(
      groups.some((g) => new Set(g.events.map((e) => e.team)).size === 2),
    ).toBe(true);
    expect(JSON.stringify(events)).toBe(before);
    expect(groups.reduce((n, g) => n + g.events.length, 0)).toBe(events.length);
  });
  it("includes both sides of a contested passage, never a future action or earlier half", () => {
    const selected = match.events.findLast((e) => e.time <= 3853)!;
    const passage = historicalSequence(match, selected, 3853);
    expect(passage.length).toBeLessThanOrEqual(12);
    expect(passage.at(-1)?.id).toBe(selected.id);
    expect(new Set(passage.map((e) => e.team)).size).toBe(2);
    expect(
      passage.every(
        (e) =>
          e.period === selected.period &&
          e.order <= selected.order &&
          e.time >= selected.time - 30,
      ),
    ).toBe(true);
    expect(passage.every((e) => e.possessionId === null)).toBe(true);
  });
  it("keeps generated possession sequences distinct from chronological historical passages", () => {
    const synthetic = new SyntheticMatchSource().read("pressure");
    const selected = synthetic.events.findLast(
      (e) => e.time <= 3804 && e.type === "shot",
    )!;
    const passage = historicalSequence(synthetic, selected, 3804);
    expect(
      passage.every(
        (e) =>
          e.possessionId === selected.possessionId && e.team === selected.team,
      ),
    ).toBe(true);
  });
});
