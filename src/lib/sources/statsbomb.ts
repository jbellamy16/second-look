import { z } from "zod";
import { TEAMS, other, type TeamId } from "../match";
import {
  CANONICAL_PITCH,
  validateMatch,
  type MatchData,
  type MatchSource,
  type NormalizedEvent,
} from "./model";
import { normalizePoint } from "./coordinates";

const named = z
  .object({ id: z.number().int(), name: z.string() })
  .passthrough();
const location = z.array(z.number().finite()).min(2).max(3);
const action = z
  .object({
    outcome: named.optional(),
    type: named.optional(),
    end_location: location.optional(),
    recipient: named.optional(),
    statsbomb_xg: z.number().min(0).max(1).optional(),
    card: named.optional(),
    recovery_failure: z.boolean().optional(),
  })
  .passthrough();
const rawEvent = z
  .object({
    id: z.string().min(1),
    index: z.number().int().positive(),
    period: z.number().int().min(1).max(5),
    timestamp: z.string().regex(/^\d{2}:\d{2}:\d{2}\.\d{3}$/),
    minute: z.number().int().nonnegative(),
    second: z.number().int().min(0).max(59),
    type: named,
    team: named,
    player: named.optional(),
    location: location.optional(),
    possession: z.number().int().nonnegative().optional(),
    possession_team: named.optional(),
    related_events: z.array(z.string()).optional(),
    pass: action.optional(),
    carry: action.optional(),
    shot: action.optional(),
    duel: action.optional(),
    interception: action.optional(),
    ball_recovery: action.optional(),
    foul_committed: action.optional(),
    bad_behaviour: action.optional(),
    substitution: z
      .object({ replacement: named, outcome: named.optional() })
      .passthrough()
      .optional(),
    tactics: z
      .object({
        formation: z.number().int(),
        lineup: z.array(
          z
            .object({
              player: named,
              position: named,
              jersey_number: z.number().int(),
            })
            .passthrough(),
        ),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
export const statsBombInputSchema = z.object({
  match: z
    .object({
      match_id: z.number().int(),
      match_date: z.string(),
      competition: z
        .object({ competition_id: z.number(), competition_name: z.string() })
        .passthrough(),
      season: z
        .object({ season_id: z.number(), season_name: z.string() })
        .passthrough(),
      home_team: z
        .object({ home_team_id: z.number(), home_team_name: z.string() })
        .passthrough(),
      away_team: z
        .object({ away_team_id: z.number(), away_team_name: z.string() })
        .passthrough(),
      home_score: z.number().int().nonnegative(),
      away_score: z.number().int().nonnegative(),
      stadium: named.optional(),
    })
    .passthrough(),
  events: z.array(rawEvent),
  lineups: z.array(
    z
      .object({
        team_id: z.number(),
        team_name: z.string(),
        lineup: z.array(
          z
            .object({
              player_id: z.number(),
              player_name: z.string(),
              jersey_number: z.number().int().nullable().optional(),
            })
            .passthrough(),
        ),
      })
      .passthrough(),
  ),
  revision: z.string().min(1),
});
export function timestampSeconds(timestamp: string) {
  const [h, m, s] = timestamp.split(":").map(Number);
  if (!Number.isFinite(h + m + s) || m >= 60 || s >= 60)
    throw new Error("Invalid event timestamp");
  return h * 3600 + m * 60 + s;
}
const periodIds = ["1H", "2H", "E1", "E2", "PS"] as const;
const pid = (id: number) => `statsbomb-player-${id}`;
export function normalizeStatsBomb(input: unknown): MatchData {
  const raw = statsBombInputSchema.parse(input),
    m = raw.match,
    sourceId = String(m.match_id),
    id = `statsbomb-${sourceId}`;
  const eid = (value: string) => `${id}-${value}`;
  const slot = (value: number): TeamId => {
    if (value === m.home_team.home_team_id) return "harbor";
    if (value === m.away_team.away_team_id) return "riverside";
    throw new Error("Unknown StatsBomb team");
  };
  const ordered = [...raw.events].sort(
    (a, b) =>
      a.period - b.period ||
      timestampSeconds(a.timestamp) - timestampSeconds(b.timestamp) ||
      a.index - b.index,
  );
  if (new Set(ordered.map((e) => e.index)).size !== ordered.length)
    throw new Error("Duplicate source index");
  const periods: MatchData["periods"] = [];
  for (const n of [...new Set(ordered.map((e) => e.period))]) {
    if (n !== periods.length + 1) throw new Error("Incomplete match periods");
    const records = ordered.filter((e) => e.period === n);
    if (
      !records.some((e) => e.type.name === "Half Start") ||
      !records.some((e) => e.type.name === "Half End")
    )
      throw new Error("Missing period transition");
    const start = periods.length ? Math.ceil(periods.at(-1)!.end) + 0.001 : 0;
    periods.push({
      id: periodIds[n - 1],
      start,
      end:
        start + Math.max(...records.map((e) => timestampSeconds(e.timestamp))),
      clockStart: [0, 2700, 5400, 6300, 7200][n - 1],
    });
  }
  if (periods.length < 2) throw new Error("Incomplete match periods");
  const teams = Object.fromEntries(
    (["harbor", "riverside"] as const).map((team) => {
      const teamId =
        team === "harbor" ? m.home_team.home_team_id : m.away_team.away_team_id;
      const name =
        team === "harbor"
          ? m.home_team.home_team_name
          : m.away_team.away_team_name;
      const lineup = raw.lineups.find((t) => t.team_id === teamId);
      if (!lineup) throw new Error("Missing team lineup");
      const tactics = ordered.find(
        (e) => e.team.id === teamId && e.type.name === "Starting XI",
      )?.tactics;
      const starters = tactics?.lineup.map((p) => pid(p.player.id)) ?? [];
      return [
        team,
        {
          id: String(teamId),
          name,
          short: name,
          color: TEAMS[team].color,
          lineup: starters,
          bench: lineup.lineup
            .map((p) => pid(p.player_id))
            .filter((p) => !starters.includes(p)),
          ...(tactics ? { formation: String(tactics.formation) } : {}),
        },
      ];
    }),
  ) as MatchData["teams"];
  const players = raw.lineups.flatMap((t) =>
    t.lineup.map((p) => ({
      id: pid(p.player_id),
      sourceId: String(p.player_id),
      name: p.player_name,
      role:
        ordered
          .find((e) => e.type.name === "Starting XI" && e.team.id === t.team_id)
          ?.tactics?.lineup.find((a) => a.player.id === p.player_id)?.position
          .name ?? "Unavailable",
      team: slot(t.team_id),
      number: p.jersey_number ?? null,
    })),
  );
  const events: NormalizedEvent[] = ordered.map((e, order): NormalizedEvent => {
    const name = e.type.name,
      team = slot(e.team.id),
      period = periods[e.period - 1];
    const map: Record<string, NormalizedEvent["type"]> = {
      Pass: "pass",
      Carry: "carry",
      Shot: "shot",
      "Own Goal Against": "goal",
      Interception: "interception",
      "Ball Recovery": "recovery",
      "Foul Committed": "foul",
      Substitution: "substitution",
      "Bad Behaviour": "card",
      "Half Start": "period_start",
      "Half End": "period_end",
      Duel: "duel",
      Offside: "offside",
      "Ball Receipt*": "touch",
      "Goal Keeper": "save",
      "Injury Stoppage": "interruption",
    };
    const type =
      name === "Duel" && e.duel?.type?.name === "Tackle"
        ? "tackle"
        : (map[name] ?? "other");
    const detail = e.pass ?? e.carry ?? e.shot ?? e.interception ?? e.duel;
    const result = detail?.outcome?.name;
    const rawEnd = detail?.end_location;
    const located = (p: number[] | undefined) => {
      if (!p) return null;
      // Preserve out-of-bounds source coordinates; rendering has no point for these records.
      if (p[0] < 0 || p[0] > 120 || p[1] < 0 || p[1] > 80) return null;
      return normalizePoint(p, 120, 80);
    };
    const end = located(rawEnd);
    const outgoingId = e.player ? pid(e.player.id) : undefined;
    const playerId = e.substitution
      ? pid(e.substitution.replacement.id)
      : (outgoingId ?? "0");
    const card = e.foul_committed?.card?.name ?? e.bad_behaviour?.card?.name;
    const goal = name === "Shot" && result === "Goal",
      ownGoal = name === "Own Goal Against";
    // Own Goal For is the paired observation, retained but never counted twice.
    return {
      id: eid(e.id),
      matchId: id,
      order,
      teamId: String(e.team.id),
      actorId: outgoingId ?? null,
      time: period.start + timestampSeconds(e.timestamp),
      period: period.id,
      periodSeconds: timestampSeconds(e.timestamp),
      team,
      playerId,
      type,
      position: located(e.location),
      ...(end && (type === "pass" || type === "carry") ? { end } : {}),
      ...(e.pass
        ? { success: result === undefined, result: result ?? "Complete" }
        : result
          ? { result }
          : {}),
      ...(e.ball_recovery
        ? { success: !e.ball_recovery.recovery_failure }
        : {}),
      ...(goal
        ? { outcome: "goal" as const }
        : result === "Saved"
          ? { outcome: "saved" as const }
          : result === "Off T" || result === "Wayward"
            ? { outcome: "wide" as const }
            : {}),
      ...(goal || ownGoal
        ? { scoringTeam: ownGoal ? other(team) : team, ownGoal }
        : {}),
      ...(e.shot?.statsbomb_xg !== undefined
        ? { xg: e.shot.statsbomb_xg }
        : {}),
      ...(e.pass?.recipient ? { recipientId: pid(e.pass.recipient.id) } : {}),
      ...(e.substitution ? { outgoingId } : {}),
      possessionId: e.possession ?? null,
      qualifiers: {
        ...(e.shot
          ? {
              onTarget: ["Goal", "Saved", "Saved to Post"].includes(
                result ?? "",
              ),
            }
          : {}),
        ...(card ? { card } : {}),
        ...(e.pass?.type ? { restart: e.pass.type.name } : {}),
        ...(e.possession_team
          ? { possessionTeamId: String(e.possession_team.id) }
          : {}),
      },
      relatedEvents: (e.related_events ?? []).map(eid),
      statistics:
        e.shot?.statsbomb_xg === undefined ? {} : { xg: e.shot.statsbomb_xg },
      source: {
        provider: "statsbomb",
        matchId: sourceId,
        eventId: e.id,
        index: e.index,
        teamId: String(e.team.id),
        playerId: String(e.player?.id ?? 0),
        eventType: name,
        tags: [],
        precision: "millisecond",
        reportedMinute: e.minute,
        coordinates: {
          ...(e.location ? { start: e.location } : {}),
          ...(rawEnd ? { end: rawEnd } : {}),
          transform: "statsbomb-120x80-to-percent-v1",
        },
        raw: { ...e },
      },
    };
  });
  return validateMatch({
    schemaVersion: "1.0.0",
    id,
    kind: "historical",
    title: `${teams.harbor.name} vs ${teams.riverside.name}`,
    date: m.match_date,
    competition: m.competition.competition_name,
    season: m.season.season_name,
    venue: m.stadium?.name ?? null,
    status: "finished",
    duration: Math.ceil(periods.at(-1)!.end),
    secondHalfStart: periods[1].start,
    periods,
    pitch: CANONICAL_PITCH,
    teams,
    players,
    events,
    finalScore: { harbor: m.home_score, riverside: m.away_score },
    attribution: "StatsBomb Open Data · local research validation only",
    sourceUrl: "https://github.com/hudl/open-data",
    provenance: {
      provider: "statsbomb",
      sourceMatchId: sourceId,
      adapterVersion: "1.0.0",
      revision: raw.revision,
      license: "StatsBomb Public Data User Agreement (2023-09-08)",
      licenseUrl: `https://github.com/hudl/open-data/blob/${raw.revision}/LICENSE.pdf`,
      redistribution: "restricted",
      raw: { match: raw.match, lineups: raw.lineups },
    },
    capabilities: {
      recoveries: true,
      shotOutcomes: true,
      comparisonScope: "period",
      tracking: false,
      xg: events.some((e) => e.xg !== undefined),
      ballRecoveries: false,
      possession: "recorded",
      lineups:
        teams.harbor.lineup.length > 0 && teams.riverside.lineup.length > 0,
      substitutions: true,
      passRecipients: true,
      physicalDirection: false,
    },
    limitations: [
      "Development-only research validation. Public redistribution, commercial use and hackathon inclusion are not cleared.",
      "Discrete events, not continuous tracking; no inferred ball trajectories or off-ball positions. Shot freeze frames remain in source metadata only.",
      "Attacking-team coordinates on a standardized pitch; stadium direction and physical pitch dimensions are unavailable.",
      "Possession identifiers are provider-recorded control sequences, not possession duration. Defensive events can belong to the opposing team's possession.",
      "Provider xG is retained where supplied, not calibrated or independently verified by this application. Shot endpoints are retained in source coordinates, not animated.",
      "Periods retain millisecond timestamps and stoppage time; the interval is omitted. Own-goal paired observations count once.",
    ],
  });
}
export class StatsBombMatchSource implements MatchSource {
  readonly kind = "historical" as const;
  constructor(private readonly read: (id: string) => Promise<unknown>) {}
  async load(id: string) {
    return normalizeStatsBomb(await this.read(id));
  }
}
