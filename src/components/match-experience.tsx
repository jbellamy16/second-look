"use client";
import { useState } from "react";
import { MatchApp } from "./match-app";
import { HistoricalApp } from "./historical-app";
import { SelectionGroup } from "./motion";
export function MatchExperience({
  historicalEnabled,
}: {
  historicalEnabled: boolean;
}) {
  const [source, setSource] = useState<"synthetic" | "historical">("synthetic");
  const selector = historicalEnabled ? (
    <div className="match-source-bar">
      <div>
        <span className="eyebrow">MATCH SOURCE</span>
        <p>
          {source === "synthetic"
            ? "A reproducible football story"
            : "Real matches. Recorded moments."}
        </p>
      </div>
      <SelectionGroup
        className="mode-switch source-switch"
        label="Match source"
        value={source}
      >
        <button
          className={source === "synthetic" ? "selected" : ""}
          aria-pressed={source === "synthetic"}
          onClick={() => setSource("synthetic")}
        >
          Synthetic
        </button>
        <button
          className={source === "historical" ? "selected" : ""}
          aria-pressed={source === "historical"}
          onClick={() => setSource("historical")}
        >
          Real Match
        </button>
      </SelectionGroup>
    </div>
  ) : null;
  return source === "synthetic" ? (
    <MatchApp sourceSelector={selector} />
  ) : (
    <HistoricalApp sourceSelector={selector} />
  );
}
