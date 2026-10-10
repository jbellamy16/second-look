import type { MatchEvent } from "../match";
import { displayPoint } from "./coordinates";
/** Spatial aggregation describes occupied cells, never a relocated event or player. */
export function pitchGroups(
  events: MatchEvent[],
  density: boolean,
  cellSize = 10,
) {
  const groups = new Map<
    string,
    { id: string; x: number; y: number; events: MatchEvent[] }
  >();
  for (const e of events) {
    const p = displayPoint(e.position, e.team);
    const x = density
      ? Math.min(100 / cellSize - 1, Math.floor(p.x / cellSize)) * cellSize
      : p.x;
    const y = density
      ? Math.min(100 / cellSize - 1, Math.floor(p.y / cellSize)) * cellSize
      : p.y;
    const id = `${x.toFixed(4)}:${y.toFixed(4)}`;
    const group = groups.get(id) ?? { id, x, y, events: [] };
    group.events.push(e);
    groups.set(id, group);
  }
  return [...groups.values()];
}
