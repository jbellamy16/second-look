"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Crosshair,
  Focus,
  Goal,
  LayoutGrid,
  ListVideo,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  activePlayers,
  clock,
  DEMO_TIME,
  DURATION,
  eventsAt,
  generateMatch,
  MatchEvent,
  PLAYERS,
  player,
  SCENARIOS,
  Scenario,
  sequenceFor,
  statistics,
  TeamId,
  TEAMS,
} from "@/lib/match";
import {
  Category,
  detectInsights,
  Insight,
  Mode,
  recap,
} from "@/lib/intelligence";
import type { Narrative } from "@/lib/foundry";
import { Pitch } from "./pitch";
type Section = "match" | "insights" | "stats" | "lineups" | "players";
type Prefs = {
  mode: Mode;
  team: TeamId | "all";
  player: string;
  categories: Category[];
};
const defaultPrefs: Prefs = {
  mode: "fan",
  team: "all",
  player: "",
  categories: ["pressure", "chances", "rhythm"],
};
function Crest({ team, small = false }: { team: TeamId; small?: boolean }) {
  return (
    <span
      className={`crest ${team} ${small ? "small" : ""}`}
      aria-hidden="true"
    >
      <Shield size={small ? 26 : 42} strokeWidth={1.3} />
      <span>{team === "harbor" ? "H" : "R"}</span>
    </span>
  );
}
function InsightIcon({ category }: { category: Category }) {
  return (
    <span className={`insight-icon ${category}`}>
      {category === "pressure" ? (
        <TrendingUp size={21} />
      ) : category === "chances" ? (
        <ArrowUpRight size={22} />
      ) : (
        <Activity size={21} />
      )}
    </span>
  );
}
export function MatchApp() {
  const [scenario, setScenario] = useState<Scenario>("pressure");
  const [time, setTime] = useState(DEMO_TIME),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(8);
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs),
    [ready, setReady] = useState(false);
  const [section, setSection] = useState<Section>("match"),
    [modal, setModal] = useState<"recap" | "settings" | "about" | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null),
    [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [tab, setTab] = useState<"visual" | "evidence" | "explanation">(
    "visual",
  );
  const [replay, setReplay] = useState<{ ids: string[]; index: number } | null>(
    null,
  );
  const [foundry, setFoundry] = useState(false),
    [loading, setLoading] = useState(false),
    [notice, setNotice] = useState("");
  const [narrative, setNarrative] = useState<{
    key: string;
    value: Narrative;
  } | null>(null);
  const [focusedPlayer, setFocusedPlayer] = useState("harbor-9");
  const requestVersion = useRef(0);
  const events = useMemo(() => generateMatch(scenario), [scenario]);
  const visible = useMemo(() => eventsAt(events, time), [events, time]);
  const stats = useMemo(() => statistics(visible), [visible]);
  const allInsights = useMemo(
    () => detectInsights(visible, time),
    [visible, time],
  );
  const insights = useMemo(
    () =>
      allInsights
        .filter((i) => prefs.categories.includes(i.category))
        .sort((a, b) => {
          const rank = (i: Insight) =>
            i.strength +
            (i.team === prefs.team ? 10 : 0) +
            (prefs.player &&
            visible.some(
              (e) =>
                i.evidenceIds.includes(e.id) && e.playerId === prefs.player,
            )
              ? 5
              : 0);
          return rank(b) - rank(a);
        }),
    [allInsights, prefs, visible],
  );
  const insight =
    insights.find((i) => `${i.team}-${i.category}` === selectedKey) ??
    insights[0];
  const evidence = insight
    ? visible.filter((e) => insight.evidenceIds.includes(e.id))
    : [];
  const baseline = insight
    ? visible.filter((e) => insight.baselineIds.includes(e.id))
    : [];
  const event = visible.find((e) => e.id === selectedEvent);
  const latest = visible
    .filter((e) => !["possession", "substitution"].includes(e.type))
    .at(-1);
  const sequence = event
    ? visible.filter(
        (e) =>
          e.possessionId === event.possessionId &&
          !["possession", "substitution"].includes(e.type),
      )
    : latest
      ? sequenceFor(visible, latest)
      : [];
  const pitchEvents = replay
    ? visible.filter((e) =>
        replay.ids.slice(0, replay.index + 1).includes(e.id),
      )
    : event
      ? sequence
      : insight
        ? evidence
        : sequence;
  const activePitchEvent = replay
    ? visible.find((e) => e.id === replay.ids[replay.index])
    : event;
  const selectableEvents = (replay ? sequence : pitchEvents).filter(
    (e) => !["goal", "foul", "substitution", "possession"].includes(e.type),
  );
  const displayKey = `${scenario}-${time}-${prefs.mode}-${insight?.id}`;
  const currentNarrative =
    narrative?.key === displayKey ? narrative.value : null;
  const summary = recap(visible, time, prefs.mode);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("second-look-preferences") ?? "null",
      );
      if (
        stored &&
        ["fan", "analyst"].includes(stored.mode) &&
        ["all", "harbor", "riverside"].includes(stored.team) &&
        typeof stored.player === "string" &&
        Array.isArray(stored.categories)
      )
        setPrefs({
          ...stored,
          categories: stored.categories.filter((c: string) =>
            ["pressure", "chances", "rhythm"].includes(c),
          ),
        });
    } catch {}
    setReady(true);
    fetch("/api/insights")
      .then((r) => r.json())
      .then((d) => setFoundry(d.mode === "foundry"))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem("second-look-preferences", JSON.stringify(prefs));
      } catch {}
  }, [prefs, ready]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () => setTime((t) => Math.min(DURATION, t + speed)),
      1000,
    );
    return () => clearInterval(timer);
  }, [playing, speed]);
  useEffect(() => {
    if (time >= DURATION) setPlaying(false);
  }, [time]);
  useEffect(() => {
    if (
      !replay ||
      replay.index >= replay.ids.length - 1 ||
      modal ||
      section !== "match"
    )
      return;
    const currentTime =
      visible.find((e) => e.id === replay.ids[replay.index])?.time ?? 0;
    const nextTime =
      visible.find((e) => e.id === replay.ids[replay.index + 1])?.time ??
      currentTime;
    const timer = setTimeout(
      () =>
        setReplay((r) =>
          r && r.index < r.ids.length - 1 ? { ...r, index: r.index + 1 } : r,
        ),
      Math.max(0, ((nextTime - currentTime) * 1000) / 8),
    );
    return () => clearTimeout(timer);
  }, [replay, modal, section, visible]);
  useEffect(() => {
    if (modal) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [modal]);
  useEffect(() => {
    requestVersion.current++;
    setNotice("");
    setLoading(false);
  }, [displayKey]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [section]);
  function seek(t: number) {
    setTime(t);
    setSelectedEvent(null);
    setReplay(null);
    setNarrative(null);
  }
  function selectInsight(i: Insight) {
    setSelectedKey(`${i.team}-${i.category}`);
    setSelectedEvent(null);
    setReplay(null);
    setPlaying(false);
    setTab("visual");
    setSection("match");
    requestAnimationFrame(() =>
      document
        .querySelector(".detail-panel")
        ?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
          block: "start",
        }),
    );
  }
  function selectEvent(e: MatchEvent) {
    if (e.type === "substitution") {
      setFocusedPlayer(e.playerId);
      setSection("players");
    }
    setSelectedEvent(e.id);
    setPlaying(false);
    setReplay(null);
  }
  function changeScenario(s: Scenario) {
    setScenario(s);
    seek(DEMO_TIME);
    setPlaying(false);
    setSelectedKey(null);
  }
  function replayEvidence() {
    const anchor = event ?? evidence.at(-1) ?? latest;
    if (!anchor) return;
    // Include the rest of this possession only if already observed at the current timestamp.
    const ids = visible
      .filter(
        (e) =>
          e.possessionId === anchor.possessionId &&
          !["possession", "substitution"].includes(e.type),
      )
      .map((e) => e.id);
    setPlaying(false);
    setSelectedEvent(ids.at(-1) ?? anchor.id);
    setReplay({ ids, index: 0 });
    document.querySelector(".pitch-panel")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
    });
  }
  async function explain() {
    if (!insight || loading) return;
    setPlaying(false);
    setLoading(true);
    setNotice("");
    const version = ++requestVersion.current;
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          time: Math.floor(time),
          mode: prefs.mode,
          team: insight.team,
          category: insight.category,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      if (version !== requestVersion.current) return;
      if (data.source === "foundry" && data.narrative)
        setNarrative({ key: displayKey, value: data.narrative });
      setNotice(
        data.notice ??
          (data.source === "offline"
            ? "Offline demo · explanation comes from verified event rules."
            : ""),
      );
      setTab("explanation");
    } catch {
      if (version === requestVersion.current)
        setNotice(
          "Narration is unavailable. The verified explanation is still here.",
        );
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }
  const nav = [
    { id: "match", label: "Match centre", icon: LayoutGrid },
    { id: "insights", label: "Insights", icon: Sparkles },
    { id: "stats", label: "Match stats", icon: BarChart3 },
    { id: "lineups", label: "Lineups", icon: Users },
    { id: "players", label: "Player focus", icon: Focus },
  ] as const;
  return (
    <div className="app-shell" inert={!ready} aria-busy={!ready}>
      <aside className="sidebar">
        <a href="/" className="brand" aria-label="Second Look home">
          <img
            className="brand-wordmark"
            src="/brand/second-look-horizontal-dark-1600.png"
            width="1600"
            height="316"
            alt="Second Look"
          />
          <img
            className="brand-symbol"
            src="/brand/second-look-mark-dark.svg"
            width="172"
            height="172"
            alt="Second Look"
          />
        </a>
        <div className="nav-caption">THE MATCH, UNDERSTOOD</div>
        <nav aria-label="Main navigation">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-label={label}
              aria-current={section === id ? "page" : undefined}
              onClick={() => setSection(id)}
              className={`nav-item ${section === id ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === "insights" && insights.length > 0 && (
                <b>{insights.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-card">
            <span className="tiny-label">
              <span className="status-dot" /> SYNTHETIC MATCH
            </span>
            <p>
              Real patterns.
              <br />A different perspective.
            </p>
            <button onClick={() => setModal("about")}>
              About this demo <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className="nav-item"
            aria-label="Your experience"
            onClick={() => setModal("settings")}
          >
            <Settings2 size={18} />
            Your experience
          </button>
          <span className="version">SECOND LOOK / 2026</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <a className="mobile-brand" href="/" aria-label="Second Look home">
            <img
              src="/brand/second-look-horizontal-dark-1600.png"
              width="1600"
              height="316"
              alt="Second Look"
            />
          </a>
          <div className="breadcrumb">
            {nav.find((n) => n.id === section)?.label}{" "}
            <ChevronRight size={13} />
            <span>Harbor vs Riverside</span>
          </div>
          <div className="topbar-right">
            <span className="engine-badge">
              <span className="status-dot" />
              {foundry ? "Foundry configured" : "Offline intelligence demo"}
            </span>
            <button
              className="icon-button mobile-settings"
              aria-label="Your experience"
              onClick={() => setModal("settings")}
            >
              <Settings2 size={18} />
            </button>
            <button
              className="help-button"
              onClick={() => setModal("about")}
              aria-label="About Second Look"
            >
              <CircleHelp size={18} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                A NEW PERSPECTIVE ON THE BEAUTIFUL GAME
              </div>
              <h1>
                {section === "match"
                  ? "The game behind the score."
                  : section === "insights"
                    ? "The moments that mean more."
                    : section === "stats"
                      ? "Every number has a source."
                      : section === "lineups"
                        ? "Meet the two sides."
                        : "A closer look at the individual."}
              </h1>
              <p>You saw the game. Here’s what you missed.</p>
            </div>
            <button
              className="catchup-button"
              onClick={() => {
                setPlaying(false);
                setModal("recap");
              }}
            >
              <ListVideo size={18} />
              Catch me up <ArrowRight size={16} />
            </button>
          </div>
          <section className="scoreboard" aria-label="Match scoreboard">
            <div className="competition">
              <span className="competition-icon">
                <Goal size={23} />
              </span>
              <div>
                <strong>Second Look Invitational</strong>
                <span>Matchday 12 · Synthetic fixture</span>
              </div>
            </div>
            <div className="score-match">
              <div className="team-name home">
                <span>
                  {TEAMS.harbor.name}
                  <small>HOME</small>
                </span>
                <Crest team="harbor" />
              </div>
              <div className="score">
                <strong data-testid="score">
                  {stats.harbor.goals}
                  <span>:</span>
                  {stats.riverside.goals}
                </strong>
                <span className="match-clock" data-testid="clock">
                  {clock(time)} <i />{" "}
                  {time === DURATION ? "FT" : time < 2700 ? "1ST" : "2ND"}
                </span>
              </div>
              <div className="team-name">
                <Crest team="riverside" />
                <span>
                  {TEAMS.riverside.name}
                  <small>AWAY</small>
                </span>
              </div>
            </div>
            <div className="score-right">
              <span className={`live-label ${playing ? "is-playing" : ""}`}>
                <span />
                {playing
                  ? "SIMULATING"
                  : time === DURATION
                    ? "FULL TIME"
                    : "PAUSED"}
              </span>
              <span>Harbor Park</span>
            </div>
          </section>
          <div className="view-toolbar">
            <div className="view-context">
              <span className="blue-dot" />
              {nav.find((n) => n.id === section)?.label}
              <span>Follow the evidence.</span>
            </div>
            <div className="mode-switch" aria-label="Viewing mode">
              <button
                aria-pressed={prefs.mode === "fan"}
                className={prefs.mode === "fan" ? "selected" : ""}
                onClick={() => setPrefs({ ...prefs, mode: "fan" })}
              >
                <Users size={14} />
                Fan mode
              </button>
              <button
                aria-pressed={prefs.mode === "analyst"}
                className={prefs.mode === "analyst" ? "selected" : ""}
                onClick={() => setPrefs({ ...prefs, mode: "analyst" })}
              >
                <BarChart3 size={14} />
                Analyst mode
              </button>
            </div>
          </div>
          {section === "match" && (
            <div className="match-grid">
              <div className="match-left">
                <section className="panel pitch-panel">
                  <div className="panel-header">
                    <h2>
                      <span className="blue-dot" />
                      {replay
                        ? "Sequence replay"
                        : event
                          ? "Event sequence"
                          : insight
                            ? "The pattern in play"
                            : "Live event view"}
                    </h2>
                    <span className="subtle-label">
                      {insight && !event
                        ? insight.metric.toUpperCase()
                        : "RECORDED EVENT POSITIONS"}
                    </span>
                    <button
                      className="icon-button"
                      aria-label="Clear event selection"
                      onClick={() => {
                        setSelectedEvent(null);
                        setReplay(null);
                      }}
                    >
                      <Focus size={16} />
                    </button>
                  </div>
                  <div className="pitch-topline">
                    <span>
                      <i className="team-dot harbor" />
                      {TEAMS.harbor.short}
                    </span>
                    <span>Harbor → · ← Riverside</span>
                    <span>
                      <i className="team-dot riverside" />
                      {TEAMS.riverside.short}
                    </span>
                  </div>
                  <Pitch
                    events={pitchEvents}
                    selected={activePitchEvent?.id}
                    onSelect={selectEvent}
                    sequence={!!event || !!replay || !insight}
                  />
                  <div className="event-inspector">
                    <div>
                      <span className="card-kicker">
                        {replay
                          ? replay.index === replay.ids.length - 1
                            ? "REPLAY COMPLETE"
                            : "REPLAYING RECORDED ACTIONS"
                          : activePitchEvent
                            ? "SELECTED ACTION"
                            : "EXPLORE THE EVIDENCE"}
                      </span>
                      <p>
                        {activePitchEvent
                          ? `${clock(activePitchEvent.time)} · ${player(activePitchEvent.playerId).name} · ${activePitchEvent.type}${activePitchEvent.type === "pass" ? (activePitchEvent.success ? " completed" : " incomplete") : activePitchEvent.outcome ? ` · ${activePitchEvent.outcome}` : ""}`
                          : "Select a marker or choose an event to see the sequence."}
                      </p>
                    </div>
                    {selectableEvents.length > 0 && (
                      <select
                        aria-label="Recorded event"
                        value={
                          activePitchEvent?.id &&
                          selectableEvents.some(
                            (e) => e.id === activePitchEvent.id,
                          )
                            ? activePitchEvent.id
                            : ""
                        }
                        onChange={(e) => {
                          const chosen = visible.find(
                            (v) => v.id === e.target.value,
                          );
                          if (chosen) selectEvent(chosen);
                        }}
                      >
                        <option value="">Choose an event</option>
                        {selectableEvents.map((e) => (
                          <option key={e.id} value={e.id}>
                            {clock(e.time)} · {e.type} ·{" "}
                            {player(e.playerId).name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {(event || replay) && (
                    <div className="replay-controls">
                      <button className="text-button" onClick={replayEvidence}>
                        <RotateCcw size={14} /> Replay this sequence
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          setSelectedEvent(null);
                          setReplay(null);
                        }}
                      >
                        Back to the pattern <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                  <div className="pitch-bottomline">
                    <span>
                      <span className="legend-ring" />
                      {event || replay
                        ? "Recorded sequence"
                        : "Verified event locations"}
                    </span>
                    <span>
                      {replay
                        ? `Event ${replay.index + 1} of ${replay.ids.length} · 8×`
                        : insight && !event
                          ? `${clock(insight.start)} — ${clock(insight.end)}`
                          : "No continuous tracking"}
                    </span>
                  </div>
                  <div className="playback">
                    <button
                      className="play-button"
                      aria-label={playing ? "Pause match" : "Play match"}
                      onClick={() => {
                        if (time === DURATION) seek(0);
                        setReplay(null);
                        setSelectedEvent(null);
                        setPlaying(!playing);
                      }}
                    >
                      {playing ? (
                        <Pause size={19} fill="currentColor" />
                      ) : (
                        <Play size={19} fill="currentColor" />
                      )}
                    </button>
                    <div className="timeline">
                      <div className="timeline-events">
                        {visible
                          .filter(
                            (e) =>
                              e.type === "goal" || e.type === "substitution",
                          )
                          .map((e) => (
                            <button
                              key={e.id}
                              title={`${clock(e.time)} · ${e.type}`}
                              aria-label={`Seek to ${clock(e.time)} ${e.type}`}
                              style={{ left: `${(e.time / DURATION) * 100}%` }}
                              onClick={() => seek(e.time)}
                              className={
                                e.type === "goal" ? "goal-tick" : "sub-tick"
                              }
                            />
                          ))}
                      </div>
                      <input
                        aria-label="Match timeline"
                        type="range"
                        min="0"
                        max={DURATION}
                        value={time}
                        aria-valuetext={clock(time)}
                        onChange={(e) => seek(Number(e.target.value))}
                        style={
                          {
                            "--progress": `${(time / DURATION) * 100}%`,
                          } as React.CSSProperties
                        }
                      />
                      <div className="timeline-labels">
                        <span>0′</span>
                        <span>15′</span>
                        <span>30′</span>
                        <span>45′</span>
                        <span>60′</span>
                        <span>75′</span>
                        <span>90′</span>
                      </div>
                    </div>
                    <select
                      className="speed-select"
                      aria-label="Playback speed"
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                    >
                      {[1, 4, 8, 16, 32].map((n) => (
                        <option key={n} value={n}>
                          {n}×
                        </option>
                      ))}
                    </select>
                    <button
                      className="icon-button"
                      aria-label="Restart match"
                      onClick={() => {
                        seek(0);
                        setPlaying(false);
                      }}
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </section>
                <section className="panel insights-strip">
                  <div className="panel-header">
                    <h2>
                      <Sparkles size={16} />
                      What’s changing
                    </h2>
                    <span className="subtle-label">
                      {insights.length} VERIFIED{" "}
                      {insights.length === 1 ? "PATTERN" : "PATTERNS"}
                    </span>
                  </div>
                  <div className="insight-cards">
                    {insights.length ? (
                      insights.slice(0, 3).map((i) => (
                        <button
                          aria-pressed={insight?.id === i.id}
                          className={`insight-card ${insight?.id === i.id ? "selected" : ""}`}
                          key={i.id}
                          onClick={() => selectInsight(i)}
                        >
                          <InsightIcon category={i.category} />
                          <div>
                            <span className="card-kicker">
                              {TEAMS[i.team].short} · Last 15 minutes
                            </span>
                            <h3>{i.headline}</h3>
                            <p>
                              {i.current} {i.metric.toLowerCase()}{" "}
                              <span>vs {i.previous} previously</span>
                            </p>
                          </div>
                          <ChevronRight size={16} />
                        </button>
                      ))
                    ) : (
                      <div className="empty-state">
                        <Activity size={24} />
                        <div>
                          <strong>Let the game tell its story.</strong>
                          <p>
                            {prefs.categories.length === 0
                              ? "Choose an insight category in Your experience."
                              : "No strong change yet. We only surface patterns when the evidence is there."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
                <section className="panel quick-stats">
                  <div className="panel-header">
                    <h2>The match in numbers</h2>
                    <button
                      className="text-button"
                      onClick={() => setSection("stats")}
                    >
                      Explore stats <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="stat-summary">
                    {[
                      ["Shots", stats.harbor.shots, stats.riverside.shots],
                      [
                        "On target",
                        stats.harbor.onTarget,
                        stats.riverside.onTarget,
                      ],
                      [
                        "Pass accuracy",
                        `${stats.harbor.accuracy}%`,
                        `${stats.riverside.accuracy}%`,
                      ],
                      [
                        "High ball wins",
                        stats.harbor.highRecoveries,
                        stats.riverside.highRecoveries,
                      ],
                    ].map(([label, a, b]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>
                          <em>{a}</em>
                          <i>—</i>
                          {b}
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="panel event-feed">
                  <details>
                    <summary>
                      <span>
                        <Activity size={14} />
                        Recent match events
                      </span>
                      <span>
                        {latest ? clock(latest.time) : "00:00"}{" "}
                        <ChevronDown size={14} />
                      </span>
                    </summary>
                    <div className="event-feed-list">
                      {visible
                        .filter((e) => e.type !== "possession")
                        .slice(-8)
                        .reverse()
                        .map((e) => (
                          <button key={e.id} onClick={() => selectEvent(e)}>
                            <time>{clock(e.time)}</time>
                            <Crest small team={e.team} />
                            <div>
                              <strong>
                                {e.type.charAt(0).toUpperCase() +
                                  e.type.slice(1)}
                                {e.outcome ? ` · ${e.outcome}` : ""}
                              </strong>
                              <span>
                                {player(e.playerId).name}
                                {e.recipientId
                                  ? ` → ${player(e.recipientId).name}`
                                  : ""}
                              </span>
                            </div>
                            <Play size={13} />
                          </button>
                        ))}
                      {visible.length === 0 && (
                        <p className="limitations">
                          Events will appear when the match starts.
                        </p>
                      )}
                    </div>
                  </details>
                </section>
              </div>
              <aside className="panel detail-panel">
                <div className="panel-header">
                  <h2>
                    <Sparkles size={16} />
                    Second look
                  </h2>
                  <span className="verified-label">
                    <Check size={12} />{" "}
                    {insight ? "Evidence linked" : "Awaiting evidence"}
                  </span>
                </div>
                {insight ? (
                  <>
                    <div className="detail-intro">
                      <InsightIcon category={insight.category} />
                      <span className="eyebrow">THE STORY RIGHT NOW</span>
                      <h2>{insight.headline}</h2>
                      <p>
                        {prefs.mode === "analyst"
                          ? insight.analyst
                          : insight.explanation}
                      </p>
                      <div className="insight-meta">
                        <Clock3 size={13} />
                        Last 15 minutes<span>·</span>
                        {TEAMS[insight.team].short}
                      </div>
                    </div>
                    <div className="detail-tabs">
                      {(["visual", "evidence", "explanation"] as const).map(
                        (t) => (
                          <button
                            aria-pressed={tab === t}
                            className={tab === t ? "selected" : ""}
                            key={t}
                            onClick={() => setTab(t)}
                          >
                            {t === "evidence"
                              ? `Evidence (${evidence.length})`
                              : t.charAt(0).toUpperCase() + t.slice(1)}
                          </button>
                        ),
                      )}
                    </div>
                    <div className="detail-footer primary-action">
                      <button
                        className="sequence-button"
                        onClick={replayEvidence}
                      >
                        <span>
                          <Play size={13} fill="currentColor" />
                        </span>
                        Show me the sequence <ArrowRight size={17} />
                      </button>
                    </div>
                    <div className="detail-content">
                      {tab === "visual" ? (
                        <>
                          <div className="comparison-label">
                            <span>{insight.metric}</span>
                            <span>Last 15 min vs previous 15</span>
                          </div>
                          <div className="comparison-numbers">
                            <strong>
                              {insight.current}
                              <small>NOW</small>
                            </strong>
                            <div className="comparison-change">
                              <TrendingUp size={18} />
                              <span>+{insight.current - insight.previous}</span>
                            </div>
                            <strong className="previous">
                              {insight.previous}
                              <small>BEFORE</small>
                            </strong>
                          </div>
                          <div className="mini-pitches">
                            <div>
                              <Pitch compact events={evidence} />
                              <span>Last 15 minutes</span>
                            </div>
                            <div>
                              <Pitch compact events={baseline} />
                              <span>Previous 15 minutes</span>
                            </div>
                          </div>
                          <div className="pitch-key">
                            <i />
                            {insight.metric} · event locations
                          </div>
                          <div className="why-card">
                            <span>
                              <Sparkles size={14} />
                              WHY IT MATTERS
                            </span>
                            <p>{insight.why}</p>
                          </div>
                        </>
                      ) : tab === "evidence" ? (
                        <div className="evidence-list">
                          <p className="muted">
                            Select an event to inspect its recorded sequence.
                          </p>
                          {evidence.map((e) => (
                            <button
                              key={e.id}
                              onClick={() => selectEvent(e)}
                              className={
                                selectedEvent === e.id ? "selected" : ""
                              }
                            >
                              <time>{clock(e.time)}</time>
                              <div>
                                <strong>{player(e.playerId).name}</strong>
                                <span>
                                  {e.type} · x {e.position.x.toFixed(0)}, y{" "}
                                  {e.position.y.toFixed(0)}
                                </span>
                                {prefs.mode === "analyst" && (
                                  <small>{e.id}</small>
                                )}
                              </div>
                              <Play size={13} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <>
                          <span className="source-label">
                            {currentNarrative
                              ? "MICROSOFT FOUNDRY NARRATIVE"
                              : "DETERMINISTIC · VERIFIED EXPLANATION"}
                          </span>
                          <p className="explanation-text">
                            {currentNarrative?.explanation ??
                              insight.explanation}
                          </p>
                          <div className="why-card">
                            <span>WHY IT MATTERS</span>
                            <p>{currentNarrative?.why ?? insight.why}</p>
                          </div>
                          <p className="limitations">
                            {prefs.mode === "analyst"
                              ? "Observation → event retrieval → narrative → evidence validation. Numerical claims stay in computed metrics. Model prose still requires human judgment."
                              : "Every number comes from recorded events. An explanation is an interpretation, not a prediction."}
                          </p>
                        </>
                      )}
                      <div className="watch-next insight-watch">
                        <span>
                          <Focus size={15} /> WHAT TO WATCH NEXT
                        </span>
                        <p>{currentNarrative?.watch ?? insight.watch}</p>
                      </div>
                      {prefs.mode === "analyst" && (
                        <div className="analyst-note">
                          <strong>Measurement notes</strong>
                          <p>
                            Coordinates normalized to the attacking team.
                            Windows: {clock(insight.start)}–{clock(insight.end)}{" "}
                            and {clock(insight.start - 900)}–
                            {clock(insight.start)}. Descriptive thresholds, not
                            a statistical significance test. No tracking or
                            causal inference.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="detail-footer">
                      <button
                        className="narrate-button"
                        disabled={loading}
                        onClick={explain}
                      >
                        <Sparkles size={14} />
                        {loading
                          ? "Retrieving verified evidence…"
                          : foundry
                            ? "Explain with Microsoft Foundry"
                            : "Explore the explanation"}
                      </button>
                      {notice && (
                        <p className="notice" role="status">
                          {notice}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="detail-empty">
                    <Crosshair size={36} />
                    <h3>A little patience. A better insight.</h3>
                    <p>
                      We’re looking for meaningful changes in the event stream.
                      Try playing ahead, or explore an event on the pitch.
                    </p>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        if (time === DURATION) seek(0);
                        setPlaying(true);
                      }}
                    >
                      Keep the match moving <Play size={14} />
                    </button>
                  </div>
                )}
              </aside>
            </div>
          )}
          {section === "insights" && (
            <section className="panel section-panel">
              <div className="panel-header">
                <h2>Verified observations</h2>
                <span>At {clock(time)}</span>
              </div>
              {insights.length ? (
                insights.map((i) => (
                  <button
                    className="wide-insight"
                    key={i.id}
                    onClick={() => selectInsight(i)}
                  >
                    <InsightIcon category={i.category} />
                    <div>
                      <h3>{i.headline}</h3>
                      <p>{prefs.mode === "fan" ? i.explanation : i.analyst}</p>
                      <span>
                        {i.evidenceIds.length} supporting events ·{" "}
                        {clock(i.start)}–{clock(i.end)}
                      </span>
                    </div>
                    <ArrowRight size={20} />
                  </button>
                ))
              ) : (
                <div className="empty-state">
                  <Activity />
                  <p>
                    No patterns meet your current filters and the evidence
                    thresholds at this point in the match.
                  </p>
                </div>
              )}
            </section>
          )}
          {section === "stats" && (
            <section className="panel section-panel">
              <div className="panel-header">
                <h2>Match statistics</h2>
                <span>Computed through {clock(time)}</span>
              </div>
              <div className="stats-team-header">
                <span>
                  <Crest small team="harbor" />
                  {TEAMS.harbor.name}
                </span>
                <span>
                  {TEAMS.riverside.name}
                  <Crest small team="riverside" />
                </span>
              </div>
              {(
                [
                  "goals",
                  "shots",
                  "onTarget",
                  "passes",
                  "completed",
                  "accuracy",
                  "highRecoveries",
                  "xg",
                ] as const
              ).map((k) => (
                <div className="stat-row" key={k}>
                  <div>
                    <strong>
                      {stats.harbor[k]}
                      {k === "accuracy" ? "%" : ""}
                    </strong>
                    <span>
                      {
                        {
                          goals: "Goals",
                          shots: "Shots",
                          onTarget: "Shots on target",
                          passes: "Passes attempted",
                          completed: "Passes completed",
                          accuracy: "Pass completion",
                          highRecoveries: "Attacking-third ball wins",
                          xg: "Synthetic expected goals",
                        }[k]
                      }
                    </span>
                    <strong>
                      {stats.riverside[k]}
                      {k === "accuracy" ? "%" : ""}
                    </strong>
                  </div>
                  <div className="stat-bars">
                    <i
                      style={{
                        width: `${stats.harbor[k] + stats.riverside[k] === 0 ? 50 : (stats.harbor[k] / (stats.harbor[k] + stats.riverside[k])) * 100}%`,
                      }}
                    />
                    <i />
                  </div>
                </div>
              ))}
              <p className="limitations">
                xG is the synthetic chance probability assigned by the
                generator, not a validated real-world expected-goals model. Pass
                counts do not imply possession duration. All figures use events
                visible at the current playback time.
              </p>
            </section>
          )}
          {section === "lineups" && (
            <div className="lineup-grid">
              {(Object.keys(TEAMS) as TeamId[]).map((t) => (
                <section className="panel section-panel" key={t}>
                  <div className="panel-header">
                    <h2>
                      <Crest small team={t} />
                      {TEAMS[t].name}
                    </h2>
                    <span>{TEAMS[t].formation}</span>
                  </div>
                  {activePlayers(visible, t).map((p) => (
                    <button
                      className="player-row"
                      key={p.id}
                      onClick={() => {
                        setFocusedPlayer(p.id);
                        setSection("players");
                      }}
                    >
                      <span className={`number ${t}`}>{p.number}</span>
                      <strong>{p.name}</strong>
                      <span>{p.role}</span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                  <p className="limitations">
                    Formation is match metadata. Positions on the pitch are
                    recorded events, not a tracked formation.
                  </p>
                </section>
              ))}
            </div>
          )}
          {section === "players" && (
            <section className="panel section-panel">
              <div className="panel-header">
                <h2>Player focus</h2>
                <select
                  aria-label="Focus player"
                  value={focusedPlayer}
                  onChange={(e) => setFocusedPlayer(e.target.value)}
                >
                  {PLAYERS.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name} · {TEAMS[p.team].short}
                    </option>
                  ))}
                </select>
              </div>
              <div className="player-focus">
                <div>
                  <div
                    className={`player-monogram ${player(focusedPlayer).team}`}
                  >
                    {player(focusedPlayer).number}
                  </div>
                  <h2>{player(focusedPlayer).name}</h2>
                  <p>
                    {player(focusedPlayer).role} ·{" "}
                    {TEAMS[player(focusedPlayer).team].name}
                  </p>
                  <p className="player-status">
                    {activePlayers(visible, player(focusedPlayer).team).some(
                      (p) => p.id === focusedPlayer,
                    )
                      ? "On the pitch"
                      : visible.some((e) => e.outgoingId === focusedPlayer)
                        ? "Substituted off"
                        : "Not yet on the pitch"}{" "}
                    · {clock(time)}
                  </p>
                  <div className="player-metrics">
                    {["pass", "shot", "recovery"].map((type) => (
                      <div key={type}>
                        <strong>
                          {
                            visible.filter(
                              (e) =>
                                e.playerId === focusedPlayer && e.type === type,
                            ).length
                          }
                        </strong>
                        <span>
                          {type === "pass"
                            ? "Pass attempts"
                            : type === "shot"
                              ? "Shots"
                              : "Recoveries"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="secondary-button"
                    aria-pressed={prefs.player === focusedPlayer}
                    onClick={() =>
                      setPrefs({
                        ...prefs,
                        player:
                          prefs.player === focusedPlayer ? "" : focusedPlayer,
                      })
                    }
                  >
                    {prefs.player === focusedPlayer ? (
                      <Check size={15} />
                    ) : (
                      <Focus size={15} />
                    )}{" "}
                    {prefs.player === focusedPlayer
                      ? "Following this player"
                      : "Follow this player"}
                  </button>
                </div>
                <div>
                  <Pitch
                    events={visible.filter(
                      (e) =>
                        e.playerId === focusedPlayer &&
                        ![
                          "possession",
                          "substitution",
                          "foul",
                          "goal",
                        ].includes(e.type),
                    )}
                  />
                  <p className="limitations">
                    Recorded actions through {clock(time)}. Overlapping markers
                    represent actions at similar locations, not time spent
                    there.
                  </p>
                </div>
              </div>
            </section>
          )}
          <div className="bottom-row">
            <label className="scenario-picker">
              <span>DEMO SCENARIO</span>
              <select
                aria-label="Demo scenario"
                value={scenario}
                onChange={(e) => changeScenario(e.target.value as Scenario)}
              >
                {(Object.keys(SCENARIOS) as Scenario[]).map((s) => (
                  <option value={s} key={s}>
                    {SCENARIOS[s].name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
            <p>
              <Shield size={13} />
              Fictional clubs. Synthetic events. Evidence you can explore.
            </p>
            <button
              className="secondary-button"
              onClick={() => {
                setScenario("pressure");
                seek(60 * 60);
                setSelectedKey(null);
                setPrefs(defaultPrefs);
                setTab("visual");
                setSpeed(16);
                setPlaying(true);
                setSection("match");
              }}
            >
              <Play size={14} /> Watch the build-up
            </button>
            <button
              className="text-button"
              onClick={() => {
                changeScenario("pressure");
                setPrefs(defaultPrefs);
                setTab("visual");
                setSpeed(8);
                setSection("match");
              }}
            >
              Reset demo <RotateCcw size={13} />
            </button>
          </div>
        </main>
        <footer>
          <img
            className="footer-brand"
            src="/brand/second-look-horizontal-dark-1600.png"
            width="1600"
            height="316"
            alt="Second Look"
          />
          <span>A deeper understanding. One moment at a time.</span>
          <span>Built for the fans.</span>
        </footer>
      </div>
      <dialog
        ref={dialogRef}
        aria-label={
          modal === "recap"
            ? "Catch me up"
            : modal === "settings"
              ? "Your experience"
              : "About Second Look"
        }
        className={`modal ${modal === "recap" ? "recap-modal" : ""}`}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModal(null);
        }}
      >
        <div className="modal-header">
          <span className="eyebrow">
            {modal === "settings"
              ? "MAKE IT YOUR MATCH"
              : modal === "recap"
                ? "BACK IN THE GAME"
                : "BEHIND SECOND LOOK"}
          </span>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={() => setModal(null)}
          >
            <X size={20} />
          </button>
        </div>
        {modal === "recap" ? (
          <>
            <div className="recap-heading">
              <span className="recap-icon">
                <ListVideo size={28} />
              </span>
              <h2>Here’s what you missed.</h2>
              <p>
                Through {clock(time)} ·{" "}
                {prefs.mode === "fan"
                  ? "The fan’s perspective"
                  : "The analyst’s perspective"}
              </p>
            </div>
            <div className="recap-score">
              <Crest team="harbor" />
              <strong>{summary.score}</strong>
              <Crest team="riverside" />
            </div>
            <p className="recap-summary">{summary.summary}</p>
            <div className="recap-timeline">
              {summary.moments.length ? (
                summary.moments.map((m) => (
                  <button
                    key={m.event.id}
                    onClick={() => {
                      seek(m.event.time);
                      setModal(null);
                      if (m.event.type === "substitution") {
                        setFocusedPlayer(m.event.playerId);
                        setSection("players");
                      } else {
                        setSelectedEvent(m.event.id);
                        setSection("match");
                      }
                    }}
                  >
                    <span className="moment-dot" />
                    <time>{clock(m.event.time)}</time>
                    <div>
                      <strong>{m.label}</strong>
                      <span>
                        {TEAMS[m.event.team].name} · Inspect this moment
                      </span>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                ))
              ) : (
                <p>
                  No major moments yet. The recap will grow as the match
                  unfolds.
                </p>
              )}
            </div>
            <div className="watch-next">
              <span>
                <Focus size={16} />
                WHAT TO WATCH NEXT
              </span>
              <p>{summary.watch}</p>
            </div>
            <p className="limitations">
              Event-derived recap · no events beyond {clock(time)} included.
            </p>
            <button
              className="primary-button"
              onClick={() => {
                setModal(null);
                setSection("match");
                setPlaying(time < DURATION);
              }}
            >
              Back to the match <Play size={15} fill="currentColor" />
            </button>
          </>
        ) : modal === "settings" ? (
          <>
            <h2>Your match. Your perspective.</h2>
            <p className="muted">Preferences are saved on this device.</p>
            <div className="settings-modes">
              {(["fan", "analyst"] as Mode[]).map((m) => (
                <button
                  key={m}
                  className={prefs.mode === m ? "selected" : ""}
                  onClick={() => setPrefs({ ...prefs, mode: m })}
                >
                  {m === "fan" ? <Users /> : <BarChart3 />}
                  <div>
                    <strong>{m === "fan" ? "Fan mode" : "Analyst mode"}</strong>
                    <p>
                      {m === "fan"
                        ? "The story, the key moments, and what to watch."
                        : "Window comparisons, event evidence, and limitations."}
                    </p>
                  </div>
                  {prefs.mode === m && <Check size={18} />}
                </button>
              ))}
            </div>
            <label className="setting-label">
              Follow a team
              <select
                value={prefs.team}
                onChange={(e) =>
                  setPrefs({ ...prefs, team: e.target.value as Prefs["team"] })
                }
              >
                <option value="all">Both sides · neutral</option>
                {(Object.keys(TEAMS) as TeamId[]).map((t) => (
                  <option value={t} key={t}>
                    {TEAMS[t].name}
                  </option>
                ))}
              </select>
            </label>
            <label className="setting-label">
              Follow a player
              <select
                value={prefs.player}
                onChange={(e) => setPrefs({ ...prefs, player: e.target.value })}
              >
                <option value="">No preference</option>
                {PLAYERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend>Stories you care about</legend>
              {(["pressure", "chances", "rhythm"] as Category[]).map((c) => (
                <label key={c} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={prefs.categories.includes(c)}
                    onChange={(e) =>
                      setPrefs({
                        ...prefs,
                        categories: e.target.checked
                          ? [...prefs.categories, c]
                          : prefs.categories.filter((v) => v !== c),
                      })
                    }
                  />
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </label>
              ))}
            </fieldset>
            <p className="limitations">
              Following a team or player raises relevant insights in your feed.
              Category filters control which stories appear.
            </p>
            <button className="primary-button" onClick={() => setModal(null)}>
              Save my experience <Check size={16} />
            </button>
          </>
        ) : (
          <>
            <h2>
              You saw the game.
              <br />
              Here’s what you missed.
            </h2>
            <p className="recap-summary">
              Second Look turns football events into stories you can inspect.
              Follow a pattern, see the evidence on the pitch, and understand
              why it might matter.
            </p>
            <div className="about-stages">
              {[
                [
                  "01",
                  "Observe",
                  "Seeded synthetic events unfold on a single playback clock.",
                ],
                [
                  "02",
                  "Verify",
                  "Rules detect changes and calculate every statistic.",
                ],
                [
                  "03",
                  "Explain",
                  "Optional Microsoft Foundry narration retrieves verified evidence through a tool.",
                ],
                ["04", "Explore", "Trace a story back to recorded events."],
              ].map(([n, t, d]) => (
                <div key={n}>
                  <span>{n}</span>
                  <div>
                    <strong>{t}</strong>
                    <p>{d}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="limitations">
              {foundry
                ? "Foundry is configured. Narration runs only when you select “Explain with Microsoft Foundry”."
                : "Currently in offline demo mode. Narratives and recaps are deterministic, not AI-generated."}{" "}
              Clubs and players are fictional. No broadcast footage, licensed
              football data, or continuous player tracking is used.
            </p>
          </>
        )}
      </dialog>
    </div>
  );
}
