import { calculateStatistics } from "./sources/analytics";
export type TeamId = "harbor" | "riverside";
export type Scenario = "pressure" | "substitution" | "quiet";
export type EventType =
  | "pass"
  | "carry"
  | "shot"
  | "goal"
  | "tackle"
  | "interception"
  | "recovery"
  | "possession"
  | "corner"
  | "foul"
  | "substitution"
  | "duel"
  | "restart"
  | "offside"
  | "touch"
  | "interruption"
  | "save"
  | "free_kick"
  | "card"
  | "period_start"
  | "period_end"
  | "other";
export type Point = { x: number; y: number };
export type Player = {
  id: string;
  name: string;
  number: number;
  role: string;
  team: TeamId;
};
export type MatchEvent = {
  id: string;
  time: number;
  team: TeamId;
  playerId: string;
  type: EventType;
  position: Point;
  end?: Point;
  recipientId?: string;
  success?: boolean;
  outcome?: "saved" | "wide" | "goal";
  xg?: number;
  outgoingId?: string;
  assistPlayerId?: string;
  assistEventId?: string;
  goalkeeperId?: string;
  possessionId: number | null;
};
export const TEAMS = {
  harbor: {
    name: "Harbor Athletic",
    short: "Harbor",
    code: "HBA",
    color: "#72c6ff",
    formation: "4–3–3",
  },
  riverside: {
    name: "Riverside FC",
    short: "Riverside",
    code: "RIV",
    color: "#ff7a83",
    formation: "4–2–3–1",
  },
} as const;
const names = {
  harbor: [
    "Luca Vale",
    "Ellis Reed",
    "Noah Flint",
    "Otis Lane",
    "Finn Ash",
    "Milo Serrano",
    "Theo March",
    "Jude Moreno",
    "Kai Solberg",
    "Leon Costa",
    "Arlo Hayes",
    "Nico Wells",
    "Toby Mercer",
    "Callum Pike",
    "Eli Brooks",
    "Rory Blake",
    "Seth Palmer",
    "Owen Ellis",
    "Luca Bennett",
    "Jasper Ford",
  ],
  riverside: [
    "Ruben Moss",
    "Evan Cole",
    "Leo Hart",
    "Isaac Stone",
    "Adam West",
    "Oscar Voss",
    "Felix Lake",
    "Max Rowan",
    "Hugo Silva",
    "Ben Rivers",
    "Ivo Cruz",
    "Asa Quinn",
    "Dylan Ward",
    "Reece Shaw",
    "Joel Nash",
    "Kian Holt",
    "Lewis Gray",
    "Micah Stone",
    "Elliot Mason",
    "Rafael Reid",
  ],
};
export const PLAYERS: Player[] = (Object.keys(TEAMS) as TeamId[]).flatMap(
  (team) =>
    names[team].map((name, i) => ({
      id: `${team}-${i + 1}`,
      name,
      team,
      number: [
        1, 2, 4, 5, 3, 6, 8, 10, 9, 11, 7, 17, 13, 12, 14, 15, 16, 18, 19, 20,
      ][i],
      role:
        i === 0 || i === 12
          ? "Goalkeeper"
          : i < 5 || (i >= 13 && i <= 15)
            ? "Defender"
            : i < 8 || (i >= 16 && i <= 17)
              ? "Midfielder"
              : "Forward",
    })),
);
export const player = (id: string) => PLAYERS.find((p) => p.id === id)!;
export const other = (team: TeamId): TeamId =>
  team === "harbor" ? "riverside" : "harbor";
export const SCENARIOS: Record<
  Scenario,
  { name: string; description: string; seed: number }
