import { z } from "zod";
import { clock, type MatchEvent, type TeamId } from "../match";

const point = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});
export const normalizedEventSchema = z.object({
  id: z.string().min(1),
  time: z.number().finite().nonnegative(),
  period: z.enum(["1H", "2H"]),
  periodSeconds: z.number().finite().nonnegative(),
  team: z.enum(["harbor", "riverside"]),
  playerId: z.string(),
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
    "foul",
    "substitution",
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
  xg: z.number().optional(),
  recipientId: z.string().optional(),
  outgoingId: z.string().optional(),
  possessionId: z.number().int().nonnegative().nullable(),
  scoringTeam: z.enum(["harbor", "riverside"]).optional(),
  ownGoal: z.boolean().optional(),
  source: z.object({
    provider: z.enum(["synthetic", "wyscout"]),
    matchId: z.string(),
    eventId: z.string(),
    teamId: z.string(),
    playerId: z.string(),
    eventType: z.string(),
    tags: z.array(z.number()),
    precision: z.enum(["second", "minute"]),
    reportedMinute: z.number().optional(),
  }),
});
export type NormalizedEvent = z.infer<typeof normalizedEventSchema>;
export type MatchTeam = {
  id: string;
  name: string;
  short: string;
  color: string;
};
export type MatchPlayer = {
  id: string;
  sourceId: string;
  name: string;
  role: string;
  team: TeamId;
  number: number | null;
};
export type MatchData = {
  id: string;
  kind: "synthetic" | "historical";
  title: string;
  date: string | null;
  competition: string;
  duration: number;
  secondHalfStart: number;
  teams: Record<TeamId, MatchTeam>;
  players: MatchPlayer[];
  events: NormalizedEvent[];
  finalScore: Record<TeamId, number>;
  attribution: string;
  sourceUrl: string | null;
  capabilities: {
    tracking: false;
    xg: boolean;
    ballRecoveries: boolean;
    possession: "generated" | "unavailable";
  };
  limitations: string[];
};
export interface MatchSource {
  readonly kind: MatchData["kind"];
  load(id: string): Promise<MatchData>;
}
export function validateMatch(match: MatchData): MatchData {
  const events = z.array(normalizedEventSchema).parse(match.events);
  if (new Set(events.map((e) => e.id)).size !== events.length)
    throw new Error("Duplicate event IDs");
  if (events.some((e, i) => i > 0 && e.time < events[i - 1].time))
    throw new Error("Unordered events");
  if (
    events.some((e) => e.time > match.duration || e.source.matchId !== match.id)
  )
    throw new Error("Invalid match boundary");
  return { ...match, events };
}
export function matchClock(match: MatchData, time: number) {
  const second = time >= match.secondHalfStart;
  const seconds = Math.max(0, second ? time - match.secondHalfStart : time);
  return seconds >= 2700
    ? `${second ? 90 : 45}+${clock(seconds - 2700)}`
    : clock(seconds + (second ? 2700 : 0));
}
export function eventClock(match: MatchData, event: NormalizedEvent) {
  return event.source.precision === "minute"
    ? `~${event.source.reportedMinute}′`
    : matchClock(match, event.time);
}
/** Only pass actual located actions to the existing pitch. No invented origin/end point. */
export function pitchEvents(events: NormalizedEvent[]): MatchEvent[] {
  return events
    .filter((e) => e.position !== null)
    .map((e) => ({
      ...e,
      type: e.type as MatchEvent["type"],
      position: e.position!,
      possessionId: e.possessionId,
    }));
}
export function recordedScore(events: NormalizedEvent[]) {
  const score = { harbor: 0, riverside: 0 };
  for (const e of events) if (e.scoringTeam) score[e.scoringTeam]++;
  return score;
}
