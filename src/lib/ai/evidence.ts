import { evidenceEvent } from "../sources/evidence-view";
import { z } from "zod";
import {
  detectInsights,
  rankInsights,
  recap,
  type Mode,
  type StoryPreferences,
  type Insight,
} from "../intelligence";
import {
  clock,
  DURATION,
  eventsAt,
  player,
  statistics,
  TEAMS,
  type MatchEvent,
} from "../match";
export const preferencesSchema = z
  .object({
    team: z.enum(["all", "harbor", "riverside"]).optional(),
    player: z.string().max(40).optional(),
    categories: z
      .array(z.enum(["pressure", "chances", "rhythm"]))
      .max(3)
      .optional(),
    seenEvidenceIds: z.array(z.string().max(40)).max(200).optional(),
  })
  .strict();
export const matchRequestSchema = z.object({
  scenario: z.enum(["pressure", "substitution", "quiet"]),
  time: z.number().int().min(0).max(DURATION),
  mode: z.enum(["fan", "analyst"]),
  preferences: preferencesSchema.optional(),
});
export const LIMITATIONS = [
  "Synthetic match events; no continuous tracking or off-ball positions.",
  "Count comparisons are descriptive thresholds, not statistical significance or proof of causation.",
  "Event-model xG is a generator parameter, not a trained model.",
  "AI selects and orders verified wording. Human review is still needed to judge relevance and narrative quality.",
];
export type Fact = {
  id: string;
  text: string;
  evidenceIds: string[];
  priority: number;
  kind: "score" | "moment" | "pattern" | "abstention";
  why: string;
  watch: string;
};
export type EvidencePacket = {
  id: string;
  time: number;
  mode: Mode;
  facts: Fact[];
  events: (Pick<MatchEvent, "id" | "time" | "playerId" | "team"> & {
    type: string;
  })[];
  comparisons: Insight[];
  ranking: (Omit<ReturnType<typeof rankInsights>[number], "insight"> & {
    insight: Pick<Insight, "id">;
  })[];
  limitations: string[];
  fullTime: boolean;
};
export function verifyInsight(insight: Insight, events: MatchEvent[]) {
  const actual = detectInsights(events, insight.end).find(
    (i) => i.id === insight.id,
  );
  if (!actual || JSON.stringify(actual) !== JSON.stringify(insight))
    throw new Error("Evidence mismatch");
}
export function buildEvidence(
  all: MatchEvent[],
  time: number,
  mode: Mode,
  prefs: StoryPreferences = {},
  selected?: Insight,
): EvidencePacket {
  const visible = eventsAt(all, time);
  if (selected) verifyInsight(selected, visible);
  const comparisons = selected
    ? [selected]
    : rankInsights(detectInsights(visible, time), visible, mode, prefs).map(
        (r) => r.insight,
      );
  const ranking = rankInsights(comparisons, visible, mode, prefs);
  const facts: Fact[] = comparisons.map((i, index) => ({
    id: i.id,
    kind: "pattern",
    priority: 8 - index,
    text:
      mode === "fan"
        ? `${i.headline}. ${i.explanation}`
        : `${TEAMS[i.team].short}: ${i.analyst}`,
    evidenceIds: [...i.evidenceIds, ...i.baselineIds],
    why: i.why,
    watch: i.watch,
  }));
  if (selected) {
    const support = visible.filter((e) => selected.evidenceIds.includes(e.id));
    const actors = [...new Set(support.map((e) => e.playerId))];
    facts.push({
      id: "contributors",
      kind: "pattern",
      priority: 4,
      text:
        mode === "fan"
          ? `The supporting actions came from ${actors.map((id) => player(id).name).join(", ")}.`
          : `The sample contains ${support.length} actions involving ${actors.length} distinct players; these are recorded involvements, not a measure of off-ball influence.`,
      evidenceIds: selected.evidenceIds,
      why: "These names identify recorded involvements only; they do not establish who caused the change.",
      watch: selected.watch,
    });
    if (selected.category === "pressure") {
      const followThrough = support.filter((win) =>
        visible.some(
          (e) =>
            e.type === "shot" &&
            e.team === win.team &&
            e.possessionId === win.possessionId &&
            e.time > win.time,
        ),
      );
      const shots = visible.filter(
        (e) =>
          e.type === "shot" &&
          followThrough.some(
            (win) =>
              e.team === win.team &&
              e.possessionId === win.possessionId &&
              e.time > win.time,
          ),
      );
      facts.push({
        id: "follow-through",
        kind: "pattern",
        priority: 7,
        text:
          mode === "fan"
            ? `${followThrough.length} of these high ball wins were followed by a shot in the same recorded possession.`
            : `Same-possession follow-through: ${followThrough.length}/${support.length} high wins had a later recorded shot by ${clock(time)}. Association does not establish causation.`,
        evidenceIds: [...selected.evidenceIds, ...shots.map((e) => e.id)],
        why: "A shorter route to goal is useful only if the attack develops; same-possession events show what was actually recorded.",
        watch: selected.watch,
      });
    }
    facts.push({
      id: "comparison-caution",
      kind: "pattern",
      priority: mode === "analyst" ? 7 : 3,
      text:
        selected.previous === 0
          ? "The earlier window contains no matching actions, so a percentage increase would be misleading. Compare the recorded counts instead."
          : "Equal windows make these counts comparable, but the difference alone does not prove a lasting tactical change.",
      evidenceIds: [...selected.evidenceIds, ...selected.baselineIds],
      why: "A descriptive change is a reason to look closer, not proof of a cause.",
      watch: selected.watch,
    });
  }
  if (!selected) {
    const stats = statistics(visible);
    const goals = visible.filter((e) => e.type === "goal");
    facts.unshift({
      id: "score",
      kind: "score",
      priority: 10,
      text: `At ${clock(time)}, ${TEAMS.harbor.short} ${stats.harbor.goals}–${stats.riverside.goals} ${TEAMS.riverside.short}.`,
      evidenceIds: goals.map((e) => e.id),
      why: "The score records completed goals only.",
      watch: "Watch how the next recorded passage develops.",
    });
    const moments = recap(visible, time, mode).moments;
    const latestGoal = goals.at(-1);
    if (latestGoal && !moments.some((m) => m.event.id === latestGoal.id))
      moments.unshift({
        event: latestGoal,
        label: `Goal by ${player(latestGoal.playerId).name}`,
      });
    for (const { event, label } of moments)
      facts.push({
        id: `moment-${event.id}`,
        kind: "moment",
        priority:
          event.type === "goal" ? 9 : event.type === "substitution" ? 6 : 5,
        text:
          mode === "fan"
            ? `${label} (${TEAMS[event.team].short}) at ${clock(event.time)}.`
            : `At ${clock(event.time)}, ${TEAMS[event.team].short}: ${label}${event.type === "shot" ? `; synthetic chance probability ${(event.xg ?? 0).toFixed(2)}` : ""}.`,
        evidenceIds: [event.id],
        why:
          event.type === "substitution"
            ? "A recorded personnel change; these events alone do not establish its tactical effect."
            : event.type === "goal"
              ? "A recorded scoring moment changed the score."
              : "A shot with a higher synthetic chance probability; this is not a calibrated prediction.",
        watch:
          event.type === "substitution"
            ? `Watch the recorded actions involving ${player(event.playerId).name}.`
            : "Watch whether subsequent attacks produce further attempts.",
      });
    if (!comparisons.length)
      facts.push({
        id: "no-pattern",
        kind: "abstention",
        priority: 7,
        text:
          time < 1800
            ? "There is not yet enough match time for two complete comparison windows."
            : "No recent change meets the selected evidence thresholds. There is no supported tactical shift to call.",
        evidenceIds: [],
        why: "Avoiding a weak claim is more useful than inventing a trend.",
        watch: "Watch for a sustained change in ball wins or shot frequency.",
      });
  }
  const ids = new Set(facts.flatMap((f) => f.evidenceIds));
  return {
    id: selected?.id ?? `recap-${time}`,
    time,
    mode,
    facts,
    events: visible.filter((e) => ids.has(e.id)).map(evidenceEvent),
    comparisons,
    ranking,
    limitations: LIMITATIONS,
    fullTime: time >= DURATION,
  };
}
