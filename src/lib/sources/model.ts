import { z } from "zod";
import { clock, type MatchEvent } from "../match";
import { CANONICAL_PITCH } from "./coordinates";

const id = z.string().min(1);
const nonnegative = z.number().finite().nonnegative();
const side = z.enum(["harbor", "riverside"]); // compatibility display slots: home / away
export const periodSchema = z.enum(["1H", "2H", "E1", "E2", "PS"]);
const point = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});
const metadata = z.record(z.string(), z.unknown());
export const normalizedEventSchema = z.object({
  id,
  matchId: id,
  order: z.number().int().nonnegative(),
  teamId: id,
  time: nonnegative,
  period: periodSchema,
  periodSeconds: nonnegative,
  team: side,
  playerId: z.string(), // "0" is the legacy unavailable-actor sentinel; actorId is canonical.
  actorId: id.nullable(),
  type: z.enum([
    "pass",
    "carry",
    "shot",
    "goal",
    "tackle",
    "interception",
    "recovery",
    "possession",
    "corner",
    "free_kick",
    "foul",
    "substitution",
    "card",
    "period_start",
    "period_end",
    "duel",
    "restart",
    "offside",
    "touch",
    "interruption",
    "save",
    "other",
  ]),
  position: point.nullable(),
  end: point.optional(),
  success: z.boolean().optional(),
  outcome: z.enum(["saved", "wide", "goal"]).optional(),
  result: z.string().optional(),
  xg: z.number().min(0).max(1).optional(),
  recipientId: id.optional(),
  outgoingId: id.optional(),
  possessionId: z.number().int().nonnegative().nullable(),
  scoringTeam: side.optional(),
  ownGoal: z.boolean().optional(),
  qualifiers: metadata,
  relatedEvents: z.array(id),
  statistics: z.record(z.string(), z.number().finite()),
  source: z.object({
    provider: id,
    matchId: id,
    eventId: id,
    teamId: id,
    playerId: z.string(),
    eventType: id,
    index: z.number().int().nonnegative().optional(),
    tags: z.array(z.number()),
    precision: z.enum(["second", "minute", "millisecond"]),
    reportedMinute: nonnegative.optional(),
    coordinates: z.object({
      start: z.array(z.number()).optional(),
      end: z.array(z.number()).optional(),
      transform: id,
    }),
    raw: metadata,
  }),
});
export type NormalizedEvent = z.infer<typeof normalizedEventSchema>;
export const teamSchema = z.object({
  id,
  name: id,
  short: id,
  color: id,
  formation: z.string().optional(),
  lineup: z.array(id),
  bench: z.array(id),
});
export const playerSchema = z.object({
  id,
  sourceId: id,
  name: id,
  role: z.string(),
  team: side,
  number: z.number().int().nonnegative().nullable(),
});
export const matchSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  id,
  kind: z.enum(["synthetic", "historical", "live"]),
  title: id,
  date: z.string().nullable(),
  competition: id,
  season: z.string().nullable(),
  venue: z.string().nullable(),
  status: z.enum(["scheduled", "in_progress", "finished"]),
  duration: nonnegative,
  secondHalfStart: nonnegative,
  periods: z.array(
    z.object({
      id: periodSchema,
      start: nonnegative,
      end: nonnegative,
      clockStart: nonnegative,
    }),
  ),
  pitch: z.object({
    length: z.literal(100),
    width: z.literal(100),
    unit: z.literal("percent"),
    origin: z.literal("top-left"),
    yDirection: z.literal("down"),
    orientation: z.literal("action-executing-team"),
    referenceLengthMetres: z.literal(105),
    referenceWidthMetres: z.literal(68),
    physicalDimensionsKnown: z.literal(false),
  }),
  teams: z.object({ harbor: teamSchema, riverside: teamSchema }),
  players: z.array(playerSchema),
  events: z.array(normalizedEventSchema),
  finalScore: z.object({
    harbor: z.number().int().nonnegative(),
    riverside: z.number().int().nonnegative(),
  }),
  attribution: id,
  sourceUrl: z.string().nullable(),
  provenance: z.object({
    provider: id,
    sourceMatchId: id,
    adapterVersion: id,
    revision: z.string().nullable(),
    license: id,
    licenseUrl: z.string().nullable(),
    redistribution: z.enum([
      "permitted-with-attribution",
      "restricted",
      "owned",
    ]),
    raw: metadata,
  }),
  capabilities: z.object({
    recoveries: z.boolean(),
    shotOutcomes: z.boolean(),
    comparisonScope: z.enum(["continuous", "period"]),
    tracking: z.literal(false),
    xg: z.boolean(),
    ballRecoveries: z.boolean(),
    possession: z.enum(["generated", "recorded", "unavailable"]),
    lineups: z.boolean(),
    substitutions: z.boolean(),
    passRecipients: z.boolean(),
    physicalDirection: z.literal(false),
  }),
  limitations: z.array(z.string()),
});
export type MatchTeam = z.infer<typeof teamSchema>;
export type MatchPlayer = z.infer<typeof playerSchema>;
export type MatchData = z.infer<typeof matchSchema>;
export interface MatchSource {
  readonly kind: MatchData["kind"];
  load(id: string): Promise<MatchData>;
}
export { CANONICAL_PITCH };

