import { afterEach, expect, it, vi } from "vitest";
import captured from "../eval/fixtures/openai-2026-10-09.json";
import { buildEvidence } from "../src/lib/ai/evidence";
import { composeNarration, renderSelection } from "../src/lib/ai/narration";
import { generateMatch, statistics, eventsAt } from "../src/lib/match";
import { configure, mockProvider } from "./ai-helpers";
const events = generateMatch("pressure");
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it.each(captured.rows)(
  "replays captured $mode selection with mandatory context and bounded output",
  async (row) => {
    const mode = row.mode as "fan" | "analyst";
    const packet = buildEvidence(events, captured.time, mode);
    configure();
    vi.stubGlobal("fetch", mockProvider(packet, row.selection));
    const result = await composeNarration(packet, "openai");
    expect(result.contextFactIds).toEqual([
      "score",
      "moment-pressure-202632-7",
    ]);
    expect(result.modelFactIds).toEqual([
      "harbor-pressure-63",
      "harbor-chances-63",
    ]);
    expect(result.selectedFactIds).toHaveLength(4);
    expect(result.narrative.explanation).toContain("Arlo Hayes");
    expect(result.narrative.explanation).toContain("1–0");
    expect(result.narrative.explanation).toContain(
      mode === "fan" ? "won the ball 4 times" : "4 high ball wins",
    );
    expect(statistics(eventsAt(events, captured.time)).harbor.goals).toBe(1);
    expect(
      result.narrative.evidenceIds.every((id) =>
        events.some((e) => e.id === id && e.time <= captured.time),
      ),
    ).toBe(true);
    expect(result.validation).toContain(
      "Required match context supplied by server",
    );
  },
);
it("a model can abstain but cannot suppress score, goal or evidence limitations", () => {
  const quiet = buildEvidence(generateMatch("quiet"), 0, "analyst");
  expect(renderSelection({ factIds: [] }, quiet).selectedFactIds).toEqual([
    "score",
    "no-pattern",
  ]);
  const pressure = buildEvidence(events, captured.time, "fan");
  expect(renderSelection({ factIds: [] }, pressure).selectedFactIds).toEqual([
    "score",
    "moment-pressure-202632-7",
  ]);
});
it("captured selections cannot leak later facts into an earlier timestamp", () => {
  const beforeGoal = buildEvidence(events, 0, "fan");
  expect(() => renderSelection(captured.rows[0].selection, beforeGoal)).toThrow(
    "Unsupported claim",
  );
  expect(
    renderSelection({ factIds: [] }, beforeGoal).narrative.explanation,
  ).not.toContain("Arlo Hayes");
});
