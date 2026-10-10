import type { MatchData, MatchPlayer, NormalizedEvent } from "./model";

export const isGoalkeeper = (player: MatchPlayer) =>
  /^(goalkeeper|goal keeper|gk)$/i.test(player.role.trim());

/** Count only the keeper's on-pitch spells, respecting same-time event order. */
export function goalkeeperStatistics(
  match: MatchData,
  player: MatchPlayer,
  time: number,
) {
  const cutoff = Math.max(0, Math.min(time, match.duration));
  let playing = match.teams[player.team].lineup.includes(player.id);
  let enteredAt: number | null = playing ? 0 : null;
  let secondsPlayed = 0;
  let goalsConceded = 0;
  let shotsOnTargetFaced = 0;
  let passAttempts = 0;
  let completedPasses = 0;
  let knownPasses = 0;
  const saves: NormalizedEvent[] = [];
  const shotsFaced: NormalizedEvent[] = [];
  for (const event of match.events) {
    if (event.time > cutoff) break;
    if (event.period === "PS") continue;
    const sentOff =
      event.playerId === player.id &&
      ["Red Card", "Second Yellow"].includes(String(event.qualifiers.card));
    if (
      (event.type === "substitution" && event.outgoingId === player.id) ||
      sentOff
    ) {
      if (enteredAt !== null) secondsPlayed += event.time - enteredAt;
      playing = false;
      enteredAt = null;
    }
    if (event.type === "substitution" && event.playerId === player.id) {
      playing = true;
      enteredAt = event.time;
    }
    if (!playing) continue;
    if (event.scoringTeam && event.scoringTeam !== player.team) goalsConceded++;
    if (event.type === "shot" && event.team !== player.team) {
      shotsFaced.push(event);
      if (
        event.qualifiers.onTarget === true ||
        event.outcome === "saved" ||
        event.outcome === "goal"
      )
        shotsOnTargetFaced++;
      // A saved shot is credited only when the source names this keeper.
      if (event.outcome === "saved" && event.goalkeeperId === player.id)
        saves.push(event);
    }
    if (event.type === "pass" && event.playerId === player.id) {
      passAttempts++;
      if (event.success !== undefined) knownPasses++;
      if (event.success === true) completedPasses++;
    }
  }
  if (enteredAt !== null) secondsPlayed += cutoff - enteredAt;
  return {
    saves:
      match.capabilities.goalkeeperSaves && match.capabilities.lineups
        ? saves.length
        : null,
    shotsOnTargetFaced:
      match.capabilities.shotOutcomes && match.capabilities.lineups
        ? shotsOnTargetFaced
        : null,
    goalsConceded: match.capabilities.lineups ? goalsConceded : null,
    passAttempts,
    passCompletion:
      knownPasses && knownPasses === passAttempts
        ? Math.round((100 * completedPasses) / knownPasses)
        : null,
    secondsPlayed,
    shotsFaced,
    // Reserve keepers and partial appearances do not receive a full-match clean sheet.
    cleanSheet:
      match.status === "finished" &&
      match.duration > 0 &&
      cutoff >= match.duration &&
      secondsPlayed >= match.duration &&
      goalsConceded === 0 &&
      match.capabilities.lineups,
  };
}
