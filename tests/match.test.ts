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

for (const scenario of Object.keys(SCENARIOS) as Scenario[])
  it(`${scenario}: actions stay connected, active and bounded across multiple seeds`, () => {
    for (const seed of [SCENARIOS[scenario].seed, 42, 99, 2026]) {
      const events = generateMatch(scenario, seed);
      for (const [index, event] of events.entries()) {
        const prior = events[index - 1];
        for (const point of [event.position, event.end].filter(Boolean)) {
          expect(point!.x).toBeGreaterThanOrEqual(0);
          expect(point!.x).toBeLessThanOrEqual(100);
          expect(point!.y).toBeGreaterThanOrEqual(0);
          expect(point!.y).toBeLessThanOrEqual(100);
        }
        if (event.type !== "substitution")
          expect(
            activePlayers(events.slice(0, index + 1), event.team).map(
              (p) => p.id,
            ),
          ).toContain(event.playerId);
        if (event.type === "carry") {
          expect(prior.type).toBe("pass");
          expect(prior.success).toBe(true);
          expect(event.position).toEqual(prior.end);
          expect(event.playerId).toBe(prior.recipientId);
          expect(
            Math.hypot(
              event.end!.x - event.position.x,
              event.end!.y - event.position.y,
            ),
          ).toBeLessThanOrEqual(9);
        }
        if (event.type === "shot") {
          expect(prior.type).toBe("carry");
          expect(event.position).toEqual(prior.end);
          expect(event.playerId).toBe(prior.playerId);
          expect(event.end!.x).toBe(100);
          expect(event.xg).toBeGreaterThanOrEqual(0.02);
          expect(event.xg).toBeLessThanOrEqual(0.42);
          if (event.outcome === "goal") {
            expect(events[index + 1]?.type).toBe("goal");
            expect(events[index + 1]?.time).toBe(event.time);
          }
        }
        if (
          event.type === "pass" &&
          prior?.type === "pass" &&
          prior.possessionId === event.possessionId
        ) {
          expect(prior.success).toBe(true);
          expect(event.position).toEqual(prior.end);
          expect(event.playerId).toBe(prior.recipientId);
        }
        if (event.type === "possession") {
          const last = events
            .slice(0, index)
            .findLast((e) => e.type !== "substitution");
          if (last?.type === "pass" && !last.success) {
            expect(event.position.x).toBeCloseTo(100 - last.end!.x);
            expect(event.position.y).toBeCloseTo(100 - last.end!.y);
          }
          if (last?.type === "foul") {
            expect(event.team).not.toBe(last.team);
            expect(event.position.x).toBeCloseTo(100 - last.position.x);
            expect(event.position.y).toBeCloseTo(100 - last.position.y);
            expect(events[index + 1]?.type).toBe("pass");
          }
          if (events[index + 1]?.type === "corner") {
            expect(last?.type).toBe("shot");
            expect(last?.outcome).toBe("saved");
            expect(event.team).toBe(last?.team);
            expect(events[index + 2]?.type).toBe("pass");
          }
          if (!last || last.type === "goal") {
            expect(event.position).toEqual({ x: 50, y: 50 });
            expect(events[index + 1]?.type).toBe("pass");
          }
        }
      }
    }
  });

it("recap does not list a scoring shot twice and has a full-time conclusion", () => {
  const events = generateMatch("pressure");
  const summary = recap(events, DURATION, "fan");
  expect(
    summary.moments.some(
      (m) => m.event.type === "shot" && m.event.outcome === "goal",
    ),
  ).toBe(false);
  expect(summary.watch).toContain("Full time");
});
