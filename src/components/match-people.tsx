"use client";
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
          {match.players
            .filter((p) => p.team === team)
            .map((p) => (
              <button
                className="player-row"
                key={p.id}
                onClick={() => onFocus(p.id)}
              >
                <span className={`number ${team}`}>{p.number ?? "—"}</span>
                <strong>{p.name}</strong>
                <span>{playerStatus(p.id)}</span>
              </button>
            ))}
          <p className="limitations">
            Roster and substitutions from match metadata; substitution times may
            be approximate. Shirt numbers and formation are shown only when
            supplied. This is not a tracking view.
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
        {who.role} · {match.teams[who.team].name} · {playerStatus(who.id)} at{" "}
        {matchClock(match, time)}
      </p>
      <div className="player-metrics">
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
      <details>
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
      </details>
    </section>
  );
}
