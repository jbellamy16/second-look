"use client";
import {
  playerHighlights,
  eventMinute,
  type PlayerHighlights,
} from "@/lib/sources/player-highlights";
import {
  goalkeeperStatistics,
  isGoalkeeper,
} from "@/lib/sources/goalkeeper-statistics";
import { Goal, Pass, Substitution } from "./icons";
import { AnimatedDetails } from "./motion";
import {
  activeMatchPlayers,
  eventClock,
  matchClock,
  pitchEvents,
  type MatchData,
} from "@/lib/sources/model";
import { eventDescription } from "@/lib/sources/intelligence";
import { type MatchPreferences } from "./match-settings";
import { Crest } from "./team-identity";
import { Pitch } from "./pitch";
function PlayerBadges({
  highlights,
  match,
  substitutionsOnly = false,
}: {
  highlights: PlayerHighlights;
  match: MatchData;
  substitutionsOnly?: boolean;
}) {
  return (
    <span className="player-badges">
      {!substitutionsOnly &&
        highlights.goalEvents.map((event) => (
          <span
            key={event.id}
            className="player-badge"
            title={`Goal at ${eventClock(match, event)}`}
          >
            <Goal size={16} />
            <span className="sr-only">Goal </span>
            {eventMinute(match, event)}
          </span>
        ))}
      {!substitutionsOnly &&
        highlights.assistEvents.map((event) => (
          <span
            key={event.id}
            className="player-badge"
            title={`Assist at ${eventClock(match, event)}`}
          >
            <Pass size={16} />
            <span className="sr-only">Assist </span>
            {eventMinute(match, event)}
          </span>
        ))}
      {highlights.substitutions.map(({ event, direction }) => {
        const otherId = direction === "On" ? event.outgoingId : event.playerId;
        const other = match.players.find((p) => p.id === otherId)?.name;
        return (
          <span
            key={`${event.id}-${direction}`}
            className="player-badge"
            title={`Substituted ${direction.toLowerCase()} at ${eventClock(match, event)}`}
          >
            <Substitution size={16} />
            {direction}
            {other ? ` · ${other}` : ""} {eventMinute(match, event)}
          </span>
        );
      })}
    </span>
  );
}
export function MatchPeople({
  match,
  time,
  view,
  onFocus,
  focusedPlayer,
  setFocusedPlayer,
  onEvent,
  prefs,
  setPrefs,
}: {
  match: MatchData;
  prefs: MatchPreferences;
  setPrefs: (prefs: MatchPreferences) => void;
  time: number;
  view: "lineups" | "players";
  onFocus: (id: string) => void;
  focusedPlayer: string;
  setFocusedPlayer: (id: string) => void;
  onEvent: (id: string) => void;
}) {
  const active = activeMatchPlayers(match, time),
    visible = match.events.filter((e) => e.time <= time),
    who = match.players.find((p) => p.id === focusedPlayer) ?? match.players[0];
  const keeper = isGoalkeeper(who)
    ? goalkeeperStatistics(match, who, time)
    : null;
  const highlights = playerHighlights(match, time);
  const focusedHighlights = highlights.get(who.id)!;
  const contributions = visible.filter(
    (e) =>
      e.playerId === who.id &&
      e.type !== "possession" &&
      e.type !== "substitution",
  );
  const playerStatus = (id: string) =>
    active.some((p) => p.id === id)
      ? "On the pitch"
      : visible.some((e) => e.outgoingId === id)
        ? "Substituted off"
        : visible.some(
              (e) =>
                e.playerId === id &&
                (e.qualifiers.card === "Red Card" ||
                  e.qualifiers.card === "Second Yellow"),
            )
          ? "Sent off"
          : "Not on the pitch";
  const identities = {
    teams: match.teams,
    player: (id: string) =>
      match.players.find((p) => p.id === id) ?? {
        name: "Unidentified player",
        number: null,
      },
  };
  return view === "lineups" ? (
    <div className="lineup-grid">
      {(["harbor", "riverside"] as const).map((team) => (
        <section className="panel section-panel" key={team}>
          <div className="panel-header">
            <h2>{match.teams[team].name}</h2>
            <span>
              {match.teams[team].formation ?? "Formation not supplied"}
            </span>
          </div>
          {(["Starting XI", "Substitutes"] as const).map((group) => {
            const players = match.players.filter(
              (p) =>
                p.team === team &&
                match.teams[team].lineup.includes(p.id) ===
                  (group === "Starting XI"),
            );
            if (!players.length) return null;
            return (
              <div className="lineup-group" key={group}>
                <h3>{group}</h3>
                {players.map((p) => (
                  <button
                    className="player-row"
                    key={p.id}
                    onClick={() => onFocus(p.id)}
                  >
                    <span className={`number ${team}`}>{p.number ?? "—"}</span>
                    <span className="lineup-player-info">
                      <strong>{p.name}</strong>
                      <span className="sr-only">{playerStatus(p.id)}</span>
                    </span>
                    <PlayerBadges
                      highlights={highlights.get(p.id)!}
                      match={match}
                    />
                  </button>
                ))}
              </div>
            );
          })}
          <p className="limitations">
            Events through {matchClock(match, time)}. A ~ marks an approximate
            time.
          </p>
        </section>
      ))}
    </div>
  ) : (
    <section className="panel section-panel">
      <div className="panel-header">
        <h2>Player focus</h2>
        <select
          aria-label="Focus player"
          value={who.id}
          onChange={(e) => setFocusedPlayer(e.target.value)}
        >
          {match.players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {match.teams[p.team].name}
            </option>
          ))}
        </select>
      </div>
      <div className="player-identity-line">
        {match.kind === "synthetic" && <Crest team={who.team} small />}
        <h2>{who.name}</h2>
        <span className={`number ${who.team}`}>{who.number ?? "—"}</span>
      </div>
      <p>
        {who.role} · {match.teams[who.team].name}
      </p>
      <div className="player-status-line">
        <span className="player-badge">{playerStatus(who.id)}</span>
        {keeper?.cleanSheet && (
          <span className="player-badge">Clean sheet</span>
        )}
        <PlayerBadges
          highlights={focusedHighlights}
          match={match}
          substitutionsOnly
        />
      </div>
      {keeper ? (
        <>
          <div className="player-metrics goalkeeper-metrics">
            {[
              ["Saves", keeper.saves],
              ["On-target shots faced", keeper.shotsOnTargetFaced],
              ["Goals conceded", keeper.goalsConceded],
              [
                "Pass completion",
                keeper.passCompletion === null
                  ? null
                  : `${keeper.passCompletion}%`,
              ],
              ["Pass attempts", keeper.passAttempts],
            ].map(([label, value]) => (
              <div key={label}>
                <strong>{value ?? "—"}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="goalkeeper-stats-note">
            While on the pitch · through {matchClock(match, time)}
          </p>
        </>
      ) : (
        <div className="player-metrics">
          <div>
            <strong>{focusedHighlights.goals}</strong>
            <span>Goals</span>
          </div>
          {focusedHighlights.assists !== null && (
            <div>
              <strong>{focusedHighlights.assists}</strong>
              <span>Assists</span>
            </div>
          )}
          {(["pass", "shot", "touch"] as const).map((type) => (
            <div key={type}>
              <strong>
                {contributions.filter((e) => e.type === type).length}
              </strong>
              <span>
                {type === "pass"
                  ? "Pass attempts"
                  : type === "shot"
                    ? "Shots"
                    : "Touches"}
              </span>
            </div>
          ))}
        </div>
      )}
      <button
        className="secondary-button"
        aria-pressed={prefs.player === who.id}
        onClick={() =>
          setPrefs({ ...prefs, player: prefs.player === who.id ? "" : who.id })
        }
      >
        {prefs.player === who.id
          ? "Following this player"
          : "Follow this player"}
      </button>
      <Pitch
        events={pitchEvents(contributions)}
        identities={identities}
        formatTime={(t) => matchClock(match, t)}
        onSelect={(e) => onEvent(e.id)}
        aggregate
      />
      <p className="limitations">
        Recorded event locations through {matchClock(match, time)}. Density
        counts actions, not time spent or off-ball influence.
      </p>
      {keeper && (
        <AnimatedDetails className="keeper-shots">
          <summary>Inspect shots faced ({keeper.shotsFaced.length})</summary>
          <div className="event-feed-list">
            {[...keeper.shotsFaced].reverse().map((event) => (
              <button key={event.id} onClick={() => onEvent(event.id)}>
                <time>{eventClock(match, event)}</time>
                <span>
                  {event.outcome === "saved" && event.goalkeeperId === who.id
                    ? "Save"
                    : event.outcome === "goal"
                      ? "Goal conceded"
                      : event.outcome === "wide"
                        ? "Shot wide"
                        : "Shot"}{" "}
                  · {identities.player(event.playerId).name}
                </span>
              </button>
            ))}
            {!keeper.shotsFaced.length && (
              <p>No shots faced through this moment.</p>
            )}
          </div>
        </AnimatedDetails>
      )}
      <AnimatedDetails>
        <summary>Inspect contributions ({contributions.length})</summary>
        <div className="event-feed-list">
          {contributions
            .slice()
            .reverse()
            .map((e) => (
              <button key={e.id} onClick={() => onEvent(e.id)}>
                <time>{eventClock(match, e)}</time> {eventDescription(match, e)}
              </button>
            ))}
          {!contributions.length && (
            <p>No contributions recorded through this moment.</p>
          )}
        </div>
      </AnimatedDetails>
    </section>
  );
}
