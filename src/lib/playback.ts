import type { MatchEvent, Point } from "./match";

export type PlaybackSample = {
  time: number;
  sampledAt: number;
  speed: number;
  playing: boolean;
};

// A single time source for the replay clock, event visibility and ball position.
export function playbackTime(sample: PlaybackSample, now: number, end: number) {
  return Math.min(
    end,
    sample.time +
      (sample.playing
        ? (Math.max(0, now - sample.sampledAt) * sample.speed) / 1000
        : 0),
  );
}

export function replayFrame(events: MatchEvent[], time: number) {
  const visible = events.filter((event) => event.time <= time);
  return { visible, active: visible.at(-1), index: visible.length - 1 };
}

export function pitchPoint(event: MatchEvent, end = false): Point {
  const p = end && event.end ? event.end : event.position;
  return {
    x: 50 + (event.team === "harbor" ? p.x : 100 - p.x) * 9,
    y: 45 + (event.team === "harbor" ? p.y : 100 - p.y) * 5.5,
  };
}

// Schematic travel along this action's recorded endpoints only. Never connect
// separate possessions or infer a player trajectory from a sparse event feed.
export function actionPoint(
  event: MatchEvent,
  time: number,
  nextTime: number,
): Point {
  const start = pitchPoint(event),
    end = pitchPoint(event, true);
  const progress =
    nextTime <= event.time
      ? 1
      : Math.max(0, Math.min(1, (time - event.time) / (nextTime - event.time)));
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}
