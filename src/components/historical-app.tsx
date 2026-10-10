"use client";
import { useMatchPlayback } from "./use-match-playback";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { BrandImage, useAppearance } from "./appearance";
import { Pitch } from "./pitch";
import { Metric, Reveal, SelectionGroup, usePageVisibility } from "./motion";
import { InsightNotice } from "./insight-notice";
import {
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  ListVideo,
  FootballPitch,
  BarChart3,
  X,
} from "./icons";
import { providerLabel } from "./provenance";
import { type Fixture } from "@/lib/sources/catalog";
import {
  periodAt,
  validateMatch,
  eventClock,
  matchClock,
  pitchEvents,
  recordedScore,
  type MatchData,
  type NormalizedEvent,
} from "@/lib/sources/model";
import {
  eventDescription,
  historicalEvidence,
  historicalInsights,
  historicalSequence,
  historicalStats,
} from "@/lib/sources/intelligence";
import type { Mode } from "@/lib/intelligence";
import type { Narrative } from "@/lib/foundry";
import type { Provenance } from "@/lib/ai/service";

export function HistoricalApp({
  sourceSelector,
  fixtures,
}: {
  sourceSelector: ReactNode;
  fixtures: readonly Fixture[];
}) {
  useAppearance();
  const [id, setId] = useState<string>(fixtures[0].id);
  const [match, setMatch] = useState<MatchData | null>(null),
    [error, setError] = useState("");
  const [spoilers, setSpoilers] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setMatch(null);
    setError("");
    fetch(`/api/historical/${id}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("Match unavailable");
        return r.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) setMatch(validateMatch(data));
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "The recorded match could not be loaded. Choose another match or try again.",
          );
      });
    return () => controller.abort();
  }, [id]);
  const fixture = fixtures.find((f) => f.id === id)!;
  return (
    <div className="app-shell historical-shell">
      <aside className="sidebar" aria-label="Application navigation">
        <a className="brand" href="/" aria-label="Between the Lines home">
          <BrandImage className="brand-wordmark" />
          <BrandImage className="brand-symbol" symbol />
        </a>
        <nav className="main-navigation" aria-label="Main navigation">
          <a className="nav-item active" href="#historical-replay">
            <FootballPitch size={20} />
            <span>Match centre</span>
          </a>
          <a className="nav-item" href="#historical-statistics">
            <BarChart3 size={20} />
            <span>Match stats</span>
          </a>
        </nav>
        <p className="historical-sidebar-note">
          Real football.
          <br />
          Evidence in every moment.
        </p>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <a
            className="mobile-brand"
            href="/"
            aria-label="Between the Lines home"
          >
            <BrandImage />
          </a>
          <div className="breadcrumb">
            Match centre <span>Historical replay</span>
          </div>
          <span className="engine-badge">{fixture.provider}</span>
        </header>
        <main>
          {sourceSelector}
          <div className="historical-picker panel">
            <label>
              <span className="eyebrow">CHOOSE A RECORDED MATCH</span>
              <select
                aria-label="Historical match"
                value={id}
                onChange={(e) => setId(e.target.value)}
              >
                {fixtures.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} · {m.date}
                  </option>
                ))}
              </select>
            </label>
            <div className="historical-availability">
              <span>{fixture.competition}</span>
              <small>Complete event replay · Both halves</small>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={spoilers}
                onChange={(e) => setSpoilers(e.target.checked)}
              />{" "}
              Reveal final score
            </label>
            {spoilers && match?.id === id && (
              <p data-testid="final-score">
                Final score: {match.teams.harbor.name} {match.finalScore.harbor}
                –{match.finalScore.riverside} {match.teams.riverside.name}
              </p>
            )}
          </div>
          {error ? (
            <p role="alert">{error}</p>
          ) : match?.id === id ? (
            <HistoricalReplay key={match.id} match={match} />
          ) : (
            <p role="status">Loading recorded events…</p>
          )}
        </main>
      </div>
    </div>
  );
}
function HistoricalReplay({ match }: { match: MatchData }) {
  const [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(8);
  const [mode, setMode] = useState<Mode>("fan"),
    [selected, setSelected] = useState<string | null>(null),
    [selectedInsight, setSelectedInsight] = useState<string | null>(null);
  const [sequence, setSequence] = useState(false),
    [playerFilter, setPlayerFilter] = useState("");
  const [provider, setProvider] = useState("offline"),
    [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<{
    narrative: Narrative | null;
    provenance: Provenance;
    notice?: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [recapOpen, setRecapOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    request = useRef<AbortController | null>(null);
  const visiblePage = usePageVisibility();
  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((x) => setProvider(x.mode))
      .catch(() => {});
    return () => request.current?.abort();
  }, []);
  useMatchPlayback(
    time,
    setTime,
    playing && visiblePage && !recapOpen,
    speed,
    match.duration,
  );
  useEffect(() => {
    if (time >= match.duration) setPlaying(false);
  }, [time, match.duration]);
  useEffect(() => {
    if (recapOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [recapOpen]);
  const visible = useMemo(
    () => match.events.filter((e) => e.time <= time),
    [match, time],
  );
  const score = useMemo(() => recordedScore(visible), [visible]);
  const insights = useMemo(
    () => historicalInsights(match, time),
    [match, time],
  );
  const insight =
    insights.find((i) => `${i.team}-${i.category}` === selectedInsight) ??
    insights[0];
  const active = visible.find((e) => e.id === selected) ?? visible.at(-1);
  const playerName = (id: string) =>
    match.players.find((p) => p.id === id)?.name ?? "Unidentified player";
  const packet = useMemo(
    () => historicalEvidence(match, time, mode),
    [match, time, mode],
  );
  const insightPacket = useMemo(
    () => (insight ? historicalEvidence(match, time, mode, insight.id) : null),
    [match, time, mode, insight],
  );
  const pitch = useMemo(() => {
    if (sequence && active)
      return pitchEvents(historicalSequence(match, active, time));
    if (selectedInsight && insight)
      return pitchEvents(
        visible.filter((e) => insight.evidenceIds.includes(e.id)),
      );
    return pitchEvents(
      visible
        .filter(
          (e) =>
            (!playerFilter || e.playerId === playerFilter) &&
            e.period === periodAt(match, time).id,
        )
        .slice(-10),
    );
  }, [
    match,
    visible,
    active,
    sequence,
    time,
    selectedInsight,
    insight,
    playerFilter,
  ]);
  function invalidate() {
    request.current?.abort();
    setAnswer(null);
    setNotice("");
    setLoading(false);
  }
  function seek(value: number) {
    invalidate();
    setTime(Math.min(match.duration, Math.max(0, value)));
    setPlaying(false);
    setSelected(null);
    setSequence(false);
    setSelectedInsight(null);
  }
  function choose(event: NormalizedEvent) {
    invalidate();
    setPlaying(false);
    setSelected(event.id);
    setSequence(true);
    setSelectedInsight(null);
  }
  async function narrate(recap: boolean) {
    if (loading) return;
    invalidate();
    setPlaying(false);
    setLoading(true);
    const controller = new AbortController();
    request.current = controller;
    try {
      const res = await fetch("/api/historical/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          matchId: match.id,
          time,
          mode,
          ...(!recap && insight ? { insightId: insight.id } : {}),
        }),
      });
      if (!res.ok) throw new Error("Narration unavailable");
      const result = await res.json();
      if (!controller.signal.aborted) {
        setAnswer(result);
        setNotice(result.notice ?? "");
      }
    } catch {
      if (!controller.signal.aborted)
        setNotice(
          "The explanation could not be loaded. Verified event intelligence remains available.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  const answerPanel = (recap: boolean) => (
    <>
      {answer?.narrative && (
        <div className="historical-narrative">
          <p>{answer.narrative.explanation}</p>
          <h3>Why it matters</h3>
          <p>{answer.narrative.why}</p>
          <h3>What to watch next</h3>
          <p>{answer.narrative.watch}</p>
        </div>
      )}
      <button
        className="narrate-button"
        disabled={loading}
        onClick={() => narrate(recap)}
      >
        {loading
          ? "Checking the evidence…"
          : provider === "offline"
            ? "Verify this explanation"
            : `Explain with ${providerLabel(provider)}`}
      </button>
      <p className="historical-provider">
        {answer
          ? providerLabel(answer.provenance.provider)
          : "Deterministic offline intelligence"}
        {answer?.provenance.model ? ` · ${answer.provenance.model}` : ""}
        {answer?.provenance.cached ? " · Cached" : ""}. AI runs only when
        requested.
      </p>
      {notice && <p role="status">{notice}</p>}
      {answer && (
        <details className="provenance">
          <summary>How Between the Lines knows</summary>
          <div className="provenance-content">
            <p>
              Evidence through {matchClock(match, answer.provenance.cutoff)}. AI
              selects verified wording; it cannot invent claims.
            </p>
            {answer.provenance.facts.map((f) => (
              <p key={f.id}>{f.text}</p>
            ))}
            <ul>
              {answer.provenance.validation.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
            <p>
              {answer.provenance.activity.join(" · ") ||
                "No completed AI tool activity."}
            </p>
          </div>
        </details>
      )}
    </>
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE STORY AS IT HAPPENED</div>
          <h1>{insight?.headline ?? "Every moment has a story"}</h1>
          <p>
            Historical event replay ·{" "}
            {new Date(match.date!).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </p>
        </div>
      </div>
      <section
        className="scoreboard historical-scoreboard"
        aria-label="Match scoreboard"
        data-match-id={match.id}
      >
        <div className="competition">
          <strong>{match.competition}</strong>
          <span>Recorded events · Spoiler-safe playback</span>
        </div>
        <div className="score-match">
          <div className="team-name home">
            <span>
              {match.teams.harbor.name}
              <small>HOME · BLUE CIRCLES</small>
            </span>
          </div>
          <div className="score">
            <strong data-testid="score">
              <Metric value={score.harbor} important />
              <span className="score-separator">:</span>
              <Metric value={score.riverside} important />
            </strong>
            <span className="match-clock" data-testid="clock">
              <time>{matchClock(match, time)}</time>
              <span>
                {time >= match.duration ? "END" : periodAt(match, time).id}
              </span>
            </span>
          </div>
          <div className="team-name">
            <span>
              {match.teams.riverside.name}
              <small>AWAY · RED SQUARES</small>
            </span>
          </div>
        </div>
        <div className="score-right">
          <span className={`live-label ${playing ? "is-playing" : ""}`}>
            <span />
            {playing
              ? "REPLAYING"
              : time >= match.duration
                ? "REPLAY COMPLETE"
                : "PAUSED"}
          </span>
        </div>
      </section>
      <div className="view-toolbar">
        <button
          className="catchup-button"
          onClick={() => {
            invalidate();
            setPlaying(false);
            setRecapOpen(true);
          }}
        >
          <ListVideo size={20} />
          Catch me up <ArrowRight size={16} />
        </button>
        <SelectionGroup
          className="mode-switch"
          label="Viewing mode"
          value={mode}
        >
          {(["fan", "analyst"] as const).map((m) => (
            <button
              key={m}
              className={mode === m ? "selected" : ""}
              aria-pressed={mode === m}
              onClick={() => {
                invalidate();
                setMode(m);
              }}
            >
              {m === "fan" ? "Fan mode" : "Analyst mode"}
            </button>
          ))}
        </SelectionGroup>
      </div>
      <InsightNotice
        insights={insights}
        playing={playing}
        onSelect={(i) => {
          invalidate();
          setPlaying(false);
          setSelectedInsight(`${i.team}-${i.category}`);
          setSelected(null);
          setSequence(false);
        }}
      />
      <div className="match-grid section-enter" id="historical-replay">
        <div className="match-left">
          <section className="panel pitch-panel">
            <div className="panel-header">
              <h2>
                {sequence
                  ? "Recorded passage"
                  : selectedInsight
                    ? "Where it happened"
                    : "Historical replay"}
              </h2>
              {(sequence || selectedInsight) && (
                <button
                  className="text-button"
                  onClick={() => {
                    setSequence(false);
                    setSelected(null);
                    setSelectedInsight(null);
                  }}
                >
                  Clear selection
                </button>
              )}
            </div>
            <p className="pitch-caption">
              Recorded actions only. Numbers show event order, not player
              positions.
            </p>
            <div className="pitch-topline">
              <span>
                <i className="team-marker harbor" />
                {match.teams.harbor.name}
                <ArrowRight size={16} />
              </span>
              <span>
                <ArrowLeft size={16} />
                {match.teams.riverside.name}
                <i className="team-marker riverside" />
              </span>
            </div>
            <Pitch
              events={pitch}
              selected={active?.id}
              onSelect={(e) => {
                const original = visible.find((v) => v.id === e.id);
                if (original) choose(original);
              }}
              sequence
              includeAllActions
              identities={{
                teams: match.teams,
                player: (id) => ({ name: playerName(id), number: null }),
              }}
              formatTime={(t) => matchClock(match, t)}
            />
            <div className="event-inspector">
              <div>
                <span className="card-kicker">
                  {active ? "RECORDED ACTION" : "READY TO REPLAY"}
                </span>
                <p>
                  {active
                    ? `${eventClock(match, active)} · ${eventDescription(match, active)}`
                    : "Press play to follow the recorded events."}
                </p>
                {active && (
                  <small>
                    Source ID: {active.source.eventId}
                    {!active.position ? " · No recorded pitch location" : ""}
                  </small>
                )}
              </div>
            </div>
            <div className="playback">
              <button
                className="play-button"
                aria-label={playing ? "Pause match" : "Play match"}
                onClick={() => {
                  invalidate();
                  setSelected(null);
                  setSequence(false);
                  setSelectedInsight(null);
                  if (time >= match.duration) setTime(0);
                  setPlaying(!playing);
                }}
              >
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <div className="timeline">
                <input
                  type="range"
                  aria-label="Match timeline"
                  aria-valuetext={matchClock(match, time)}
                  style={
                    {
                      "--progress": `${(time / match.duration) * 100}%`,
                    } as CSSProperties
                  }
                  min="0"
                  max={match.duration}
                  step="1"
                  value={time}
                  onChange={(e) => seek(Number(e.target.value))}
                />
                <div className="historical-timeline-labels">
                  <span>{matchClock(match, time)}</span>
                  <span>Both halves + stoppage time</span>
                </div>
              </div>
              <select
                aria-label="Playback speed"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                {[1, 4, 8, 16, 32].map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
              <button
                className="icon-button"
                aria-label="Restart match"
                onClick={() => seek(0)}
              >
                <RotateCcw size={20} />
              </button>
            </div>
            <p className="limitations">
              Home attacks right, away attacks left in this schematic view
              throughout. Actual stadium direction is unknown. No motion between
              sparse event locations is inferred.
            </p>
          </section>
          <section className="panel historical-feed">
            <div className="panel-header">
              <h2>Recorded events</h2>
              <small>{visible.length} through this moment</small>
            </div>
            <label>
              Player contributions
              <select
                aria-label="Focus player"
                value={playerFilter}
                onChange={(e) => {
                  setPlayerFilter(e.target.value);
                  setSelected(null);
                  setSequence(false);
                  setSelectedInsight(null);
                }}
              >
                <option value="">All players</option>
                {match.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {match.teams[p.team].name}
                  </option>
                ))}
              </select>
            </label>
            <div
              className="event-feed-list"
              tabIndex={0}
              aria-label="Recorded events through playback time"
            >
              {visible
                .filter((e) => !playerFilter || e.playerId === playerFilter)
                .slice(-50)
                .reverse()
                .map((e) => (
                  <button
                    key={e.id}
                    aria-pressed={selected === e.id}
                    onClick={() => choose(e)}
                  >
                    <time>{eventClock(match, e)}</time>
                    <span>{eventDescription(match, e)}</span>
                  </button>
                ))}
              {!visible.length && <p>No recorded events yet.</p>}
            </div>
            <p className="limitations">
              Latest 50 matching records. Select an action to explore its
              preceding passage. A passage does not establish uninterrupted
              possession.
            </p>
          </section>
        </div>
        <aside
          className="panel historical-intelligence"
          aria-label="Match intelligence"
        >
          <div className="panel-header">
            <h2>Match intelligence</h2>
          </div>
          <p className="historical-provider">
            {provider === "offline"
              ? "Offline intelligence ready"
              : `${providerLabel(provider)} configured`}
          </p>
          {insights.length ? (
            <div className="historical-insights">
              {insights.map((i) => (
                <button
                  key={`${i.team}-${i.category}`}
                  className={`insight-card ${insight?.id === i.id ? "selected" : ""}`}
                  aria-pressed={insight?.id === i.id}
                  onClick={() => {
                    invalidate();
                    setPlaying(false);
                    setSelectedInsight(`${i.team}-${i.category}`);
                    setSequence(false);
                    setSelected(null);
                  }}
                >
                  <span className="card-kicker">
                    {i.metric} · {matchClock(match, i.start)}–
                    {matchClock(match, i.end)}
                  </span>
                  <h3>{i.headline}</h3>
                  <p>{mode === "fan" ? i.explanation : i.analyst}</p>
                  <span className="historical-count">
                    {i.current}{" "}
                    <small>vs {i.previous} in preceding 15 min</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="historical-empty">
              {packet.facts.find((f) => f.id === "no-pattern")?.text}
            </p>
          )}
          {insight && (
            <Reveal
              change={`${insight.team}-${insight.category}-${mode}`}
              className="historical-insight-detail"
            >
              <h3>Why it matters</h3>
              <p>{insight.why}</p>
              <h3>What to watch next</h3>
              <p>
                {time >= match.duration
                  ? "Replay complete. Revisit the recorded evidence."
                  : insight.watch}
              </p>
              {answerPanel(false)}
              <details className="provenance">
                <summary>
                  Inspect supporting events ({insight.evidenceIds.length})
                </summary>
                <div className="historical-evidence-list">
                  {visible
                    .filter((e) =>
                      [...insight.evidenceIds, ...insight.baselineIds].includes(
                        e.id,
                      ),
                    )
                    .map((e) => (
                      <button
                        className="text-button"
                        key={e.id}
                        onClick={() => choose(e)}
                      >
                        {eventClock(match, e)} · {eventDescription(match, e)}
                        <small>{e.source.eventId}</small>
                      </button>
                    ))}
                </div>
              </details>
              {mode === "analyst" &&
                insightPacket?.facts
                  .filter((f) => f.id === "contributor")
                  .map((f) => <p key={f.id}>{f.text}</p>)}
            </Reveal>
          )}
          <p className="limitations">
            No scripted match stories. Observations come from the events
            available at the replay timestamp.
          </p>
        </aside>
      </div>
      <section
        className="panel historical-statistics"
        id="historical-statistics"
      >
        <div className="panel-header">
          <h2>Match statistics</h2>
          <span>Through {matchClock(match, time)}</span>
        </div>
        <div className="historical-stat-grid">
          {(["harbor", "riverside"] as const).map((team) => {
            const s = historicalStats(visible, team);
            return (
              <div key={team}>
                <h3>{match.teams[team].name}</h3>
                <dl>
                  {[
                    ["Shots (including penalties)", s.shots],
                    ["Pass attempts", s.passes],
                    ["Completed passes", s.completed],
                    ["Attacking-third actions", s.attackingThird],
                    [
                      "Forward / backward passes",
                      `${s.forward} / ${s.backward}`,
                    ],
                    ["Interceptions / tagged actions", s.interceptions],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                {mode === "analyst" && (
                  <p>
                    {s.unknownPassOutcomes} passes lack a recorded outcome.
                    Attacking-third actions count passes, shots and touches;
                    interception tags do not prove a sustained recovery.
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <details className="historical-periods">
          <summary>Compare match periods</summary>
          <p>
            Recorded counts through this moment. Unequal period lengths are not
            rate comparisons.
          </p>
          {match.periods
            .filter((p) => p.start <= time)
            .map((p) => p.id)
            .map((p) => (
              <p key={p}>
                {p}:{" "}
                {(["harbor", "riverside"] as const)
                  .map((team) => {
                    const s = historicalStats(
                      visible.filter((e) => e.period === p),
                      team,
                    );
                    return `${match.teams[team].name}: ${s.shots} shots, ${s.passes} passes`;
                  })
                  .join(" · ")}
              </p>
            ))}
        </details>
        <p className="limitations">
          {match.capabilities.xg
            ? "Source xG is available where recorded. "
            : "xG is unavailable. "}
          Possession percentage, pressing intensity and continuous tracking are
          unavailable. Pass direction is relative to the attacking goal.
        </p>
      </section>
      <footer className="historical-attribution">
        <p>
          <a
            href={match.sourceUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
          >
            {match.attribution}
          </a>
        </p>
        <p>
          Adapted from the published event and match records.{" "}
          <a
            href={match.provenance.licenseUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
          >
            {match.provenance.license}
          </a>
          . No endorsement implied.
        </p>
        <details>
          <summary>Data conversions and limitations</summary>
          {match.limitations.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </details>
      </footer>
      <dialog
        ref={dialog}
        className="historical-recap"
        onCancel={() => {
          invalidate();
          setRecapOpen(false);
        }}
      >
        <div className="panel-header">
          <div>
            <span className="eyebrow">CATCH ME UP</span>
            <h2>The match so far</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={() => {
              invalidate();
              setRecapOpen(false);
            }}
          >
            <X size={20} />
          </button>
        </div>
        <p>
          Event-derived recap · {matchClock(match, time)} ·{" "}
          {mode === "fan" ? "Fan" : "Analyst"} mode
        </p>
        {recapOpen && (
          <>
            <div className="historical-recap-facts">
              {packet.facts
                .filter(
                  (f) =>
                    f.id === "score" ||
                    f.id === "no-pattern" ||
                    f.kind === "pattern",
                )
                .map((f) => (
                  <p key={f.id}>{f.text}</p>
                ))}
            </div>
            <h3>Important preceding events</h3>
            <div className="recap-timeline">
              {packet.facts
                .filter((f) => f.kind === "moment")
                .map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      const e = visible.find((e) =>
                        f.evidenceIds.includes(e.id),
                      );
                      if (e) {
                        choose(e);
                        setRecapOpen(false);
                      }
                    }}
                  >
                    {f.text}
                  </button>
                ))}
              {!packet.facts.some((f) => f.kind === "moment") && (
                <p>No major moments yet.</p>
              )}
            </div>
            <h3>What to watch next</h3>
            <p>
              {time >= match.duration
                ? "Replay complete. Revisit a key moment to see how the match unfolded."
                : (insight?.watch ??
                  "Watch for a sustained change in passing activity or shot frequency.")}
            </p>
            {answerPanel(true)}
            <p className="limitations">
              Only events through {matchClock(match, time)} enter this recap or
              its AI evidence packet. No future events are revealed.
            </p>
          </>
        )}
      </dialog>
    </>
  );
}
