"use client";
import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { playbackTime } from "@/lib/playback";
/** Shared monotonic clock. Both experiences pause on seek, then sample the new time on play. */
export function useMatchPlayback(
  time: number,
  setTime: Dispatch<SetStateAction<number>>,
  playing: boolean,
  speed: number,
  end: number,
  wholeSeconds = false,
) {
  const current = useRef(time);
  current.current = time;
  useEffect(() => {
    if (!playing) return;
    const sample = {
      time: current.current,
      sampledAt: performance.now(),
      speed,
      playing: true,
    };
    const timer = setInterval(() => {
      const value = playbackTime(sample, performance.now(), end);
      setTime(wholeSeconds ? Math.floor(value) : value);
    }, 250);
    return () => clearInterval(timer);
  }, [playing, speed, end, setTime, wholeSeconds]);
}
