import {
  generateMatch,
  DURATION,
  PLAYERS,
  TEAMS,
  type Scenario,
  SCENARIOS,
} from "../match";
import { validateMatch, type MatchData, type MatchSource } from "./model";
export class SyntheticMatchSource implements MatchSource {
  readonly kind = "synthetic" as const;
  async load(id: string): Promise<MatchData> {
    return this.read(id);
  }
  read(id: string): MatchData {
    if (!(id in SCENARIOS)) throw new Error("Unknown synthetic scenario");
    const events = generateMatch(id as Scenario);
    return validateMatch({
      id,
      kind: this.kind,
      title: "Harbor Athletic vs Riverside FC",
      date: null,
      competition: "Between the Lines Invitational",
      duration: DURATION,
      secondHalfStart: 2700,
      teams: {
        harbor: { ...TEAMS.harbor, id: "harbor" },
        riverside: { ...TEAMS.riverside, id: "riverside" },
      },
      players: PLAYERS.map((p) => ({ ...p, sourceId: p.id })),
      events: events.map((e) => ({
        ...e,
        period: e.time < 2700 ? "1H" : "2H",
        periodSeconds: e.time % 2700,
        ...(e.type === "goal" ? { scoringTeam: e.team } : {}),
        source: {
          provider: "synthetic",
          matchId: id,
          eventId: e.id,
          teamId: e.team,
          playerId: e.playerId,
          eventType: e.type,
          tags: [],
          precision: "second",
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
