"use client";
import { useId } from "react";
import { MatchEvent, player, clock } from "@/lib/match";
export function Pitch({
  events,
  selected,
  onSelect,
  compact = false,
  sequence = false,
}: {
  events: MatchEvent[];
  selected?: string;
  onSelect?: (event: MatchEvent) => void;
  compact?: boolean;
  sequence?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const point = (e: MatchEvent, end = false) => {
    const p = end && e.end ? e.end : e.position;
    return {
      x: 50 + (e.team === "harbor" ? p.x : 100 - p.x) * 9,
      y: 45 + (e.team === "harbor" ? p.y : 100 - p.y) * 5.5,
    };
  };
  const filtered = events.filter(
    (e) => !["possession", "substitution", "foul", "goal"].includes(e.type),
  );
  return (
    <svg
      viewBox="0 0 1000 640"
      className={`pitch ${compact ? "compact" : ""}`}
      role={onSelect ? "group" : "img"}
      aria-label={
        sequence
          ? "Recorded football sequence"
          : "Football pitch showing recorded event locations"
      }
    >
      <defs>
        <pattern
          id={`grass-${id}`}
          width="150"
          height="640"
          patternUnits="userSpaceOnUse"
        >
          <rect width="150" height="640" fill="#0c1c2f" />
          <rect width="75" height="640" fill="#10243a" />
        </pattern>
        <radialGradient id={`light-${id}`}>
          <stop stopColor="#61a8ff" stopOpacity=".1" />
          <stop offset="1" stopColor="#071320" stopOpacity=".32" />
        </radialGradient>
        <marker
          id={`arrow-${id}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#61a8ff" />
        </marker>
      </defs>
      <rect
        x="12"
        y="12"
        width="976"
        height="616"
        rx="9"
        fill={`url(#grass-${id})`}
      />
      <rect
        x="12"
        y="12"
        width="976"
        height="616"
        rx="9"
        fill={`url(#light-${id})`}
      />
      <g fill="none" stroke="#a6b6cb" strokeOpacity=".6" strokeWidth="1.8">
        <rect x="50" y="45" width="900" height="550" />
        <path d="M500 45V595" />
        <circle cx="500" cy="320" r="76" />
        <circle cx="500" cy="320" r="2" fill="#a6b6cb" />
        <path d="M50 170H190V470H50M950 170H810V470H950M50 250H103V390H50M950 250H897V390H950M50 285H35V355H50M950 285H965V355H950" />
        <path d="M190 262a76 76 0 0 1 0 116M810 262a76 76 0 0 0 0 116M50 58a13 13 0 0 0 13-13M937 45a13 13 0 0 0 13 13M50 582a13 13 0 0 1 13 13M937 595a13 13 0 0 1 13-13" />
        <circle cx="145" cy="320" r="2" fill="#a6b6cb" />
        <circle cx="855" cy="320" r="2" fill="#a6b6cb" />
      </g>
      {sequence &&
        filtered.map((e) => {
          const p = point(e),
            q = point(e, true);
          return (
            e.end && (
              <path
                key={`line-${e.id}`}
                d={`M${p.x} ${p.y}L${q.x} ${q.y}`}
                stroke={e.type === "shot" ? "#f3ab44" : "#61a8ff"}
                strokeWidth="2.7"
                strokeDasharray={
                  e.type === "shot"
                    ? "6 5"
                    : e.type === "carry"
                      ? "2 7"
                      : e.type === "pass" && !e.success
                        ? "8 6"
                        : undefined
                }
                opacity=".85"
                markerEnd={`url(#arrow-${id})`}
              />
            )
          );
        })}
      {filtered.map((e, index) => {
        const p = point(e),
          active = e.id === selected;
        return (
          <g
            key={e.id}
            className={onSelect ? "event-marker" : ""}
            tabIndex={onSelect ? 0 : undefined}
            role={onSelect ? "button" : undefined}
            aria-label={`${clock(e.time)} ${e.type} by ${player(e.playerId).name}`}
            onClick={() => onSelect?.(e)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                onSelect?.(e);
              }
            }}
          >
            <title>{`${player(e.playerId).name} · ${e.type} · ${clock(e.time)}`}</title>
            <circle
              className="marker-hit"
              cx={p.x}
              cy={p.y}
              r="30"
              fill="transparent"
            />
            {active && (
              <circle
                cx={p.x}
                cy={p.y}
                r="22"
                fill="none"
                stroke="#20d17a"
                strokeWidth="2"
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              className="marker-dot"
              r={compact ? 12 : 14}
              fill={active ? "#20d17a" : "#61a8ff"}
              stroke="#071320"
              strokeWidth="3"
            />
            {!compact && (
              <text
                x={p.x}
                y={p.y + 4}
                textAnchor="middle"
                fill="#071320"
                fontSize="11"
                fontWeight="800"
              >
                {sequence ? index + 1 : player(e.playerId).number}
              </text>
            )}
            {active && !compact && (
              <g
                pointerEvents="none"
                transform={`translate(${Math.max(60, Math.min(725, p.x - 20))},${p.y > 160 ? p.y - 95 : p.y + 30})`}
              >
                <rect
                  width="220"
                  height="62"
                  rx="8"
                  fill="#071320"
                  stroke="#20d17a"
                />
                <text
                  x="14"
                  y="25"
                  fill="#f8fbff"
                  fontSize="15"
                  fontWeight="600"
                >
                  {player(e.playerId).name}
                </text>
                <text x="14" y="46" fill="#a6b6cb" fontSize="12">
                  {e.type.charAt(0).toUpperCase() + e.type.slice(1)} ·{" "}
                  {clock(e.time)}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {!filtered.length && (
        <text x="500" y="325" fill="#a6b6cb" textAnchor="middle" fontSize="18">
          No events in this view
        </text>
      )}
    </svg>
  );
}
