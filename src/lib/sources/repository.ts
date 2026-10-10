import "server-only";
import { HistoricalMatchSource } from "./historical";
import type { MatchData } from "./model";
const source = new HistoricalMatchSource(async (id) => {
  switch (id) {
    case "2499719":
      return (await import("../../../data/historical/2499719.json")).default;
    case "2499943":
      return (await import("../../../data/historical/2499943.json")).default;
    case "2499841":
      return (await import("../../../data/historical/2499841.json")).default;
    default:
      throw new Error("Unknown historical match");
  }
});
const loaded = new Map<string, Promise<MatchData>>();
export function loadHistorical(id: string) {
  let result = loaded.get(id);
  if (!result) {
    result = source.load(id).catch((e) => {
      loaded.delete(id);
      throw e;
    });
    loaded.set(id, result);
  }
  return result;
}
export const historicalEnabled = () =>
  process.env.HISTORICAL_MATCHES_ENABLED !== "false";
