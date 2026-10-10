import { recordedContext } from "../match-context";
import type { Insight, Mode } from "../intelligence";
import { eventClock, type MatchData } from "./model";

export function matchContext(match: MatchData, time: number) {
  return recordedContext(match.events, time, {
    teams: match.teams,
    player: (id) =>
      match.players.find((p) => p.id === id)?.name ?? "Unidentified player",
  });
}

/** The same recap hierarchy for every source; AI may replace only the narration. */
export function matchSummary(
  match: MatchData,
  time: number,
  mode: Mode,
  insights: Insight[],
) {
  const context = matchContext(match, time);
  const summary = insights[0]
    ? mode === "analyst"
      ? insights[0].analyst
      : insights[0].explanation
    : context.items
        .map((item) =>
          item.kind === "event"
            ? `${eventClock(
                match,
                match.events.find((e) => e.id === item.eventId)!,
              )}: ${item.text}.`
            : `${item.headline}. ${item.text}`,
        )
        .join(" ");
  return {
    ...context,
    summary,
    watch:
      time >= match.duration
        ? "Full time. Revisit a recorded action to see how the match unfolded."
        : (insights[0]?.watch ?? ""),
  };
}
