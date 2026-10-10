import type { NormalizedEvent } from "./model";

/** Call with the player's events visible at the current playback time. */
export function passStatistics(events: readonly NormalizedEvent[]) {
  const passes = events.filter((event) => event.type === "pass");
  return {
    passAttempts: passes.length,
    passCompletion:
      passes.length && passes.every((event) => event.success !== undefined)
        ? Math.round(
            (100 * passes.filter((event) => event.success === true).length) /
              passes.length,
          )
        : null,
  };
}
