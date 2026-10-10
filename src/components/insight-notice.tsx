"use client";
import { useEffect, useRef, useState } from "react";
import type { Insight } from "@/lib/intelligence";
import { Reveal } from "./motion";
import { X } from "./icons";
/** No inference here. Notify once per evidence episode, only during playback. */
export function InsightNotice({
  insights,
  playing,
  onSelect,
}: {
  insights: Insight[];
  playing: boolean;
  onSelect: (insight: Insight) => void;
}) {
  const seen = useRef(new Map<string, Set<string>>());
  const lastShown = useRef(-Infinity);
  const [notice, setNotice] = useState<Insight | null>(null);
  useEffect(() => {
    if (!playing) return;
    for (const i of insights) {
      const key = `${i.team}-${i.category}`,
        prior = seen.current.get(key) ?? new Set<string>();
      const fresh = i.evidenceIds.filter((id) => !prior.has(id));
      if (
        fresh.length < Math.max(3, i.evidenceIds.length * 0.6) ||
        Date.now() - lastShown.current < 30000
      )
        continue;
      seen.current.set(key, new Set([...prior, ...i.evidenceIds]));
      lastShown.current = Date.now();
      setNotice(i);
      break;
    }
  }, [insights, playing]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  if (!notice || !playing) return null;
  return (
    <Reveal change={notice.id} className="insight-notice">
      <div aria-live="polite">
        <span className="eyebrow">NEW OBSERVATION</span>
        <button
          className="text-button"
          onClick={() => {
            onSelect(notice);
            setNotice(null);
          }}
        >
          {notice.headline}
        </button>
      </div>
      <button
        className="icon-button"
        aria-label="Dismiss observation"
        onClick={() => setNotice(null)}
      >
        <X size={16} />
      </button>
    </Reveal>
  );
}
