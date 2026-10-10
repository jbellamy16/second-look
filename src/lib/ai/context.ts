import {
  EMPTY_MATCH_CONTEXT,
  type ContextEvent,
  type recordedContext,
} from "../match-context";
import type { Fact } from "./evidence";

/** Shared factual fallback for both provider workflows. No comparison is fabricated. */
export function contextFacts<E extends ContextEvent>(
  context: ReturnType<typeof recordedContext<E>>,
  formatTime: (event: E) => string,
): Fact[] {
  const why =
    "Recorded actions describe what happened; they do not establish a tactical change or its cause.";
  const moments: Fact[] = context.moments.map(({ event, label }) => ({
    id: `moment-${event.id}`,
    kind: "moment",
    priority: event.scoringTeam || event.type === "goal" ? 9 : 5,
    text: `${formatTime(event)}: ${label}.`,
    evidenceIds: [event.id],
    why,
    watch: "",
  }));
  for (const item of context.items) {
    if (
      item.kind === "event" &&
      moments.some((f) => f.evidenceIds.includes(item.eventId))
    )
      continue;
    moments.push({
      id: item.id,
      kind: "context",
      priority: 6,
      text: `${item.headline}. ${item.text}`,
      evidenceIds: item.evidenceIds,
      why,
      watch: "",
    });
  }
  if (!context.items.length)
    moments.push({
      id: "no-pattern",
      kind: "abstention",
      priority: 7,
      text: EMPTY_MATCH_CONTEXT,
      evidenceIds: [],
      why: "There is no recorded development to highlight at this timestamp.",
      watch: "",
    });
  return moments;
}
