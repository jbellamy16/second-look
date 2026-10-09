import type { NarrationResult } from "./narration";
/** Standard token-rate estimate, not an invoice. Unknown models/rates remain unknown. */
export function estimateCost(
  result: Pick<NarrationResult, "provider" | "model" | "usage">,
): number | null {
  if (
    result.provider !== "openai" ||
    !["gpt-5.4-mini", "gpt-5.4-mini-2026-03-17"].includes(result.model) ||
    !result.usage.complete
  )
    return null;
  const { inputTokens, outputTokens, cachedInputTokens } = result.usage;
  return (
    (Math.max(0, inputTokens - cachedInputTokens) * 0.75 +
      cachedInputTokens * 0.075 +
      outputTokens * 4.5) /
    1_000_000
  );
}
