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
  | "substitution";
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
  possessionId: number;
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
  ],
};
export const PLAYERS: Player[] = (Object.keys(TEAMS) as TeamId[]).flatMap(
  (team) =>
    names[team].map((name, i) => ({
      id: `${team}-${i + 1}`,
      name,
      team,
      number: [1, 2, 4, 5, 3, 6, 8, 10, 9, 11, 7, 17][i],
      role:
        i === 0
          ? "Goalkeeper"
          : i < 5
            ? "Defender"
            : i < 8
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
    time += 9 + Math.floor(random() * 15);
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
      time += (scenario === "quiet" ? 9 : 5) + Math.floor(random() * 7);
      const end =
        cornerRestart && i === 0
          ? point(82 + random() * 10, 35 + random() * 30)
          : point(
              position.x + (random() - 0.2) * (scenario === "quiet" ? 11 : 22),
              surge > 0.4 && random() < 0.65
                ? 12 + random() * 24
                : Math.max(8, Math.min(92, position.y + (random() - 0.5) * 45)),
            );
      let receiver = choose(team, end.x);
      if (receiver === carrier) receiver = team + "-6";
      if (receiver === carrier) receiver = team + "-8";
      const success = random() < 0.88;
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
      random() < (scenario === "quiet" ? 0.18 : 0.3 + surge * 0.4)
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
        end: {
          x: 100,
          y: outcome === "wide" ? (position.y < 50 ? 40 : 60) : 50,
        },
        xg,
        outcome,
      });
      if (outcome === "goal") {
        emit("goal", carrier, point(99, 50));
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
export function statistics(events: MatchEvent[]) {
  return Object.fromEntries(
    (Object.keys(TEAMS) as TeamId[]).map((team) => {
      const own = events.filter((e) => e.team === team),
        passes = own.filter((e) => e.type === "pass");
      const shots = own.filter((e) => e.type === "shot");
      return [
        team,
        {
          goals: own.filter((e) => e.type === "goal").length,
          shots: shots.length,
          onTarget: shots.filter(
            (e) => e.outcome === "saved" || e.outcome === "goal",
          ).length,
          xg: Number(shots.reduce((sum, e) => sum + (e.xg ?? 0), 0).toFixed(2)),
          passes: passes.length,
          completed: passes.filter((e) => e.success).length,
          accuracy: passes.length
            ? Math.round(
                (100 * passes.filter((e) => e.success).length) / passes.length,
              )
            : 0,
          recoveries: own.filter((e) => e.type === "recovery").length,
          highRecoveries: own.filter(
            (e) =>
              ["recovery", "interception", "tackle"].includes(e.type) &&
              e.position.x >= 66.7,
          ).length,
        },
      ];
    }),
  ) as Record<
    TeamId,
    {
      goals: number;
      shots: number;
      onTarget: number;
      xg: number;
      passes: number;
      completed: number;
      accuracy: number;
      recoveries: number;
      highRecoveries: number;
    }
  >;
}
export function sequenceFor(events: MatchEvent[], event: MatchEvent) {
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
