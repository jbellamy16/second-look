import {
  generateMatch,
  DURATION,
  PLAYERS,
  TEAMS,
  type Scenario,
  SCENARIOS,
} from "../match";
import {
  CANONICAL_PITCH,
  validateMatch,
  type MatchData,
  type MatchSource,
} from "./model";
export class SyntheticMatchSource implements MatchSource {
  readonly kind = "synthetic" as const;
  async load(id: string): Promise<MatchData> {
    return this.read(id);
  }
  read(
    id: string,
    options: { seed?: number; profile?: "demo" | "balanced" } = {},
  ): MatchData {
    if (!(id in SCENARIOS)) throw new Error("Unknown synthetic scenario");
    const seed = options.seed ?? SCENARIOS[id as Scenario].seed;
    const profile = options.profile ?? "demo";
    const matchId =
      profile === "demo" && seed === SCENARIOS[id as Scenario].seed
        ? id
        : `synthetic-${id}-${seed}-${profile}`;
    const eventId = (value: string) =>
      matchId === id ? value : `${matchId}:${value}`;
    const events = generateMatch(id as Scenario, seed, profile);
    return validateMatch({
      schemaVersion: "1.0.0",
      pitch: CANONICAL_PITCH,
      season: null,
      venue: "Harbor Park",
      status: "finished",
      periods: [
        { id: "1H", start: 0, end: 2699.999, clockStart: 0 },
        { id: "2H", start: 2700, end: DURATION, clockStart: 2700 },
      ],
      provenance: {
        provider: "synthetic",
        sourceMatchId: matchId,
        adapterVersion: "1.0.0",
        revision: `${seed}-${profile}`,
        license: "Project-owned synthetic data",
        licenseUrl: null,
        redistribution: "owned",
        raw: { scenario: id, seed, profile },
      },
      id: matchId,
      kind: this.kind,
      title: "Harbor Athletic vs Riverside FC",
      date: null,
      competition: "Between the Lines Invitational",
      duration: DURATION,
      secondHalfStart: 2700,
      teams: {
        harbor: {
          ...TEAMS.harbor,
          id: "harbor",
          lineup: PLAYERS.filter((p) => p.team === "harbor")
            .slice(0, 11)
            .map((p) => p.id),
          bench: ["harbor-12"],
        },
        riverside: {
          ...TEAMS.riverside,
          id: "riverside",
          lineup: PLAYERS.filter((p) => p.team === "riverside")
            .slice(0, 11)
            .map((p) => p.id),
          bench: ["riverside-12"],
        },
      },
      players: PLAYERS.map((p) => ({ ...p, sourceId: p.id })),
      events: events.map((e, order) => ({
        ...e,
        id: eventId(e.id),
        matchId,
        order,
        teamId: e.team,
        actorId: e.outgoingId ?? e.playerId,
        qualifiers: {},
        statistics: e.xg === undefined ? {} : { xg: e.xg },
        relatedEvents:
          e.type === "goal"
            ? [eventId(events[order - 1].id)]
            : e.type === "shot" && e.outcome === "goal"
              ? [eventId(events[order + 1].id)]
              : [],
        ...(e.success === undefined
          ? {}
          : { result: e.success ? "complete" : "incomplete" }),
        period: e.time < 2700 ? "1H" : "2H",
        periodSeconds: e.time < 2700 ? e.time : e.time - 2700,
        ...(e.type === "goal" ? { scoringTeam: e.team } : {}),
        source: {
          provider: "synthetic",
          matchId,
          eventId: e.id,
          teamId: e.team,
          playerId: e.playerId,
          eventType: e.type,
          tags: [],
          precision: "second",
          coordinates: {
            start: [e.position.x, e.position.y],
            ...(e.end ? { end: [e.end.x, e.end.y] } : {}),
            transform: "identity-percent-v1",
          },
          raw: { ...e },
        },
      })),
      finalScore: {
        harbor: events.filter((e) => e.type === "goal" && e.team === "harbor")
          .length,
        riverside: events.filter(
          (e) => e.type === "goal" && e.team === "riverside",
        ).length,
      },
      attribution: "Between the Lines · reproducible synthetic data",
      sourceUrl: null,
      capabilities: {
        recoveries: true,
        shotOutcomes: true,
        comparisonScope: "continuous",
        lineups: true,
        substitutions: true,
        passRecipients: true,
        physicalDirection: false,
        tracking: false,
        xg: true,
        ballRecoveries: true,
        possession: "generated",
      },
      limitations: [
        "Synthetic match, players and event-model xG. No continuous tracking.",
      ],
    });
  }
}
