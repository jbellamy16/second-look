import type { Point, TeamId } from "../match";

/** Normed, action-executing-team coordinates; not physical metres or tracking. */
export const CANONICAL_PITCH = {
  length: 100,
  width: 100,
  unit: "percent",
  origin: "top-left",
  yDirection: "down",
  orientation: "action-executing-team",
  referenceLengthMetres: 105,
  referenceWidthMetres: 68,
  physicalDimensionsKnown: false,
} as const;

export function normalizePoint(
  p: readonly number[],
  length: number,
  width: number,
): Point {
  if (p.length < 2 || !p.every(Number.isFinite) || length <= 0 || width <= 0)
    throw new Error("Invalid source coordinates");
  // Out-of-bounds records remain in source.raw; never clamp them into an invented location.
  if (p[0] < 0 || p[0] > length || p[1] < 0 || p[1] > width)
    throw new Error("Source point outside declared pitch");
  return { x: (p[0] / length) * 100, y: (p[1] / width) * 100 };
}
export function displayPoint(p: Point, team: TeamId): Point {
  return team === "harbor" ? p : { x: 100 - p.x, y: 100 - p.y };
}
/** Comparable reference-pitch distance, explicitly not measured stadium distance. */
export function referenceDistance(a: Point, b: Point) {
  return Math.hypot((b.x - a.x) * 1.05, (b.y - a.y) * 0.68);
}