export function validateMatch(input: unknown): MatchData {
  const match = matchSchema.parse(input);
  const { events, players, periods } = match;
  const fail = (message: string): never => {
    throw new Error(message);
  };
  if (new Set(events.map((e) => e.id)).size !== events.length)
    fail("Duplicate event IDs");
  if (new Set(players.map((p) => p.id)).size !== players.length)
    fail("Duplicate player IDs");
  if (match.teams.harbor.id === match.teams.riverside.id)
    fail("Duplicate team IDs");
  if (
    !periods.length ||
    new Set(periods.map((p) => p.id)).size !== periods.length
  )
    fail("Invalid periods");
  const periodOrder = ["1H", "2H", "E1", "E2", "PS"];
  periods.forEach((p, i) => {
    if (
      p.end < p.start ||
      p.end > match.duration ||
      (i > 0 &&
        (p.start <= periods[i - 1].end ||
          periodOrder.indexOf(p.id) <= periodOrder.indexOf(periods[i - 1].id)))
    )
      fail("Invalid period boundaries");
  });
  if (periods.find((p) => p.id === "2H")?.start !== match.secondHalfStart)
    fail("Invalid second-half boundary");
  const playerMap = new Map(players.map((p) => [p.id, p]));
  for (const slot of ["harbor", "riverside"] as const) {
    const t = match.teams[slot];
    const roster = [...t.lineup, ...t.bench];
    if (
      new Set(roster).size !== roster.length ||
      roster.some((pid) => playerMap.get(pid)?.team !== slot)
    )
      fail("Invalid team lineup");
  }
  const eventMap = new Map(events.map((e) => [e.id, e]));
  const active = new Set([
    ...match.teams.harbor.lineup,
    ...match.teams.riverside.lineup,
  ]);
  for (const [i, e] of events.entries()) {
    if (e.order !== i || (i && e.time < events[i - 1].time))
      fail("Unordered events");
    if (
      e.time > match.duration ||
      e.matchId !== match.id ||
      e.source.provider !== match.provenance.provider ||
      e.source.matchId !== match.provenance.sourceMatchId
    )
      fail("Invalid match boundary");
    if (e.teamId !== match.teams[e.team].id || e.source.teamId !== e.teamId)
      fail("Invalid team identity");
    if (
      e.actorId !==
      (e.type === "substitution" && e.outgoingId
        ? e.outgoingId
        : e.playerId === "0"
          ? null
          : e.playerId)
    )
      fail("Invalid actor identity");
    for (const pid of [
      e.actorId,
      e.playerId === "0" ? null : e.playerId,
      e.recipientId,
      e.outgoingId,
    ])
      if (pid && playerMap.get(pid)?.team !== e.team)
        fail("Invalid player/team association");
    const p = periods.find((p) => p.id === e.period);
    if (
      !p ||
      e.time < p.start ||
      e.time > p.end ||
      Math.abs(e.time - p.start - e.periodSeconds) > 1e-6
    )
      fail("Invalid period timestamp");
    if (e.relatedEvents.some((ref) => !eventMap.has(ref)))
      fail("Unknown related event");
    if (
      e.type === "substitution" &&
      (!e.outgoingId || !e.actorId || e.outgoingId === e.playerId)
    )
      fail("Invalid substitution");
    if (e.type === "substitution" && match.capabilities.lineups) {
      if (!active.has(e.outgoingId!) || active.has(e.playerId))
        fail("Invalid substitution participation");
      active.delete(e.outgoingId!);
      active.add(e.playerId);
    }
    if (e.xg !== undefined && !match.capabilities.xg) fail("Unsupported xG");
    if (
      e.possessionId !== null &&
      match.capabilities.possession === "unavailable"
    )
      fail("Unsupported possession");
  }
  const score = recordedScore(events);
  if (
    match.status === "finished" &&
    (score.harbor !== match.finalScore.harbor ||
      score.riverside !== match.finalScore.riverside)
  )
    fail("Goal events do not reconcile with match metadata");
  return match;
}
export function periodAt(match: MatchData, time: number) {
  return match.periods.findLast((p) => p.start <= time) ?? match.periods[0];
}
export function matchClock(match: MatchData, time: number) {
  const p = periodAt(match, time),
    seconds = Math.max(0, time - p.start);
  if (p.id === "PS") return `PS ${clock(seconds)}`;
  const nominal = ["E1", "E2"].includes(p.id) ? 900 : 2700;
  return seconds >= nominal
    ? `${(p.clockStart + nominal) / 60}+${clock(seconds - nominal)}`
    : clock(seconds + p.clockStart);
}
export function eventClock(match: MatchData, event: NormalizedEvent) {
  return event.source.precision === "minute"
    ? `~${event.source.reportedMinute}′`
    : matchClock(match, event.time);
}
/** Located actions only; legacy actor "0" means unavailable, never an invented player. */
export function pitchEvents(events: NormalizedEvent[]): MatchEvent[] {
  return events
    .filter((e) => e.position !== null)
    .map((e) => ({ ...e, position: e.position! }));
}
export function recordedScore(events: NormalizedEvent[]) {
  const score = { harbor: 0, riverside: 0 };
  for (const e of events)
    if (e.scoringTeam && e.period !== "PS") score[e.scoringTeam]++;
  return score;
}
export function activeMatchPlayers(match: MatchData, time: number) {
  const active = new Set([
    ...match.teams.harbor.lineup,
    ...match.teams.riverside.lineup,
  ]);
  for (const e of match.events) {
    if (e.time > time) break;
    if (e.type === "substitution") {
      active.delete(e.outgoingId!);
      active.add(e.playerId);
    }
    if (
      e.qualifiers.card === "Red Card" ||
      e.qualifiers.card === "Second Yellow"
    )
      active.delete(e.playerId);
  }
  return match.players.filter((p) => active.has(p.id));
}
