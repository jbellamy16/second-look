"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  FootballPitch,
  Formation,
  PlayerShirt,
  Watch,
  ListVideo,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Tactics,
  Shot,
  HighBallWins,
  Pass,
  MatchEvents,
  EventIcon,
  type IconSize,
  TrendingUp,
  Users,
  X,
} from "./icons";
import { Crest, PlayerIdentity } from "./team-identity";
import { BrandImage, useAppearance, type Appearance } from "./appearance";
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
  rankInsights,
} from "@/lib/intelligence";
import type { Narrative } from "@/lib/foundry";
import { buildEvidence } from "@/lib/ai/evidence";
import type { Provenance } from "@/lib/ai/service";
import { ProvenanceDetails, providerLabel } from "./provenance";
import { Pitch } from "./pitch";
import { EvidenceReplay } from "./evidence-replay";
import { Metric, Reveal, SelectionGroup, usePageVisibility } from "./motion";
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
function InsightIcon({
  category,
  size = 24,
}: {
  category: Category;
  size?: IconSize;
}) {
  return (
    <span className={`insight-icon ${category}`}>
      {category === "pressure" ? (
        <HighBallWins size={size} />
      ) : category === "chances" ? (
        <Shot size={size} />
      ) : (
        <Pass size={size} />
      )}
    </span>
  );
}
export function MatchApp() {
  const [appearance, setAppearance] = useAppearance();
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
  const [replay, setReplay] = useState<{
    ids: string[];
    version: number;
  } | null>(null);
  const [provider, setProvider] = useState("offline"),
    [loading, setLoading] = useState(false),
    [notice, setNotice] = useState("");
  const [narrative, setNarrative] = useState<{
    key: string;
    value: Narrative;
    provenance: Provenance;
  } | null>(null);
  const [seenEvidenceIds, setSeenEvidenceIds] = useState<string[]>([]);
  const [recapNarrative, setRecapNarrative] = useState<{
    key: string;
    value: Narrative;
    provenance: Provenance;
  } | null>(null);
  const [recapNotice, setRecapNotice] = useState("");
  const [recapLoading, setRecapLoading] = useState(false);
  const [focusedPlayer, setFocusedPlayer] = useState("harbor-9");
  const requestVersion = useRef(0);
  const visiblePage = usePageVisibility();
  const matchTime = useRef(time);
  matchTime.current = time;
  const events = useMemo(() => generateMatch(scenario), [scenario]);
  const visible = useMemo(() => eventsAt(events, time), [events, time]);
  const stats = useMemo(() => statistics(visible), [visible]);
  const allInsights = useMemo(
    () => detectInsights(visible, time),
    [visible, time],
  );
  const insights = useMemo(
    () =>
      rankInsights(allInsights, visible, prefs.mode, {
        ...prefs,
        seenEvidenceIds,
      }).map((r) => r.insight),
    [allInsights, prefs, visible, seenEvidenceIds],
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
  const pitchEvents = playing
    ? sequence
    : event
      ? sequence
      : insight
        ? evidence
        : sequence;
  const activePitchEvent = playing ? latest : event;
  const replayEvents = replay
    ? visible.filter((e) => replay.ids.includes(e.id))
    : [];
  const selectableEvents = pitchEvents.filter(
    (e) => !["goal", "foul", "substitution", "possession"].includes(e.type),
  );
  const displayKey = `${scenario}-${time}-${prefs.mode}-${insight?.id}`;
  const currentNarrative =
    narrative?.key === displayKey ? narrative.value : null;
  const summary = recap(visible, time, prefs.mode);
  const recapKey = JSON.stringify({ scenario, time, prefs, seenEvidenceIds });
  const currentRecap = recapNarrative?.key === recapKey ? recapNarrative : null;
  function computedProvenance(selected?: Insight): Provenance {
    const packet = buildEvidence(
      visible,
      time,
      prefs.mode,
      { ...prefs, seenEvidenceIds },
      selected,
    );
    return {
      provider: "offline",
      cached: false,
      cutoff: time,
      activity: [],
      validation: [
        "Events filtered at viewer timestamp",
        "Comparisons computed from recorded events",
      ],
      limitations: packet.limitations,
      facts: packet.facts,
    };
  }
  const dialogRef = useRef<HTMLDialogElement>(null);
  const retainedModal = useRef(modal);
  if (modal) retainedModal.current = modal;
  const dialogContent = modal ?? retainedModal.current;
  const scrollPositions = useRef<Partial<Record<Section, number>>>({});
  const previousSection = useRef(section);
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
      .then((d) =>
        setProvider(
          ["foundry", "openai"].includes(d.mode) ? d.mode : "offline",
        ),
      )
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
    const started = performance.now();
    const initial = matchTime.current;
    const timer = setInterval(
      () =>
        setTime(
          Math.min(
            DURATION,
            Math.floor(
              initial + ((performance.now() - started) * speed) / 1000,
            ),
          ),
        ),
      250,
    );
    return () => clearInterval(timer);
  }, [playing, speed]);
  useEffect(() => {
    if (time >= DURATION || !visiblePage) setPlaying(false);
  }, [time, visiblePage]);
  useEffect(() => {
    if (modal) {
      setPlaying(false);
      dialogRef.current?.showModal();
      const overflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = overflow;
      };
    } else dialogRef.current?.close();
  }, [modal]);
  useEffect(() => {
    requestVersion.current++;
    setNotice("");
    setLoading(false);
    setRecapLoading(false);
    setRecapNotice("");
  }, [displayKey, recapKey]);
  useEffect(() => {
    window.scrollTo({
      top: scrollPositions.current[section] ?? 0,
      behavior: "instant",
    });
    previousSection.current = section;
    const remember = () => {
      scrollPositions.current[previousSection.current] = window.scrollY;
    };
    window.addEventListener("scroll", remember, { passive: true });
    return () => window.removeEventListener("scroll", remember);
  }, [section]);
  function seek(t: number) {
    setTime(t);
    setPlaying(false);
    setSelectedEvent(null);
    setReplay(null);
    setNarrative(null);
  }
  function selectInsight(i: Insight) {
    if (insight)
      setSeenEvidenceIds((seen) =>
        [...new Set([...seen, ...insight.evidenceIds])].slice(-200),
      );
    setSelectedKey(`${i.team}-${i.category}`);
    setSelectedEvent(null);
    setReplay(null);
    setPlaying(false);
    setTab("visual");
    setSection("match");
    requestAnimationFrame(() =>
      document.querySelector(".detail-panel")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
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
    setSeenEvidenceIds([]);
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
    setReplay({ ids, version: performance.now() });
    document.querySelector(".pitch-panel")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
    });
  }
  async function narrateRecap() {
    if (recapLoading) return;
    setPlaying(false);
    setRecapLoading(true);
    setRecapNotice("");
    const version = ++requestVersion.current;
    try {
      const res = await fetch("/api/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          time: Math.floor(time),
          mode: prefs.mode,
          preferences: {
            team: prefs.team,
            player: prefs.player,
            categories: prefs.categories,
            seenEvidenceIds,
          },
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      if (version !== requestVersion.current) return;
      if (["openai", "foundry"].includes(data.source) && data.narrative)
        setRecapNarrative({
          key: recapKey,
          value: data.narrative,
          provenance: data.provenance,
        });
      setRecapNotice(
        data.notice ??
          (data.source === "offline"
            ? "Verified event-derived recap. AI narration is disabled."
            : ""),
      );
    } catch {
      if (version === requestVersion.current)
        setRecapNotice(
          "Narration is unavailable. Your verified recap is still here.",
        );
    } finally {
      if (version === requestVersion.current) setRecapLoading(false);
    }
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
      if (["foundry", "openai"].includes(data.source) && data.narrative)
        setNarrative({
          key: displayKey,
          value: data.narrative,
          provenance: data.provenance,
        });
      setNotice(
        data.notice ??
          (data.source === "offline"
            ? "Offline demo. This explanation comes from verified event rules."
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
    { id: "match", label: "Match centre", icon: FootballPitch },
    { id: "insights", label: "Insights", icon: Tactics },
    { id: "stats", label: "Match stats", icon: BarChart3 },
    { id: "lineups", label: "Lineups", icon: Formation },
    { id: "players", label: "Player focus", icon: PlayerShirt },
  ] as const;
  return (
    <div className="app-shell" inert={!ready} aria-busy={!ready}>
      <aside className="sidebar">
        <a href="/" className="brand" aria-label="Second Look home">
          <BrandImage className="brand-wordmark" />
          <BrandImage className="brand-symbol" symbol />
        </a>
        <SelectionGroup
          className="main-navigation"
          label="Main navigation"
          navigation
          value={section}
        >
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-label={label}
              aria-current={section === id ? "page" : undefined}
              onClick={() => setSection(id)}
              className={`nav-item ${section === id ? "active" : ""}`}
            >
              <Icon size={20} />
              <span>{label}</span>
              {id === "insights" && insights.length > 0 && (
                <b>{insights.length}</b>
              )}
            </button>
          ))}
        </SelectionGroup>
        <div className="sidebar-bottom">
          <div className="demo-card">
            <span className="tiny-label">SYNTHETIC MATCH</span>
            <button onClick={() => setModal("about")}>
              About this demo <ArrowUpRight size={16} />
            </button>
          </div>
          <button
            className="nav-item"
            aria-label="Your experience"
            onClick={() => setModal("settings")}
          >
            <Settings2 size={20} />
            Your experience
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <a className="mobile-brand" href="/" aria-label="Second Look home">
            <BrandImage />
          </a>
          <div className="breadcrumb">
            {nav.find((n) => n.id === section)?.label}{" "}
            <ChevronRight size={16} />
            <span>Harbor vs Riverside</span>
          </div>
          <div className="topbar-right">
            <span className="engine-badge">
              {provider !== "offline"
                ? `${providerLabel(provider)} configured`
                : "Offline intelligence demo"}
            </span>
            <button
              className="icon-button mobile-settings"
              aria-label="Your experience"
              onClick={() => setModal("settings")}
            >
              <Settings2 size={20} />
            </button>
            <button
              className="help-button"
              onClick={() => setModal("about")}
              aria-label="About Second Look"
            >
              <CircleHelp size={20} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              {section === "match" && (
                <div className="eyebrow">The story right now</div>
              )}
              <h1>
                {section === "match"
                  ? (insight?.headline ?? "Waiting for a pattern")
                  : nav.find((n) => n.id === section)?.label}
              </h1>
              {section !== "match" && (
                <p>
                  {section === "insights"
                    ? "What’s changing, and the evidence behind it."
                    : section === "stats"
                      ? "Compare both sides through the current match time."
                      : section === "lineups"
                        ? "The players on the pitch. Select anyone for a closer look."
                        : "Explore a player’s contribution, action by action."}
                </p>
              )}
            </div>
          </div>
          <section className="scoreboard" aria-label="Match scoreboard">
            <div className="competition">
              <div>
                <strong>Second Look Invitational</strong>
                <span>Matchday 12, synthetic fixture</span>
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
                <strong
                  data-testid="score"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <Metric value={stats.harbor.goals} important />
                  <span className="score-separator">:</span>
                  <Metric value={stats.riverside.goals} important />
                </strong>
                <span className="match-clock" data-testid="clock">
                  <time>{clock(time)}</time>
                  <span>
                    {time === DURATION ? "FT" : time < 2700 ? "1ST" : "2ND"}
                  </span>
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
            <button
              className="catchup-button"
              onClick={() => {
                setPlaying(false);
                setModal("recap");
              }}
            >
              <ListVideo size={20} />
              Catch me up <ArrowRight size={16} />
            </button>
            <SelectionGroup
              className="mode-switch"
              label="Viewing mode"
              value={prefs.mode}
            >
              <button
                aria-pressed={prefs.mode === "fan"}
                className={prefs.mode === "fan" ? "selected" : ""}
                onClick={() => setPrefs({ ...prefs, mode: "fan" })}
              >
                <Users size={16} />
                Fan mode
              </button>
              <button
                aria-pressed={prefs.mode === "analyst"}
                className={prefs.mode === "analyst" ? "selected" : ""}
                onClick={() => setPrefs({ ...prefs, mode: "analyst" })}
              >
                <BarChart3 size={16} />
                Analyst mode
              </button>
            </SelectionGroup>
          </div>
          {
            <div
              className="match-grid section-enter"
              hidden={section !== "match"}
            >
              <div className="match-left">
                <section className="panel pitch-panel">
                  <div className="panel-header">
                    <h2>
                      {replay
                        ? "Sequence replay"
                        : event
                          ? "Event sequence"
                          : insight
                            ? "Where it happened"
                            : "Live event view"}
                    </h2>
                    {(event || replay) && (
                      <button
                        className="text-button clear-selection"
                        onClick={() => {
                          setPlaying(false);
                          setSelectedEvent(null);
                          setReplay(null);
                        }}
                      >
                        <X size={16} /> Clear selection
                      </button>
                    )}
                  </div>
                  <p className="pitch-caption">
                    {replay || playing || event || !insight
                      ? "Recorded actions, not live positions. Numbers show event order."
                      : "Recorded actions, not live positions. Numbers identify players."}
                  </p>
                  <div className="pitch-topline">
                    <span
                      role="img"
                      aria-label={`${TEAMS.harbor.short}: blue circles, attacking right`}
                    >
                      <i className="team-marker harbor" aria-hidden="true" />
                      {TEAMS.harbor.short}
                      <ArrowRight size={16} />
                    </span>
                    <span
                      role="img"
                      aria-label={`${TEAMS.riverside.short}: red squares, attacking left`}
                    >
                      <ArrowLeft size={16} />
                      {TEAMS.riverside.short}
                      <i className="team-marker riverside" aria-hidden="true" />
                    </span>
                  </div>
                  {replay && replayEvents.length ? (
                    <EvidenceReplay
                      key={replay.version}
                      events={replayEvents}
                      suspended={!!modal || section !== "match"}
                    />
                  ) : (
                    <>
                      <Pitch
                        events={pitchEvents}
                        selected={activePitchEvent?.id}
                        onSelect={selectEvent}
                        sequence={playing || !!event || !!replay || !insight}
                      />
                      <div className="event-inspector">
                        <div>
                          <span className="card-kicker">
                            {activePitchEvent
                              ? "SELECTED ACTION"
                              : "EXPLORE THE EVIDENCE"}
                          </span>
                          <p>
                            {activePitchEvent
                              ? `${clock(activePitchEvent.time)} ${player(activePitchEvent.playerId).name}: ${activePitchEvent.type}${activePitchEvent.type === "pass" ? (activePitchEvent.success ? " completed" : " incomplete") : activePitchEvent.outcome ? ` (${activePitchEvent.outcome})` : ""}`
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
                                {clock(e.time)} {e.type} by{" "}
                                {player(e.playerId).name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </>
                  )}
                  {(event || replay) && (
                    <div className="replay-controls">
                      <button className="text-button" onClick={replayEvidence}>
                        <RotateCcw size={16} /> Replay this sequence
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          setSelectedEvent(null);
                          setReplay(null);
                        }}
                      >
                        Back to the pattern <ArrowRight size={16} />
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
                        ? `Match held at ${clock(time)}`
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
                      {playing ? <Pause size={20} /> : <Play size={20} />}
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
                              title={`${clock(e.time)} ${e.type}`}
                              aria-label={`Seek to ${clock(e.time)} ${e.type}`}
                              style={{ left: `${(e.time / DURATION) * 100}%` }}
                              onClick={() => seek(e.time)}
                              className={
                                e.type === "goal" ? "goal-tick" : "sub-tick"
                              }
                            >
                              <EventIcon type={e.type} size={16} />
                            </button>
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
                      <Tactics size={16} />
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
                          key={`${i.team}-${i.category}`}
                          onClick={() => selectInsight(i)}
                        >
                          <InsightIcon category={i.category} />
                          <div>
                            <span className="card-kicker">
                              {TEAMS[i.team].short} in the last 15 minutes
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
                      Explore stats <ArrowRight size={16} />
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
                          <em>
                            <Metric value={a} />
                          </em>
                          <i>—</i>
                          <Metric value={b} />
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="panel event-feed">
                  <details>
                    <summary>
                      <span>
                        <MatchEvents size={16} />
                        Recent match events
                      </span>
                      <span>
                        {latest ? clock(latest.time) : "00:00"}{" "}
                        <ChevronDown size={16} />
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
                            <span className={`event-glyph ${e.team}`}>
                              <EventIcon type={e.type} />
                            </span>
                            <div>
                              <strong>
                                {e.type.charAt(0).toUpperCase() +
                                  e.type.slice(1)}
                                {e.outcome ? ` (${e.outcome})` : ""}
                              </strong>
                              <span>
                                {player(e.playerId).name} ({TEAMS[e.team].code})
                                {e.recipientId && (
                                  <>
                                    {" "}
                                    <span className="event-recipient">
                                      <ArrowRight size={16} />
                                      <span className="sr-only">to </span>
                                      {player(e.recipientId).name}
                                    </span>
                                  </>
                                )}
                              </span>
                            </div>
                            <Play size={16} />
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
                  <h2>The evidence</h2>
                  <span className="verified-label">
                    <Check size={16} />{" "}
                    {insight ? "Evidence linked" : "Awaiting evidence"}
                  </span>
                </div>
                {insight ? (
                  <>
                    <Reveal
                      className="detail-intro"
                      change={`${insight.team}-${insight.category}-${prefs.mode}`}
                    >
                      <p className="evidence-summary">
                        {insight.current}{" "}
                        {insight.category === "pressure"
                          ? "ball wins in the attacking third"
                          : insight.metric.toLowerCase()}
                        , previously {insight.previous}.
                      </p>
                      <div className="insight-meta">
                        <Clock3 size={16} />
                        Last 15 minutes vs previous 15
                      </div>
                    </Reveal>
                    <SelectionGroup
                      className="detail-tabs"
                      label="Insight details"
                      value={tab}
                    >
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
                    </SelectionGroup>
                    <div className="detail-footer primary-action">
                      <button
                        className="sequence-button"
                        onClick={replayEvidence}
                      >
                        <span>
                          <Play size={16} />
                        </span>
                        Show me the sequence <ArrowRight size={20} />
                      </button>
                    </div>
                    <Reveal
                      className="detail-content"
                      change={`${tab}-${insight.team}-${insight.category}-${prefs.mode}-${currentNarrative ? "ai" : "verified"}`}
                    >
                      {tab === "visual" ? (
                        <>
                          <div className="comparison-numbers">
                            <strong>
                              <Metric value={insight.current} />
                              <small>NOW</small>
                            </strong>
                            <div className="comparison-change">
                              <TrendingUp size={20} />
                              <span>+{insight.current - insight.previous}</span>
                            </div>
                            <strong className="previous">
                              <Metric value={insight.previous} />
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
                            <InsightIcon
                              category={insight.category}
                              size={16}
                            />
                            Event locations for {insight.metric.toLowerCase()}
                          </div>
                          <div className="why-card">
                            <span>
                              <Tactics size={16} />
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
                              aria-pressed={selectedEvent === e.id}
                              className={
                                selectedEvent === e.id ? "selected" : ""
                              }
                            >
                              <time>{clock(e.time)}</time>
                              <span className={`event-glyph ${e.team}`}>
                                <EventIcon type={e.type} />
                              </span>
                              <div className="evidence-copy">
                                <strong>{player(e.playerId).name}</strong>
                                <span>
                                  {e.type} at x {e.position.x.toFixed(0)}, y{" "}
                                  {e.position.y.toFixed(0)}
                                </span>
                                {prefs.mode === "analyst" && (
                                  <small>{e.id}</small>
                                )}
                              </div>
                              <Play size={16} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <>
                          <span className="source-label">
                            {currentNarrative
                              ? `Verified story from ${providerLabel(narrative!.provenance.provider)}`
                              : "Verified explanation from recorded events"}
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
                              ? "AI selects verified statements; recorded events supply every fact. Editorial relevance still requires human judgment."
                              : "Every number comes from recorded events. An explanation is an interpretation, not a prediction."}
                          </p>
                        </>
                      )}
                      <div className="watch-next insight-watch">
                        <span>
                          <Watch size={16} /> WHAT TO WATCH NEXT
                        </span>
                        <p>{currentNarrative?.watch ?? insight.watch}</p>
                      </div>
                      <ProvenanceDetails
                        provenance={
                          currentNarrative
                            ? narrative!.provenance
                            : computedProvenance(insight)
                        }
                        events={visible}
                        insights={[insight]}
                      />
                    </Reveal>
                    <div className="detail-footer">
                      <button
                        className={`narrate-button ${loading ? "is-loading" : ""}`}
                        disabled={loading}
                        onClick={explain}
                      >
                        <Tactics size={16} />
                        {loading
                          ? "Retrieving verified evidence…"
                          : provider !== "offline"
                            ? `Explain with ${providerLabel(provider)}`
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
                    <FootballPitch size={32} />
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
                      Keep the match moving <Play size={16} />
                    </button>
                  </div>
                )}
              </aside>
            </div>
          }
          {section === "insights" && (
            <section className="panel section-panel section-enter">
              <div className="panel-header">
                <h2>Verified observations</h2>
                <span>At {clock(time)}</span>
              </div>
              {insights.length ? (
                insights.map((i) => (
                  <button
                    className="wide-insight"
                    key={`${i.team}-${i.category}`}
                    onClick={() => selectInsight(i)}
                  >
                    <InsightIcon category={i.category} />
                    <div>
                      <h3>{i.headline}</h3>
                      <p>{prefs.mode === "fan" ? i.explanation : i.analyst}</p>
                      <span>
                        {i.evidenceIds.length} supporting events from{" "}
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
            <section className="panel section-panel section-enter">
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
                      <Metric value={stats.harbor[k]} />
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
                      <Metric value={stats.riverside[k]} />
                      {k === "accuracy" ? "%" : ""}
                    </strong>
                  </div>
                  <div
                    className="stat-bars"
                    style={
                      {
                        "--share":
                          stats.harbor[k] + stats.riverside[k] === 0
                            ? 0.5
                            : stats.harbor[k] /
                              (stats.harbor[k] + stats.riverside[k]),
                      } as React.CSSProperties
                    }
                  >
                    <i />
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
                <section className="panel section-panel section-enter" key={t}>
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
            <section className="panel section-panel section-enter">
              <div className="panel-header">
                <h2>Player focus</h2>
                <select
                  aria-label="Focus player"
                  value={focusedPlayer}
                  onChange={(e) => setFocusedPlayer(e.target.value)}
                >
                  {PLAYERS.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name} ({TEAMS[p.team].short})
                    </option>
                  ))}
                </select>
              </div>
              <Reveal className="player-focus" change={focusedPlayer}>
                <div>
                  <PlayerIdentity player={player(focusedPlayer)} />
                  <h2>{player(focusedPlayer).name}</h2>
                  <p>
                    {player(focusedPlayer).role} for{" "}
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
                    at {clock(time)}
                  </p>
                  <div className="player-metrics">
                    {(["pass", "shot", "recovery"] as const).map((type) => (
                      <div key={type}>
                        <EventIcon type={type} size={20} />
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
                      <Check size={16} />
                    ) : (
                      <PlayerShirt size={16} />
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
              </Reveal>
            </section>
          )}
          <details className="demo-controls">
            <summary>
              Demo controls <ChevronDown size={16} />
            </summary>
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
                <ChevronDown size={16} />
              </label>
              <button
                className="secondary-button"
                onClick={() => {
                  setScenario("pressure");
                  seek(60 * 60);
                  setSelectedKey(null);
                  setPrefs(defaultPrefs);
                  setSeenEvidenceIds([]);
                  setTab("visual");
                  setSpeed(16);
                  setPlaying(true);
                  setSection("match");
                }}
              >
                <Play size={16} /> Watch the build-up
              </button>
              <button
                className="text-button"
                onClick={() => {
                  changeScenario("pressure");
                  setPrefs(defaultPrefs);
                  setSeenEvidenceIds([]);
                  setTab("visual");
                  setSpeed(8);
                  setSection("match");
                }}
              >
                Reset demo <RotateCcw size={16} />
              </button>
            </div>
          </details>
        </main>
      </div>
      <dialog
        ref={dialogRef}
        aria-label={
          dialogContent === "recap"
            ? "Catch me up"
            : dialogContent === "settings"
              ? "Your experience"
              : "About Second Look"
        }
        className={`modal ${dialogContent === "recap" ? "recap-modal" : ""}`}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const controls = [
            ...e.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]',
            ),
          ].filter((el) => el.getClientRects().length > 0);
          const first = controls[0],
            last = controls.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
        onCancel={(e) => {
          e.preventDefault();
          setModal(null);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const rect = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < rect.left ||
              e.clientX > rect.right ||
              e.clientY < rect.top ||
              e.clientY > rect.bottom
            )
              setModal(null);
          }
        }}
      >
        <div className="modal-header">
          <span className="eyebrow">
            {dialogContent === "settings"
              ? "MAKE IT YOUR MATCH"
              : dialogContent === "recap"
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
        {dialogContent === "recap" ? (
          <>
            <div className="recap-heading">
              <h2>Here’s what you missed.</h2>
              <p>
                {prefs.mode === "fan"
                  ? "The fan’s perspective"
                  : "The analyst’s perspective"}{" "}
                through {clock(time)}
              </p>
            </div>
            <div className="recap-score">
              <Crest team="harbor" />
              <strong>{summary.score}</strong>
              <Crest team="riverside" />
            </div>
            <Reveal change={currentRecap?.key ?? "verified"}>
              <p className="recap-summary">
                {currentRecap?.value.explanation ?? summary.summary}
              </p>
            </Reveal>
            {currentRecap && (
              <div className="why-card">
                <span>WHY IT MATTERS</span>
                <p>{currentRecap.value.why}</p>
              </div>
            )}
            <div className="recap-ai" aria-busy={recapLoading}>
              <button
                className={`narrate-button ${recapLoading ? "is-loading" : ""}`}
                disabled={recapLoading || loading}
                onClick={narrateRecap}
              >
                <Tactics size={16} />{" "}
                {recapLoading
                  ? "Choosing the important developments…"
                  : provider !== "offline"
                    ? `Catch me up with ${providerLabel(provider)}`
                    : "Review verified recap"}
              </button>
              {recapNotice && (
                <p className="notice" role="status">
                  {recapNotice}
                </p>
              )}
              {currentRecap && (
                <p className="source-label">
                  Verified story from{" "}
                  {providerLabel(currentRecap.provenance.provider)}
                </p>
              )}
            </div>
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
                      <span>{TEAMS[m.event.team].name}</span>
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
                <Watch size={16} />
                WHAT TO WATCH NEXT
              </span>
              <p>{currentRecap?.value.watch ?? summary.watch}</p>
            </div>
            <ProvenanceDetails
              provenance={currentRecap?.provenance ?? computedProvenance()}
              events={visible}
              insights={insights}
            />
            <p className="limitations">
              Event-derived recap. No events beyond {clock(time)} included.
            </p>
            <button
              className="primary-button"
              onClick={() => {
                setModal(null);
                setSection("match");
                setPlaying(time < DURATION);
              }}
            >
              Back to the match <Play size={16} />
            </button>
          </>
        ) : dialogContent === "settings" ? (
          <>
            <h2>Your match. Your perspective.</h2>
            <p className="muted">Preferences are saved on this device.</p>
            <label className="setting-label appearance-setting">
              Appearance
              <select
                aria-label="Appearance"
                value={appearance}
                onChange={(event) =>
                  setAppearance(event.target.value as Appearance)
                }
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
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
                  {prefs.mode === m && <Check size={20} />}
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
                <option value="all">Both sides (neutral)</option>
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
                  "Optional OpenAI or Microsoft Foundry narration retrieves verified evidence through a tool.",
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
              {provider !== "offline"
                ? `${providerLabel(provider)} is configured. Narration runs only when you request an explanation or AI recap.`
                : "Currently in offline demo mode. Narratives and recaps are deterministic, not AI-generated."}{" "}
              Clubs and players are fictional. No broadcast footage, licensed
              football data, or continuous player tracking is used.
            </p>
            <p className="limitations">
              Icons by Tabler and Lucide. Club marks and additional football
              diagrams created for Second Look.{" "}
              <a
                className="asset-license-link"
                href="/icon-licenses.txt"
                target="_blank"
                rel="noreferrer"
              >
                Icon licenses
              </a>
            </p>
          </>
        )}
      </dialog>
    </div>
  );
}