> = {
  pressure: {
    name: "The pressure builds",
    description: "Harbor begin winning the ball higher up the pitch.",
    seed: 202632,
  },
  substitution: {
    name: "A change in the game",
    description: "Watch the rhythm before and after a second-half change.",
    seed: 202611,
  },
  quiet: {
    name: "A game of patience",
    description: "A low-event match. Sometimes the story is restraint.",
    seed: 202612,
  },
};
export const DURATION = 90 * 60;
export const DEMO_TIME = 63 * 60 + 24;
export function clock(time: number) {
  return `${Math.floor(time / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(time % 60)
    .toString()
    .padStart(2, "0")}`;
}
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Feed boundary: coordinates are normalized to each team's attacking direction (left → right).
// Discrete possession sequences; no off-ball tracking is implied.
// Failed passes transfer at their endpoint; goals restart at the centre spot.
export function generateMatch(
  scenario: Scenario,
  seed = SCENARIOS[scenario].seed,
  profile: "demo" | "balanced" = "demo",
): MatchEvent[] {
  const random = seeded(seed),
    events: MatchEvent[] = [];
  let time = 0,
    possessionId = 0,
    team: TeamId = "riverside",
    substituted = false,
    cornerNext = false;
  const point = (x: number, y = 10 + random() * 80): Point => ({
    x: Math.max(1, Math.min(99, x)),
    y: Math.max(0, Math.min(100, y)),
  });
  const choose = (t: TeamId, x = 50) => {
    // Defenders build from deep; midfielders and forwards receive higher up.
    const first = x < 35 ? 1 : x > 65 ? 6 : 2;
    const count = x < 35 ? 8 : x > 65 ? 6 : 10;
    let n = first + Math.floor(random() * count);
    if (t === "harbor" && substituted && n === 11) n = 12;
    return `${t}-${n}`;
  };
  const emit = (
    type: EventType,
    who: string,
    pos: Point,
    extra: Partial<MatchEvent> = {},
  ) => {
    if (time > DURATION) return;
    events.push({
      id: `${scenario}-${seed}-${events.length}`,
      time,
      team,
      playerId: who,
      type,
      position: pos,
      possessionId,
      ...extra,
    });
  };
  while (time < DURATION - 75) {
    time +=
      profile === "balanced"
        ? 4 + Math.floor(random() * 7)
        : 9 + Math.floor(random() * 15);
    if (!substituted && time >= 55 * 60) {
      const prior: TeamId = team;
      team = "harbor";
      emit("substitution", "harbor-12", point(50, 0), {
        outgoingId: "harbor-11",
      });
      substituted = true;
      team = prior;
    }
    const preceding = events.findLast((e) => e.type !== "substitution");
    const cornerRestart = cornerNext;
    cornerNext = false;
    team = cornerRestart
      ? team
      : preceding?.type === "foul"
        ? other(preceding.team)
        : other(team);
    possessionId++;
    const surge =
      team === "harbor"
        ? scenario === "pressure"
          ? Math.max(0, Math.min(1, (time - 40 * 60) / (20 * 60)))
          : scenario === "substitution" && substituted
            ? 1
            : 0
        : 0;
    let position = point(
      random() < 0.025 + surge * 0.66 ? 69 + random() * 12 : 15 + random() * 40,
    );
    if (preceding?.type === "pass" && !preceding.success && preceding.end)
      position = point(100 - preceding.end.x, 100 - preceding.end.y);
    if (!preceding || preceding.type === "goal") position = point(50, 50);
    // A missed/saved attempt restarts deep, rather than inventing a high ball win.
    if (preceding?.type === "shot") position = point(8, 50);
    if (preceding?.type === "foul")
      position = point(100 - preceding.position.x, 100 - preceding.position.y);
    if (cornerRestart) position = point(99, 1);
    let carrier = choose(team, position.x);
    emit("possession", carrier, position);
    if (cornerRestart) emit("corner", carrier, position);
    if (preceding && !["goal", "shot", "foul"].includes(preceding.type))
      emit(
        random() < 0.66
          ? "recovery"
          : random() < 0.5
            ? "interception"
            : "tackle",
        carrier,
        position,
      );
    const passes = 3 + Math.floor(random() * 5);
    for (let i = 0; i < passes; i++) {
      time +=
        profile === "balanced"
          ? (scenario === "quiet" ? 5 : 2) + Math.floor(random() * 5)
          : (scenario === "quiet" ? 9 : 5) + Math.floor(random() * 7);
      const end =
        cornerRestart && i === 0
          ? point(82 + random() * 10, 35 + random() * 30)
          : point(
              position.x +
                (random() - (profile === "balanced" ? 0.35 : 0.2)) *
                  (profile === "balanced"
                    ? 52
                    : scenario === "quiet"
                      ? 11
                      : 22),
              surge > 0.4 && random() < 0.65
                ? 12 + random() * 24
                : Math.max(
                    8,
                    Math.min(
                      92,
                      position.y +
                        (random() - 0.5) * (profile === "balanced" ? 72 : 45),
                    ),
                  ),
            );
      let receiver = choose(team, end.x);
      if (receiver === carrier) receiver = team + "-6";
      if (receiver === carrier) receiver = team + "-8";
      const success = random() < (profile === "balanced" ? 0.84 : 0.88);
      emit("pass", carrier, position, { end, recipientId: receiver, success });
      position = end;
      carrier = receiver;
      if (!success) break;
    }
    // Do not create a shot after a failed pass.
    const last = events.at(-1);
    if (
      last?.type === "pass" &&
      last.success &&
      position.x >= 64 &&
      random() <
        (scenario === "quiet"
          ? 0.18
          : profile === "balanced"
            ? 0.24 + surge * 0.2
            : 0.3 + surge * 0.4)
    ) {
      // A short recorded carry connects the pass to the attempt without teleporting.
      const shotPosition = point(
        Math.min(95, position.x + 2 + random() * 7),
        position.y,
      );
      time += 3;
      emit("carry", carrier, position, { end: shotPosition, success: true });
      position = shotPosition;
      time += 2;
      const distance = Math.hypot(
        (100 - position.x) * 1.05,
        (position.y - 50) * 0.68,
      );
      const xg = Number(
        Math.max(0.02, Math.min(0.42, 0.5 * Math.exp(-distance / 16))).toFixed(
          2,
        ),
      );
      const outcome =
        random() < xg ? "goal" : random() < 0.6 ? "saved" : "wide";
      emit("shot", carrier, position, {
        goalkeeperId: `${other(team)}-1`,
        end: {
          x: 100,
          y: outcome === "wide" ? (position.y < 50 ? 40 : 60) : 50,
        },
        xg,
        outcome,
      });
      if (outcome === "goal") {
        // This successful pass feeds the scorer's short carry and shot directly.
        // Record the credit on the goal so the earlier pass cannot reveal it.
        const assisted =
          last.team === team &&
          last.recipientId === carrier &&
          last.playerId !== carrier &&
          last.possessionId === possessionId &&
          last.time < 2700 === time < 2700;
        emit(
          "goal",
          carrier,
          point(99, 50),
          assisted
            ? {
                assistPlayerId: last.playerId,
                assistEventId: last.id,
              }
            : {},
        );
      } else if (outcome === "saved") {
        cornerNext = random() < 0.3;
      }
    } else if (last?.success && random() < 0.08) {
      time += 3;
      emit(
        "foul",
        choose(other(team), 100 - position.x),
        point(100 - position.x, 100 - position.y),
        { team: other(team) },
      );
    }
  }
  return events;
}
export function eventsAt(events: MatchEvent[], time: number) {
  return events.filter((e) => e.time <= time);
}
/** Compatibility entrypoint; all sources use the same calculation engine. */
export const statistics = calculateStatistics;
export function sequenceFor(events: MatchEvent[], event: MatchEvent) {
  if (event.possessionId === null) return [event];
  return events.filter(
    (e) =>
      e.possessionId === event.possessionId &&
      e.time <= event.time &&
      e.type !== "possession" &&
      e.type !== "substitution",
  );
}
export function activePlayers(events: MatchEvent[], team: TeamId) {
  const subs = events.filter(
    (e) => e.type === "substitution" && e.team === team,
  );
  return PLAYERS.filter(
    (p) =>
      p.team === team &&
      (Number(p.id.split("-")[1]) <= 11 ||
        subs.some((e) => e.playerId === p.id)) &&
      !subs.some((e) => e.outgoingId === p.id),
  );
}
