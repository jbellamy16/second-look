import { eventClock, type MatchData, type NormalizedEvent } from "./model";

export function eventMinute(match: MatchData, event: NormalizedEvent) {
  return eventClock(match, event)
    .replace(
      /(\d+):(\d{2})$/,
      (_, minutes, seconds) =>
        `${Number(minutes) + (Number(seconds) > 0 ? 1 : 0)}′`,
    )
    .replace("+0′", "′");
}

/** One name per player, with each credited minute kept in match order. */
export function scorelineNames(
  match: MatchData,
  credits: { playerId: string; event: NormalizedEvent }[],
) {
  const groups = new Map<string, { name: string; minutes: string[] }>();
  for (const { playerId, event } of [...credits].sort(
    (a, b) => a.event.time - b.event.time || a.event.order - b.event.order,
  )) {
    const player = match.players.find((p) => p.id === playerId);
    const key = player?.id ?? event.id;
    const group = groups.get(key) ?? {
      name: player?.name ?? "Unknown scorer",
      minutes: [],
    };
    group.minutes.push(
      `${eventMinute(match, event)}${event.ownGoal ? " OG" : ""}`,
    );
    groups.set(key, group);
  }
  return [...groups].map(([id, { name, minutes }]) => ({
    id,
    label: `${name} (${minutes.join(", ")})`,
  }));
}

export type PlayerHighlights = {
  goals: number;
  goalEvents: NormalizedEvent[];
  assistEvents: NormalizedEvent[];
  assists: number | null;
  substitutions: { event: NormalizedEvent; direction: "On" | "Off" }[];
};

/** Use scoring records, not both the shot and its separate goal observation. */
export function playerHighlights(match: MatchData, time: number) {
  const result = new Map<string, PlayerHighlights>(
    match.players.map((player) => [
      player.id,
      {
        goals: 0,
        goalEvents: [],
        assistEvents: [],
        assists:
          match.capabilities.assists ||
          match.provenance.provider === "statsbomb"
            ? 0
            : null,
        substitutions: [],
      },
    ]),
  );
  const visible = match.events.filter((event) => event.time <= time);
  const goals = visible.filter(
    (event) => event.scoringTeam && !event.ownGoal && event.period !== "PS",
  );
  const credited = new Set<string>();
  for (const goal of goals) {
    const player = result.get(goal.playerId);
    if (player) {
      player.goals++;
      player.goalEvents.push(goal);
    }
    const assister = goal.assistPlayerId
      ? result.get(goal.assistPlayerId)
      : undefined;
    if (assister && assister.assists !== null) {
      assister.assists++;
      assister.assistEvents.push(goal);
      credited.add(goal.id);
    }
  }
  // StatsBomb explicitly flags the assist and links it to the scoring shot.
  // Waiting for that shot prevents a pass from revealing a future goal.
  for (const event of visible) {
    if (event.type === "substitution") {
      result
        .get(event.playerId)
        ?.substitutions.push({ event, direction: "On" });
      if (event.outgoingId)
        result
          .get(event.outgoingId)
          ?.substitutions.push({ event, direction: "Off" });
    }
    if (event.type !== "pass" || event.source.provider !== "statsbomb")
      continue;
    const pass = event.source.raw.pass;
    if (!pass || typeof pass !== "object") continue;
    const data = pass as Record<string, unknown>;
    if (data.goal_assist !== true || typeof data.assisted_shot_id !== "string")
      continue;
    const goal = goals.find(
      (goal) =>
        goal.source.eventId === data.assisted_shot_id &&
        goal.team === event.team &&
        goal.period === event.period &&
        goal.time >= event.time &&
        goal.playerId !== event.playerId,
    );
    const player = result.get(event.playerId);
    if (goal && player && player.assists !== null && !credited.has(goal.id)) {
      player.assists++;
      player.assistEvents.push(goal);
      credited.add(goal.id);
    }
  }
  return result;
}
