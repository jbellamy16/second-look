import type { TeamId } from "./match";

/** Descriptive facts only. These never enter the change detector or its ranking. */
export type ContextEvent = {
  id: string;
  time: number;
  type: string;
  team: TeamId;
  playerId: string;
  scoringTeam?: TeamId;
  ownGoal?: boolean;
  outgoingId?: string;
  outcome?: string;
  success?: boolean;
  period?: string;
  qualifiers?: Record<string, unknown>;
};
export type MatchContextItem = {
  id: string;
  kind: "event" | "statistic";
  headline: string;
  text: string;
  evidenceIds: string[];
  eventId: string;
  start: number;
  end: number;
};
export type ContextIdentity = {
  teams: Record<TeamId, { name: string; short: string }>;
  player: (id: string) => string;
};
export const EMPTY_MATCH_CONTEXT = "No match developments to highlight yet.";

export function recordedContext<E extends ContextEvent>(
  all: E[],
  time: number,
  identity: ContextIdentity,
) {
  const visible = all.filter((e) => e.time <= time && e.period !== "PS");
  const goal = (e: E) => !!e.scoringTeam || e.type === "goal";
  const label = (e: E) => {
    const who = identity.player(e.playerId);
    if (goal(e))
      return `${e.ownGoal ? "Own goal" : "Goal"} by ${who} · ${identity.teams[e.scoringTeam ?? e.team].name}`;
    if (e.type === "substitution")
      return `${who} on for ${identity.player(e.outgoingId ?? "0")}`;
    if (e.type === "shot")
      return `${who}: ${e.outcome === "saved" ? "shot saved" : e.outcome === "wide" ? "shot off target" : e.qualifiers?.onTarget === true ? "shot on target" : "recorded shot"}`;
    return `${who}: recorded ${e.type.replaceAll("_", " ")}`;
  };
  // A scoring shot and its goal are one development, even in feeds with two records.
  const developments = visible.filter(
    (e) =>
      goal(e) ||
      e.type === "substitution" ||
      (e.type === "shot" && e.outcome !== "goal"),
  );
  const latestGoal = visible.findLast(goal);
  const moments = developments.slice(-6);
  if (latestGoal && !moments.includes(latestGoal)) {
    moments.shift();
    moments.unshift(latestGoal);
  }
  const asItem = (e: E): MatchContextItem => ({
    id: `context-${e.id}`,
    kind: "event",
    headline: goal(e)
      ? "Latest goal"
      : e.type === "substitution"
        ? "Personnel change"
        : "Recorded attempt",
    text: label(e),
    evidenceIds: [e.id],
    eventId: e.id,
    start: e.time,
    end: e.time,
  });
  const items: MatchContextItem[] = [];
  if (latestGoal) items.push(asItem(latestGoal));
  // Prefer a recent saved/on-target attempt or substitution; otherwise the latest attempt.
  const recent = developments.filter((e) => !goal(e) && e.time > time - 900);
  const notable =
    recent.findLast(
      (e) =>
        e.type === "substitution" ||
        e.outcome === "saved" ||
        e.qualifiers?.onTarget === true,
    ) ?? recent.at(-1);
  if (notable) items.push(asItem(notable));

  const shots = visible.filter((e) => e.type === "shot");
  const passes = visible.filter((e) => e.type === "pass");
  const sample = shots.length ? shots : passes;
  if (sample.length) {
    const count = (team: TeamId) =>
      sample.filter((e) => e.team === team).length;
    const metric = shots.length ? "Shots" : "Pass attempts";
    items.push({
      id: shots.length ? "context-shots" : "context-passes",
      kind: "statistic",
      headline: `${metric} so far`,
      text: `${identity.teams.harbor.short}: ${count("harbor")}. ${identity.teams.riverside.short}: ${count("riverside")}.`,
      evidenceIds: sample.map((e) => e.id),
      eventId: sample.at(-1)!.id,
      start: sample[0].time,
      end: sample.at(-1)!.time,
    });
  }
  if (!items.length) {
    const event =
      developments.at(-1) ??
      visible.findLast((e) =>
        [
          "carry",
          "recovery",
          "interception",
          "tackle",
          "corner",
          "free_kick",
          "foul",
          "card",
          "offside",
          "save",
        ].includes(e.type),
      );
    if (event)
      items.push({ ...asItem(event), headline: "Latest recorded action" });
  }
  return {
    items,
    moments: moments.map((event) => ({ event, label: label(event) })),
  };
}
