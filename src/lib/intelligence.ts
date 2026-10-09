import {
  eventsAt,
  DURATION,
  MatchEvent,
  player,
  statistics,
  TeamId,
  TEAMS,
} from "./match";
export type Mode = "fan" | "analyst";
export type Category = "pressure" | "chances" | "rhythm";
export type Insight = {
  id: string;
  category: Category;
  team: TeamId;
  headline: string;
  explanation: string;
  why: string;
  watch: string;
  analyst: string;
  start: number;
  end: number;
  evidenceIds: string[];
  baselineIds: string[];
  metric: string;
  current: number;
  previous: number;
  unit: string;
  strength: number;
};
export function detectInsights(all: MatchEvent[], time: number): Insight[] {
  const visible = eventsAt(all, time),
    start = Math.max(0, time - 900),
    priorStart = Math.max(0, start - 900);
  if (time < 1800) return [];
  const recent = visible.filter((e) => e.time > start),
    previous = visible.filter((e) => e.time > priorStart && e.time <= start);
  const insights: Insight[] = [];
  for (const team of Object.keys(TEAMS) as TeamId[]) {
    const own = recent.filter((e) => e.team === team),
      prior = previous.filter((e) => e.team === team),
      name = TEAMS[team].short;
    const add = (
      category: Category,
      evidence: MatchEvent[],
      baseline: MatchEvent[],
      headline: string,
      explanation: string,
      why: string,
      watch: string,
      metric: string,
      strength: number,
    ) =>
      insights.push({
        id: `${team}-${category}-${Math.floor(time / 60)}`,
        category,
        team,
        headline,
        explanation,
        why,
        watch,
        analyst: `${evidence.length} ${metric.toLowerCase()} in the current 15-minute window; ${baseline.length} in the preceding 15 minutes. Equal-duration comparison; a descriptive threshold, not a statistical significance test. Event data describes actions, not off-ball positioning.`,
        start,
        end: time,
        evidenceIds: evidence.map((e) => e.id),
        baselineIds: baseline.map((e) => e.id),
        metric,
        current: evidence.length,
        previous: baseline.length,
        unit: "events / 15 min",
        strength,
      });
    const high = (ev: MatchEvent[]) =>
      ev.filter(
        (e) =>
          ["recovery", "interception", "tackle"].includes(e.type) &&
          e.position.x >= 66.7,
      );
    const h = high(own),
      b = high(prior);
    if (h.length >= 3 && h.length - b.length >= 2 && h.length >= b.length * 1.6)
      add(
        "pressure",
        h,
        b,
        `${name} are winning it higher`,
        `${name} have won the ball ${h.length} times in the attacking third in the last 15 minutes, up from ${b.length} in the previous 15.`,
        "Winning the ball closer to goal can leave less ground to cover before a chance. It does not guarantee a shot.",
        `Watch whether ${name} turn these recoveries into attempts on goal.`,
        "High ball wins",
        h.length - b.length + 2,
      );
    const shots = own.filter((e) => e.type === "shot"),
      oldShots = prior.filter((e) => e.type === "shot");
    if (shots.length >= 3 && shots.length - oldShots.length >= 2)
      add(
        "chances",
        shots,
        oldShots,
        `${name} are taking more shots`,
        `${name} have taken ${shots.length} shots in the last 15 minutes, compared with ${oldShots.length} in the previous 15.`,
        "More attempts suggest growing attacking activity. Shot frequency alone does not establish chance quality.",
        `Watch the quality of ${name}'s next chance, not just the number of shots.`,
        "Shots",
        shots.length - oldShots.length,
      );
    const passes = own.filter((e) => e.type === "pass"),
      oldPasses = prior.filter((e) => e.type === "pass");
    if (
      passes.length >= 20 &&
      oldPasses.length >= 10 &&
      passes.length > oldPasses.length * 1.5
    )
      add(
        "rhythm",
        passes,
        oldPasses,
        `${name} are picking up the rhythm`,
        `${name} have attempted ${passes.length} passes in the last 15 minutes, up from ${oldPasses.length}.`,
        "More passes indicate greater on-ball activity, but do not measure possession time or ball speed.",
        `Watch whether ${name}'s passing activity leads to entries into the attacking third.`,
        "Pass attempts",
        (passes.length - oldPasses.length) / 10,
      );
  }
  return insights.sort((a, b) => b.strength - a.strength).slice(0, 5);
}
export function recap(events: MatchEvent[], time: number, mode: Mode) {
  const visible = eventsAt(events, time),
    stats = statistics(visible),
    insights = detectInsights(visible, time);
  const goals = visible.filter((e) => e.type === "goal");
  return {
    score: `${TEAMS.harbor.short} ${stats.harbor.goals} – ${stats.riverside.goals} ${TEAMS.riverside.short}`,
    summary:
      mode === "fan"
        ? `${goals.length ? `${goals.length} goal${goals.length === 1 ? "" : "s"} so far.` : "Still waiting for the breakthrough."} ${insights[0]?.explanation ?? "No strong recent change has met our evidence threshold. This match is still taking shape."}`
        : `Shots: ${stats.harbor.shots}–${stats.riverside.shots}. Event-model xG: ${stats.harbor.xg.toFixed(2)}–${stats.riverside.xg.toFixed(2)}. Pass completion: ${stats.harbor.accuracy}%–${stats.riverside.accuracy}%. ${insights[0]?.analyst ?? "No recent pattern meets the detection thresholds."}`,
    moments: visible
      .filter(
        (e) =>
          ["goal", "substitution"].includes(e.type) ||
          (e.type === "shot" && e.outcome !== "goal" && (e.xg ?? 0) >= 0.2),
      )
      .slice(-6)
      .map((e) => ({
        event: e,
        label:
          e.type === "goal"
            ? `Goal · ${player(e.playerId).name}`
            : e.type === "substitution"
              ? `${player(e.playerId).name} comes on`
              : `Chance · ${player(e.playerId).name}`,
      })),
    watch:
      time >= DURATION
        ? "Full time. Revisit a key moment to see how the match unfolded."
        : (insights[0]?.watch ??
          "Watch for the first sustained change in ball wins or shot frequency."),
  };
}
