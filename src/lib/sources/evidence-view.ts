import type { MatchEvent } from "../match";
import type { NormalizedEvent } from "./model";
/** Send bounded normalized evidence, never full raw provider objects or future match metadata. */
export function evidenceEvent(e: MatchEvent | NormalizedEvent) {
  return {
    id: e.id,
    time: e.time,
    team: e.team,
    playerId: e.playerId,
    type: "scoringTeam" in e && e.scoringTeam ? "goal" : e.type,
    ...("source" in e
      ? {
          period: e.period,
          periodSeconds: e.periodSeconds,
          sourceEventId: e.source.eventId,
        }
      : {}),
  };
}
