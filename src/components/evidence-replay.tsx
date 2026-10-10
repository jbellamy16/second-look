"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { clock, player, type MatchEvent } from "@/lib/match";
import { playbackTime, replayFrame, type PlaybackSample } from "@/lib/playback";
import { Pitch } from "./pitch";
import { Pause, Play, RotateCcw } from "./icons";
import { usePageVisibility } from "./motion";

export function EvidenceReplay({
  events,
  suspended,
}: {
  events: MatchEvent[];
  suspended: boolean;
}) {
  const start = events[0].time,
    end = events.at(-1)!.time;
  const [time, setTime] = useState(start);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(8);
  const visiblePage = usePageVisibility();
  const sample = useRef<PlaybackSample>({
    time: start,
    sampledAt: 0,
    speed: 8,
    playing: false,
  });
  const running = playing && !suspended && visiblePage;
  // Re-anchor before changing speed/pause so fractional progress is preserved.
  useLayoutEffect(() => {
    const previous = sample.current;
    const current = playbackTime(previous, performance.now(), end);
    sample.current = {
      time: current,
      sampledAt: performance.now(),
      speed,
      playing: running,
    };
    setTime(current);
    if (!running) return;
    const timer = window.setInterval(() => {
      const next = playbackTime(sample.current, performance.now(), end);
      setTime(next);
      if (next >= end) setPlaying(false);
    }, 100);
    return () => {
      clearInterval(timer);
      sample.current = {
        ...sample.current,
        time: playbackTime(sample.current, performance.now(), end),
        sampledAt: performance.now(),
        playing: false,
      };
    };
  }, [running, speed, end]);
  function seek(next: number, resume = false) {
    const bounded = Math.max(start, Math.min(end, next));
    sample.current = {
      time: bounded,
      sampledAt: performance.now(),
      speed,
      playing: resume && !suspended && visiblePage,
    };
    setTime(bounded);
    setPlaying(resume);
  }
  const frame = replayFrame(events, time);
  const active = frame.active!;
  return (
    <>
      <Pitch
        events={frame.visible}
        selected={active.id}
        sequence
        onSelect={(event) => seek(event.time)}
        playback={{
          sample,
          end,
          nextTime: events[frame.index + 1]?.time ?? end,
          running,
        }}
      />
      <div className="event-inspector">
        <div>
          <span className="card-kicker">
            {time >= end
              ? "REPLAY COMPLETE"
              : running
                ? "REPLAYING RECORDED ACTIONS"
                : "REPLAY PAUSED"}
          </span>
          <p>
            {clock(active.time)} {player(active.playerId).name}: {active.type}
            {active.outcome
              ? ` (${active.outcome})`
              : active.type === "pass"
                ? active.success
                  ? " completed"
                  : " incomplete"
                : ""}
          </p>
        </div>
        <select
          aria-label="Recorded event"
          value={active.id}
          onChange={(e) =>
            seek(events.find((event) => event.id === e.target.value)!.time)
          }
        >
          {frame.visible.map((event) => (
            <option key={event.id} value={event.id}>
              {clock(event.time)} {event.type} by {player(event.playerId).name}
            </option>
          ))}
        </select>
      </div>
      <div className="replay-transport" aria-label="Sequence playback">
        <button
          className="play-button"
          aria-label={running ? "Pause replay" : "Play replay"}
          onClick={() =>
            time >= end
              ? seek(start, true)
              : seek(
                  playbackTime(sample.current, performance.now(), end),
                  !playing,
                )
          }
        >
          {running ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          className="icon-button"
          aria-label="Restart replay"
          onClick={() => seek(start, true)}
        >
          <RotateCcw size={16} />
        </button>
        <div className="replay-progress">
          <label htmlFor="replay-timeline">
            <span>
              REPLAY <time data-testid="replay-clock">{clock(time)}</time>
            </span>
            <span>{clock(end)}</span>
          </label>
          <input
            id="replay-timeline"
            aria-label="Replay timeline"
            aria-valuetext={clock(time)}
            type="range"
            min={start}
            max={end}
            step="0.1"
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
          />
        </div>
        <select
          className="speed-select"
          aria-label="Replay speed"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        >
          {[1, 4, 8, 16].map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </select>
      </div>
      <div className="replay-caption">
        <span>
          Event {frame.index + 1} of {events.length}
        </span>
        <span>Interpolated recorded endpoints, without player tracking</span>
      </div>
    </>
  );
}
