import type { MatchData } from "./model";
import { matchStatistics } from "./analytics";
import { referenceDistance } from "./coordinates";
export function benchmarkMatch(match: MatchData) {
  const stats = matchStatistics(match, match.duration);
  const passes = match.events.filter((e) => e.type === "pass");
  const shots = match.events.filter((e) => e.type === "shot");
  const distances = passes.flatMap((e) =>
    e.position && e.end ? [referenceDistance(e.position, e.end)] : [],
  );
  const sequences = new Map<string, number>();
  const involvement: Record<string, number> = {};
  const distribution: Record<string, number> = {};
  for (const e of match.events) {
    distribution[e.type] = (distribution[e.type] ?? 0) + 1;
    if (e.actorId) involvement[e.actorId] = (involvement[e.actorId] ?? 0) + 1;
    if (e.possessionId !== null && ["pass", "carry", "shot"].includes(e.type)) {
      const key = `${e.period}-${e.possessionId}-${e.team}`;
      sequences.set(key, (sequences.get(key) ?? 0) + 1);
    }
  }
  const mean = (values: number[]) =>
    values.length
      ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
      : null;
  const nineties = match.duration / 5400;
  return {
    id: match.id,
    provider: match.provenance.provider,
    seconds: match.duration,
    passes: passes.length,
    passesPer90: Number((passes.length / nineties).toFixed(2)),
    passCompletion: mean(
      passes
        .filter((e) => e.success !== undefined)
        .map((e) => (e.success ? 100 : 0)),
    ),
    unknownPassOutcomes:
      stats.harbor.unknownPassOutcomes + stats.riverside.unknownPassOutcomes,
    meanPassReferenceMetres: mean(distances),
    passDistanceSamples: distances.length,
    shots: shots.length,
    shotsPer90: Number((shots.length / nineties).toFixed(2)),
    meanShotX: mean(shots.flatMap((e) => (e.position ? [e.position.x] : []))),
    meanShotY: mean(shots.flatMap((e) => (e.position ? [e.position.y] : []))),
    meanSequenceActions:
      match.capabilities.possession === "unavailable"
        ? null
        : mean([...sequences.values()]),
    eventDistribution: distribution,
    playerInvolvement: involvement,
    attackingActivity: match.periods.flatMap((p) =>
      Array.from(
        { length: Math.max(1, Math.ceil((p.end - p.start) / 900)) },
        (_, i) => ({
          period: p.id,
          from: p.start + i * 900,
          to: Math.min(p.end, p.start + (i + 1) * 900),
          actions: match.events.filter(
            (e) =>
              e.period === p.id &&
              e.time >= p.start + i * 900 &&
              (e.time < p.start + (i + 1) * 900 || e.time === p.end) &&
              ["pass", "carry", "shot"].includes(e.type) &&
              (e.position?.x ?? -1) >= 66.7,
          ).length,
        }),
      ),
    ),
  };
}
