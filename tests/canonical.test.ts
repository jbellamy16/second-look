import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { SyntheticMatchSource } from "../src/lib/sources/synthetic";
import { normalizeWyscout } from "../src/lib/sources/historical";
import {
  normalizeStatsBomb,
  timestampSeconds,
  StatsBombMatchSource,
} from "../src/lib/sources/statsbomb";
import {
  validateMatch,
  matchClock,
  periodAt,
  recordedScore,
  pitchEvents,
  activeMatchPlayers,
  type MatchData,
} from "../src/lib/sources/model";
import {
  normalizePoint,
  displayPoint,
  referenceDistance,
} from "../src/lib/sources/coordinates";
import { matchStatistics } from "../src/lib/sources/analytics";
import {
  matchEvidence,
  matchInsights,
  matchSequence,
} from "../src/lib/sources/intelligence";
import { benchmarkMatch } from "../src/lib/sources/benchmark";
import { playbackTime, replayFrame } from "../src/lib/playback";
import { composeNarration } from "../src/lib/ai/narration";
import { configure, mockProvider } from "./ai-helpers";
import {
  loadResearchMatch,
  researchFixtures,
} from "../src/lib/sources/local-research";

// Author-created contract data. These names, IDs and actions are not StatsBomb assets.
function contractFixture() {
  const named = (id: number, name: string) => ({ id, name });
  const north = named(1, "Example North"),
    south = named(2, "Example South");
  const p1 = named(11, "Example Starter"),
    p2 = named(12, "Example Substitute"),
    p3 = named(21, "Example Defender");
  const records = [
    {
      type: named(35, "Starting XI"),
      tactics: {
        formation: 442,
        lineup: [
          { player: p1, position: named(23, "Forward"), jersey_number: 9 },
        ],
      },
    },
    {
      team: south,
      type: named(35, "Starting XI"),
      tactics: {
        formation: 433,
        lineup: [
          { player: p3, position: named(3, "Defender"), jersey_number: 4 },
        ],
      },
    },
    { type: named(18, "Half Start") },
    {
      type: named(30, "Pass"),
      player: p1,
      timestamp: "00:00:10.125",
      location: [60, 40],
      pass: { end_location: [84, 20], recipient: p1 },
      possession: 1,
    },
    {
      type: named(25, "Own Goal For"),
      timestamp: "00:10:00.000",
      related_events: ["record-6"],
    },
    {
      team: south,
      type: named(20, "Own Goal Against"),
      player: p3,
      timestamp: "00:10:00.000",
      location: [5, 42],
      related_events: ["record-5"],
    },
    { type: named(34, "Half End"), timestamp: "00:47:00.000" },
    { type: named(18, "Half Start"), period: 2 },
    {
      type: named(19, "Substitution"),
      period: 2,
      timestamp: "00:01:00.010",
      player: p1,
      substitution: { replacement: p2 },
    },
    {
      type: named(16, "Shot"),
      period: 2,
      timestamp: "00:02:00.250",
      player: p2,
      location: [100, 40],
      shot: {
        outcome: named(97, "Goal"),
        statsbomb_xg: 0.3,
        end_location: [120, 40, 1],
      },
      possession: 2,
    },
    {
      type: named(24, "Bad Behaviour"),
      period: 2,
      timestamp: "00:03:00.000",
      player: p2,
      bad_behaviour: { card: named(65, "Yellow Card") },
    },
    { type: named(34, "Half End"), period: 2, timestamp: "00:48:00.000" },
  ];
  return {
    revision: "author-created-contract-test",
    match: {
      match_id: 123,
      match_date: "2020-01-01",
      competition: { competition_id: 1, competition_name: "Example Cup" },
      season: { season_id: 1, season_name: "2020" },
      home_team: { home_team_id: 1, home_team_name: north.name },
      away_team: { away_team_id: 2, away_team_name: south.name },
      home_score: 2,
      away_score: 0,
    },
    events: records.map((e, i) => ({
      id: `record-${i + 1}`,
      index: i + 1,
      period: 1,
      timestamp: "00:00:00.000",
      minute: 0,
      second: 0,
      team: north,
      ...e,
    })),
    lineups: [
      {
        team_id: 1,
        team_name: north.name,
        lineup: [
          { player_id: 11, player_name: p1.name, jersey_number: 9 },
          { player_id: 12, player_name: p2.name, jersey_number: 17 },
        ],
      },
      {
        team_id: 2,
        team_name: south.name,
        lineup: [{ player_id: 21, player_name: p3.name, jersey_number: 4 }],
      },
    ],
  };
}
const synthetic = new SyntheticMatchSource();
const historical = normalizeWyscout(
  JSON.parse(readFileSync("data/historical/2499719.json", "utf8")),
);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("canonical invariants", () => {
  const match = synthetic.read("pressure");
  it.each([
    [
      "version",
      (m: MatchData) => {
        (m as unknown as { schemaVersion: string }).schemaVersion = "2.0.0";
      },
    ],
    [
      "order",
      (m: MatchData) => {
        m.events[1].order = 99;
      },
    ],
    [
      "match",
      (m: MatchData) => {
        m.events[0].matchId = "other";
      },
    ],
    [
      "team",
      (m: MatchData) => {
        m.events[0].teamId = "other";
      },
    ],
    [
      "player",
      (m: MatchData) => {
        m.events[0].actorId = "nonexistent";
      },
    ],
    [
      "association",
      (m: MatchData) => {
        m.events[0].playerId =
          m.events[0].team === "harbor" ? "riverside-1" : "harbor-1";
        m.events[0].actorId = m.events[0].playerId;
      },
    ],
    [
      "period",
      (m: MatchData) => {
        m.events[0].periodSeconds += 1;
      },
    ],
    [
      "score",
      (m: MatchData) => {
        m.finalScore.harbor += 1;
      },
    ],
    [
      "related",
      (m: MatchData) => {
        m.events[0].relatedEvents = ["missing"];
      },
    ],
    [
      "lineup",
      (m: MatchData) => {
        m.teams.harbor.lineup.push("missing");
      },
    ],
    [
      "unsupported xG",
      (m: MatchData) => {
        m.capabilities.xg = false;
      },
    ],
    [
      "duplicate",
      (m: MatchData) => {
        m.events[1].id = m.events[0].id;
      },
    ],
  ] as const)("rejects corrupt %s", (_, mutate) => {
    const copy = structuredClone(match);
    mutate(copy);
    expect(() => validateMatch(copy)).toThrow();
  });
  it("preserves source records and nullable capabilities", () => {
    const first = historical.events[0];
    expect(first.source.raw).toHaveProperty("positions");
    expect(first.source.coordinates.transform).toBe("identity-percent-v1");
    expect(
      matchStatistics(historical, historical.duration).harbor.xg,
    ).toBeNull();
    expect(matchStatistics(historical, 0).harbor.accuracy).toBeNull();
    expect(benchmarkMatch(historical).meanSequenceActions).toBeNull();
  });
  it("all demo seeds are stable; balanced profile remains deterministic across seeds", () => {
    for (const id of ["pressure", "substitution", "quiet"]) {
      expect(synthetic.read(id)).toEqual(synthetic.read(id));
      for (const seed of [42, 99, 2026])
        expect(synthetic.read(id, { seed, profile: "balanced" })).toEqual(
          synthetic.read(id, { seed, profile: "balanced" }),
        );
    }
    expect(
      benchmarkMatch(
        synthetic.read("pressure", { profile: "balanced", seed: 42 }),
      ).passesPer90,
    ).toBeGreaterThan(benchmarkMatch(match).passesPer90);
  });
});
describe("StatsBomb adapter without redistributed assets", () => {
  it("preserves every record, outcome, original ID and fractional timestamp", async () => {
    const input = contractFixture(),
      m = await new StatsBombMatchSource(async () => input).load("123");
    expect(m.events).toHaveLength(input.events.length);
    const pass = m.events.find((e) => e.type === "pass")!;
    expect(pass.source.eventId).toBe("record-4");
    expect(pass.time).toBe(10.125);
    expect(pass.position).toEqual({ x: 50, y: 50 });
    expect(pass.end).toEqual({ x: 70, y: 25 });
    expect(pass.success).toBe(true);
    expect(pass.source.raw).toEqual(input.events[3]);
    expect(recordedScore(m.events)).toEqual({ harbor: 2, riverside: 0 });
    expect(m.events.filter((e) => e.scoringTeam)).toHaveLength(2);
    expect(m.events.find((e) => e.type === "shot")!.end).toBeUndefined();
    expect(
      m.events.find((e) => e.type === "shot")!.source.coordinates.end,
    ).toEqual([120, 40, 1]);
  });
  it("preserves exact substitution time and actor; updates only then", () => {
    const m = normalizeStatsBomb(contractFixture()),
      sub = m.events.find((e) => e.type === "substitution")!;
    expect(sub.position).toBeNull();
    expect(sub.actorId).toBe("statsbomb-player-11");
    expect(sub.playerId).toBe("statsbomb-player-12");
    expect(activeMatchPlayers(m, sub.time - 0.001).map((p) => p.id)).toContain(
      "statsbomb-player-11",
    );
    expect(activeMatchPlayers(m, sub.time).map((p) => p.id)).not.toContain(
      "statsbomb-player-11",
    );
    expect(activeMatchPlayers(m, sub.time).map((p) => p.id)).toContain(
      "statsbomb-player-12",
    );
    expect(m.events.find((e) => e.type === "card")!.qualifiers.card).toBe(
      "Yellow Card",
    );
  });
  it("retains unlocated and unknown actions without invented positions", () => {
    const r = contractFixture();
    r.events[3] = { ...r.events[3], type: { id: 999, name: "Future type" } };
    const m = normalizeStatsBomb(r);
    expect(m.events[0].position).toBeNull();
    expect(m.events[0].actorId).toBeNull();
    expect(m.events[3].type).toBe("other");
    expect(m.events[3].source.eventType).toBe("Future type");
  });
  it("orders both halves, stoppage and equal-time source indices", () => {
    const r = contractFixture();
    r.events.reverse();
    const m = normalizeStatsBomb(r);
    expect(m.events[0].source.index).toBe(1);
    expect(m.events[5].source.index).toBe(6);
    expect(matchClock(m, m.periods[0].end)).toBe("45+02:00");
    expect(matchClock(m, m.secondHalfStart)).toBe("45:00");
    expect(periodAt(m, m.secondHalfStart).id).toBe("2H");
    expect(m.events.every((e, i, a) => !i || e.time >= a[i - 1].time)).toBe(
      true,
    );
  });
  it("rejects missing periods, bad timestamps and score mismatches", () => {
    const r = contractFixture();
    r.events = r.events.filter((e) => e.period === 1);
    expect(() => normalizeStatsBomb(r)).toThrow();
    expect(() => timestampSeconds("00:70:01.000")).toThrow();
    const bad = contractFixture();
    bad.match.home_score = 3;
    expect(() => normalizeStatsBomb(bad)).toThrow(/reconcile/);
  });
  it("keeps source out-of-bounds points without clamping into the pitch", () => {
    const r = contractFixture();
    r.events[3].location = [121, 40];
    const e = normalizeStatsBomb(r).events[3];
    expect(e.position).toBeNull();
    expect(e.source.coordinates.start).toEqual([121, 40]);
  });
});
it("coordinate transforms have a single orientation and reference distance", () => {
  expect(normalizePoint([120, 80], 120, 80)).toEqual({ x: 100, y: 100 });
  expect(displayPoint({ x: 80, y: 20 }, "riverside")).toEqual({ x: 20, y: 80 });
  expect(referenceDistance({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe(105);
  expect(() => normalizePoint([121, 40], 120, 80)).toThrow();
});
for (const m of [
  synthetic.read("pressure"),
  historical,
  normalizeStatsBomb(contractFixture()),
]) {
  it(`${m.provenance.provider}: shared replay, statistics, insights and evidence respect the cutoff`, () => {
    for (const t of [0, 100, m.secondHalfStart, m.duration]) {
      const visible = m.events.filter((e) => e.time <= t),
        packet = matchEvidence(m, t, "analyst");
      expect(packet.events.every((e) => e.time <= t)).toBe(true);
      expect(matchStatistics(m, t).harbor.goals).toBe(
        recordedScore(visible).harbor,
      );
      expect(replayFrame(pitchEvents(m.events), t).visible).toEqual(
        pitchEvents(visible),
      );
      for (const fact of packet.facts)
        for (const id of fact.evidenceIds)
          expect(visible.some((e) => e.id === id)).toBe(true);
      for (const i of matchInsights(m, t))
        expect(i.current).toBe(i.evidenceIds.length);
      const selected = visible.at(-1);
      if (selected)
        expect(
          matchSequence(m, selected, t).every(
            (e) => e.time <= t && e.order <= selected.order,
          ),
        ).toBe(true);
    }
    const value = playbackTime(
      { time: 99, sampledAt: 1000, playing: true, speed: 2 },
      1500,
      m.duration,
    );
    expect(value).toBe(100);
    expect(() => matchEvidence(m, Infinity, "fan")).toThrow();
  });
  it(`${m.provenance.provider}: canonical evidence works with both mocked AI providers`, async () => {
    for (const provider of ["openai", "foundry"] as const) {
      const packet = matchEvidence(m, m.duration, "fan");
      configure(provider);
      vi.stubGlobal("fetch", mockProvider(packet));
      const result = await composeNarration(packet, provider);
      expect(
        result.narrative.evidenceIds.every((id) =>
          packet.events.some((e) => e.id === id),
        ),
      ).toBe(true);
    }
  });
}
it("production rejects local research even when an operator sets the flag", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("STATSBOMB_RESEARCH_ENABLED", "true");
  expect(await researchFixtures()).toEqual([]);
  await expect(loadResearchMatch("statsbomb-8658")).rejects.toThrow();
});
it.skipIf(
  process.env.VERIFY_LOCAL_STATSBOMB !== "true" ||
    !existsSync(".cache/statsbomb/8658.raw.json"),
)(
  "local complete StatsBomb fixture: every record and goal verified, no external AI",
  () => {
    const input = JSON.parse(
        readFileSync(".cache/statsbomb/8658.raw.json", "utf8"),
      ),
      m = normalizeStatsBomb(input);
    expect(m.events).toHaveLength(2978);
    expect(recordedScore(m.events)).toEqual({ harbor: 4, riverside: 2 });
    expect(m.events.filter((e) => e.type === "substitution")).toHaveLength(5);
    for (const e of m.events)
      expect(e.source.raw).toEqual(
        input.events.find((r: { id: string }) => r.id === e.source.eventId),
      );
    for (let t = 0; t <= m.duration; t += 60)
      expect(matchEvidence(m, t, "fan").events.every((e) => e.time <= t)).toBe(
        true,
      );
  },
);
it("extra time and shootout remain distinct; shootout attempts do not change match score", () => {
  const input = contractFixture();
  for (const period of [3, 4, 5]) {
    const base = input.events.length;
    input.events.push(
      {
        ...input.events[2],
        id: `extra-start-${period}`,
        index: base + 1,
        period,
        timestamp: "00:00:00.000",
      },
      {
        ...input.events[11],
        id: `extra-end-${period}`,
        index: base + 2,
        period,
        timestamp: "00:15:00.000",
      },
    );
  }
  const m = normalizeStatsBomb(input);
  expect(m.periods.map((p) => p.id)).toEqual(["1H", "2H", "E1", "E2", "PS"]);
  expect(matchClock(m, m.periods[2].start)).toBe("90:00");
  expect(matchClock(m, m.periods[3].start)).toBe("105:00");
  expect(matchClock(m, m.periods[4].start)).toBe("PS 00:00");
  const shootout = {
    ...m.events.find((e) => e.type === "shot")!,
    period: "PS" as const,
  };
  expect(recordedScore([shootout])).toEqual({ harbor: 0, riverside: 0 });
});
it("canonical synthetic AI packets stay bounded and do not transmit raw provider records", async () => {
  const { buildEvidence } = await import("../src/lib/ai/evidence");
  const m = synthetic.read("pressure", { profile: "balanced", seed: 42 });
  for (let t = 1800; t <= m.duration; t += 60) {
    const packet = buildEvidence(pitchEvents(m.events), t, "analyst");
    expect(Buffer.byteLength(JSON.stringify(packet))).toBeLessThan(90000);
    expect(packet.events.every((e) => !("source" in e))).toBe(true);
  }
});

it("synthetic variant identities do not collide with preserved demo events", () => {
  const demo = synthetic.read("pressure"),
    balanced = synthetic.read("pressure", { profile: "balanced" });
  expect(balanced.id).not.toBe(demo.id);
  const ids = new Set(demo.events.map((e) => e.id));
  expect(balanced.events.every((e) => !ids.has(e.id))).toBe(true);
});
