import {
  detectInsights,
  rankInsights,
  type Insight,
  type Mode,
} from "../intelligence";
import type { EvidencePacket, Fact } from "../ai/evidence";
import {
  eventClock,
  matchClock,
  recordedScore,
  type MatchData,
  type NormalizedEvent,
} from "./model";
import type { TeamId } from "../match";
export function historicalInsights(match: MatchData, time: number) {
  return detectInsights(match.events, time, {
    teams: match.teams,
    periodStart: time >= match.secondHalfStart ? match.secondHalfStart : 0,
    ballRecoveries: false,
  });
}
export function historicalStats(events: NormalizedEvent[], team: TeamId) {
  const own = events.filter((e) => e.team === team),
    passes = own.filter((e) => e.type === "pass");
  return {
    passes: passes.length,
    completed: passes.filter((e) => e.success === true).length,
    unknownPassOutcomes: passes.filter((e) => e.success === undefined).length,
    shots: own.filter((e) => e.type === "shot").length,
    attackingThird: own.filter(
      (e) =>
        ["pass", "shot", "touch"].includes(e.type) &&
        e.position &&
        e.position.x >= (100 / 3) * 2,
    ).length,
    interceptions: own.filter((e) => e.source.tags.includes(1401)).length,
    forward: passes.filter((e) => e.position && e.end && e.end.x > e.position.x)
      .length,
    backward: passes.filter(
      (e) => e.position && e.end && e.end.x < e.position.x,
    ).length,
  };
}
export function eventDescription(match: MatchData, e: NormalizedEvent) {
  const who =
    match.players.find((p) => p.id === e.playerId)?.name ??
    "Unidentified player";
  if (e.type === "substitution")
    return `${who} on for ${match.players.find((p) => p.id === e.outgoingId)?.name ?? "unidentified player"} (minute precision)`;
  if (e.scoringTeam)
    return `${e.ownGoal ? "Own goal" : "Goal"} by ${who} · ${match.teams[e.scoringTeam].name}`;
  return `${e.source.eventType} · ${who}`;
}
/** A contiguous recorded passage, deliberately not labelled a possession. */
export function historicalSequence(
  match: MatchData,
  selected: NormalizedEvent,
  cutoff: number,
) {
  const preceding = match.events.filter(
    (e) =>
      e.time <= cutoff &&
      e.time <= selected.time &&
      e.period === selected.period,
  );
  const index = preceding.findIndex((e) => e.id === selected.id);
  if (index < 0) return [];
  const passage = [selected];
  for (let i = index - 1; i >= 0 && passage.length < 8; i--) {
    const e = preceding[i];
    if (
      e.team !== selected.team ||
      !["pass", "shot", "touch", "corner"].includes(e.type) ||
      passage[0].time - e.time > 15
    )
      break;
    passage.unshift(e);
  }
  return passage;
}
export function historicalEvidence(
  match: MatchData,
  time: number,
  mode: Mode,
  selectedId?: string,
): EvidencePacket {
  if (!Number.isFinite(time) || time < 0 || time > match.duration)
    throw new Error("Invalid replay timestamp");
  const visible = match.events.filter((e) => e.time <= time);
  const detected = historicalInsights(match, time);
  const selected = selectedId
    ? detected.find((i) => i.id === selectedId)
    : undefined;
  if (selectedId && !selected)
    throw new Error("No verified pattern at this timestamp");
  const comparisons = selected ? [selected] : detected;
  const ranking = rankInsights(comparisons, visible, mode);
  const facts: Fact[] = ranking.map(({ insight: i }, n) => ({
    id: i.id,
    kind: "pattern",
    priority: 8 - n,
    text:
      mode === "fan"
        ? `${i.headline}. ${i.explanation}`
        : `${match.teams[i.team].name}: ${i.analyst}`,
    evidenceIds: [...i.evidenceIds, ...i.baselineIds],
    why: i.why,
    watch: i.watch,
  }));
  if (!selected) {
    const score = recordedScore(visible),
      goals = visible.filter((e) => e.scoringTeam);
    facts.unshift({
      id: "score",
      kind: "score",
      priority: 10,
      text: `At ${matchClock(match, time)}, ${match.teams.harbor.name} ${score.harbor}–${score.riverside} ${match.teams.riverside.name}.`,
      evidenceIds: goals.map((e) => e.id),
      why: "Scoring actions reconcile with the published match result; failed saves are not counted as additional goals.",
      watch: "Watch how the next recorded passage develops.",
    });
    const moments = visible
      .filter(
        (e) => e.scoringTeam || e.type === "substitution" || e.type === "shot",
      )
      .slice(-8);
    const latestGoal = goals.at(-1);
    if (latestGoal && !moments.includes(latestGoal))
      moments.unshift(latestGoal);
    for (const e of moments)
      facts.push({
        id: `moment-${e.id}`,
        kind: "moment",
        priority: e.scoringTeam ? 9 : 5,
        text: `${eventClock(match, e)}: ${eventDescription(match, e)}.`,
        evidenceIds: [e.id],
        why: e.scoringTeam
          ? "A recorded scoring action changed the score."
          : e.type === "shot"
            ? "A recorded attempt; this dataset supplies no calibrated chance probability."
            : "A personnel change is recorded, but its tactical effect is not established.",
        watch: "Watch whether subsequent attacks produce further attempts.",
      });
    if (!comparisons.length)
      facts.push({
        id: "no-pattern",
        kind: "abstention",
        priority: 7,
        text:
          time - (time >= match.secondHalfStart ? match.secondHalfStart : 0) <
          1800
            ? "Two complete comparison windows within this half are not yet available."
            : "No recent change meets the evidence thresholds. There is no supported tactical shift to call.",
        evidenceIds: [],
        why: "Avoiding a weak claim is more useful than inventing a trend.",
        watch:
          "Watch for a sustained change in passing activity or shot frequency.",
      });
  }
  // Descriptive context derived at the same cutoff. No full-match totals enter an AI packet.
  const recent = visible.filter((e) => e.time > time - 900);
  const contributorEvents = selected
    ? visible.filter((e) => selected.evidenceIds.includes(e.id))
    : recent.filter((e) => e.type === "shot");
  const counts = new Map<string, NormalizedEvent[]>();
  contributorEvents
    .filter((e) => e.playerId !== "0")
    .forEach((e) =>
      counts.set(e.playerId, [...(counts.get(e.playerId) ?? []), e]),
    );
  const leader = [...counts].sort((a, b) => b[1].length - a[1].length)[0];
  if (leader)
    facts.push({
      id: "contributor",
      kind: "pattern",
      priority: 5,
      text: `${match.players.find((p) => p.id === leader[0])?.name ?? "Unidentified player"} contributed ${leader[1].length} ${selected ? selected.metric.toLowerCase() : "shots"} in this sample.`,
      evidenceIds: leader[1].map((e) => e.id),
      why: "Recorded involvements do not measure off-ball influence.",
      watch: "Watch the player's next recorded involvement.",
    });
  const ids = new Set(facts.flatMap((f) => f.evidenceIds));
  if ([...ids].some((id) => !visible.some((e) => e.id === id)))
    throw new Error("Evidence cutoff violation");
  return {
    id: selected?.id ?? `historical-${match.id}-recap-${time}`,
    time,
    mode,
    facts,
    // A goal stays a shot in normalized data; the evidence view marks scoring actions for requiredContext.
    events: visible
      .filter((e) => ids.has(e.id))
      .map((e) => ({
        id: e.id,
        time: e.time,
        team: e.team,
        playerId: e.playerId,
        type: e.scoringTeam ? "goal" : e.type,
        period: e.period,
        periodSeconds: e.periodSeconds,
        sourceEventId: e.source.eventId,
      })),
    comparisons,
    ranking: ranking.map(({ insight, ...rest }) => ({
      ...rest,
      insight: { id: insight.id },
    })),
    limitations: [match.attribution, ...match.limitations],
    fullTime: time >= match.duration,
  };
}
