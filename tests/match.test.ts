import { describe, expect, it } from "vitest";
import {
  activePlayers,
  DURATION,
  DEMO_TIME,
  eventsAt,
  generateMatch,
  PLAYERS,
  SCENARIOS,
  Scenario,
  statistics,
} from "../src/lib/match";
import { detectInsights, recap } from "../src/lib/intelligence";
import { validateNarrative } from "../src/lib/foundry";
for (const scenario of Object.keys(SCENARIOS) as Scenario[])
  describe(scenario, () => {
    const events = generateMatch(scenario);
    it("is reproducible, chronological, and uniquely identified", () => {
      expect(generateMatch(scenario)).toEqual(events);
      expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
      expect(events.length).toBeGreaterThan(300);
      events.forEach((e, i) => {
        expect(e.time).toBeGreaterThanOrEqual(i ? events[i - 1].time : 0);
        expect(e.time).toBeLessThanOrEqual(DURATION);
        expect(PLAYERS.find((p) => p.id === e.playerId)?.team).toBe(e.team);
        expect(e.position.x).toBeGreaterThanOrEqual(0);
        expect(e.position.x).toBeLessThanOrEqual(100);
      });
    });
    it("keeps passes within the active lineup and records a shot for every goal", () => {
      events.forEach((e, i) => {
        if (e.type === "pass") {
          expect(
            activePlayers(events.slice(0, i + 1), e.team).map((p) => p.id),
          ).toContain(e.playerId);
          expect(
            activePlayers(events.slice(0, i + 1), e.team).map((p) => p.id),
          ).toContain(e.recipientId);
          expect(e.recipientId).not.toBe(e.playerId);
        }
        if (e.type === "goal") {
          expect(events[i - 1].type).toBe("shot");
          expect(events[i - 1].outcome).toBe("goal");
          expect(events[i - 1].playerId).toBe(e.playerId);
        }
      });
    });
    it("uses only the viewed prefix for statistics, insights, and recap", () => {
      for (const t of [0, 720, 1800, DEMO_TIME, 4900]) {
        const visible = eventsAt(events, t),
          stats = statistics(visible);
        expect(stats.harbor.goals + stats.riverside.goals).toBe(
          visible.filter((e) => e.type === "goal").length,
        );
        expect(detectInsights(events, t)).toEqual(detectInsights(visible, t));
        for (const mode of ["fan", "analyst"] as const)
          expect(recap(events, t, mode)).toEqual(recap(visible, t, mode));
        for (const insight of detectInsights(events, t)) {
          const evidence = visible.filter((e) =>
            insight.evidenceIds.includes(e.id),
          );
          expect(evidence.length).toBe(insight.current);
          expect(
            evidence.every((e) => e.time > insight.start && e.time <= t),
          ).toBe(true);
          expect(
            visible.filter((e) => insight.baselineIds.includes(e.id)).length,
          ).toBe(insight.previous);
        }
      }
    });
  });
it("discovers more patterns in pressure than in a quiet game without scenario-specific insight rules", () => {
  const pressure = detectInsights(generateMatch("pressure"), DEMO_TIME),
    quiet = detectInsights(generateMatch("quiet"), DEMO_TIME);
  console.log(
    "Demo observations:",
    pressure.map((i) => `${i.headline}: ${i.current}/${i.previous}`),
  );
  expect(pressure.some((i) => i.category === "pressure")).toBe(true);
  expect(pressure.length).toBeGreaterThan(quiet.length);
  expect(detectInsights([], DEMO_TIME)).toEqual([]);
});
it("validates Foundry references and rejects invented numerical claims", () => {
  const insight = detectInsights(generateMatch("pressure"), DEMO_TIME)[0];
  const valid = {
    insightId: insight.id,
    explanation: "Harbor are winning the ball closer to goal.",
    why: "This can shorten their route to a chance.",
    watch: "Watch whether the next recovery leads to a shot.",
    evidenceIds: insight.evidenceIds,
  };
  expect(validateNarrative(valid, insight)).toEqual(valid);
  expect(() =>
    validateNarrative({ ...valid, evidenceIds: ["fabricated"] }, insight),
  ).toThrow();
  expect(() =>
    validateNarrative(
      { ...valid, explanation: "They created 99 shots." },
      insight,
    ),
  ).toThrow();
});
