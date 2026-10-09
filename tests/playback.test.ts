import { describe, expect, it } from "vitest";
import { actionPoint, playbackTime, replayFrame } from "../src/lib/playback";
import { eventsAt, generateMatch, type MatchEvent } from "../src/lib/match";

const action: MatchEvent = {
  id: "a",
  time: 100,
  type: "pass",
  team: "harbor",
  playerId: "harbor-1",
  position: { x: 0, y: 0 },
  end: { x: 100, y: 100 },
  possessionId: 1,
};
describe("authoritative replay time", () => {
  it("uses elapsed time, handles delays, and never runs past its cutoff", () => {
    const sample = { time: 100, sampledAt: 500, speed: 8, playing: true };
    expect(playbackTime(sample, 1500, 120)).toBe(108);
    expect(playbackTime(sample, 10000, 120)).toBe(120);
    expect(playbackTime(sample, 200, 120)).toBe(100);
  });
  it("freezes exactly when paused and reanchors without losing fractional time", () => {
    const sample = { time: 103.25, sampledAt: 1000, speed: 1, playing: false };
    expect(playbackTime(sample, 100000, 150)).toBe(103.25);
    expect(
      playbackTime({ ...sample, speed: 4, playing: true }, 2000, 150),
    ).toBe(107.25);
  });
  it("reveals simultaneous events together and clears future markers on rewind", () => {
    const events = [
      action,
      { ...action, id: "b", time: 110 },
      { ...action, id: "c", time: 110 },
    ];
    expect(replayFrame(events, 109.99).visible.map((e) => e.id)).toEqual(["a"]);
    expect(replayFrame(events, 110).active?.id).toBe("c");
    expect(replayFrame(events, 100).visible).toHaveLength(1);
    expect(replayFrame(events, 0).active).toBeUndefined();
  });
  it("interpolates only the recorded action endpoints and clamps travel", () => {
    expect(actionPoint(action, 105, 110)).toEqual({ x: 500, y: 320 });
    expect(actionPoint(action, 0, 110)).toEqual({ x: 50, y: 45 });
    expect(actionPoint(action, 120, 110)).toEqual({ x: 950, y: 595 });
    expect(actionPoint({ ...action, end: undefined }, 105, 110)).toEqual({
      x: 50,
      y: 45,
    });
    expect(actionPoint({ ...action, team: "riverside" }, 100, 110)).toEqual({
      x: 950,
      y: 595,
    });
  });
  it("never includes unseen facts across every synthetic scenario and cutoff", () => {
    for (const scenario of ["pressure", "quiet", "substitution"] as const) {
      const events = generateMatch(scenario);
      for (const cutoff of [0, 60, 900, 2700, 3804, 5400]) {
        const allowed = eventsAt(events, cutoff);
        for (const t of [0, cutoff / 2, cutoff]) {
          expect(
            replayFrame(allowed, t).visible.every(
              (e) => e.time <= t && e.time <= cutoff,
            ),
          ).toBe(true);
        }
      }
    }
  });
});
