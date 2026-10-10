import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { localAiConfig } from "../scripts/ai-local-config.mjs";
import { SyntheticMatchSource } from "../src/lib/sources/synthetic";
import { directMatch } from "../src/lib/ai/director/runner";
import { matchEvidence } from "../src/lib/sources/intelligence";
import { renderSelection } from "../src/lib/ai/narration";
import { configuredProvider, modelFor } from "../src/lib/ai/providers";

// Never part of ordinary CI. Authorization + request cap + conservative spend reservation.
const MAX_REQUESTS = 6,
  RESERVATION_USD = 0.11;
const transport = globalThis.fetch;
const attempts: { latencyMs: number; status?: number; usage?: unknown }[] = [];
const rows: unknown[] = [];
let allowance = 0;
beforeAll(() => {
  if (process.env.SECOND_LOOK_AUTHORIZE_DIRECTOR_LIVE !== "yes")
    throw new Error(
      "Owner approval required for six OpenAI requests and a $0.70 allowance.",
    );
  allowance = Number(process.env.SECOND_LOOK_DIRECTOR_ALLOWANCE_USD);
  if (!Number.isFinite(allowance) || allowance < 0.7 || allowance > 1)
    throw new Error("Set the approved allowance between $0.70 and $1.00.");
  Object.assign(process.env, localAiConfig(process.cwd()));
  if (
    configuredProvider() !== "openai" ||
    !["gpt-5.4-mini", "gpt-5.4-mini-2026-03-17"].includes(modelFor("openai"))
  )
    throw new Error(
      "This budgeted evaluation requires OpenAI gpt-5.4-mini; review rates before another model.",
    );
  vi.stubGlobal("fetch", async (...args: Parameters<typeof fetch>) => {
    if (String(args[0]) !== "https://api.openai.com/v1/responses")
      throw new Error("Unexpected evaluation destination");
    if (
      attempts.length >= MAX_REQUESTS ||
      (attempts.length + 1) * RESERVATION_USD > allowance
    )
      throw new Error("Approved request or spending allowance exhausted");
    const payload = String(args[1]?.body ?? "");
    if (
      Buffer.byteLength(payload) > 131072 ||
      JSON.parse(payload).max_output_tokens > 1800
    )
      throw new Error("Cost envelope exceeded");
    // Reserve before dispatch, including failures. 131072 bytes + 2048 overhead tokens at $0.75/M,
    // plus 1800 output tokens at $4.50/M is < $0.11. Cached-input discounts are ignored.
    const attempt: { latencyMs: number; status?: number; usage?: unknown } = {
      latencyMs: 0,
    };
    attempts.push(attempt);
    const start = Date.now();
    try {
      const response = await transport(...args);
      attempt.status = response.status;
      const body = await response
        .clone()
        .json()
        .catch(() => ({}));
      attempt.usage = body.usage;
      return response;
    } finally {
      attempt.latencyMs = Date.now() - start;
    }
  });
});
for (const mode of ["fan", "analyst"] as const)
  it(`authorized director comparison: ${mode}`, async () => {
    const match = new SyntheticMatchSource().read("pressure", {
        seed: 8911,
        profile: "balanced",
      }),
      cutoff = 4200;
    const packet = matchEvidence(match, cutoff, mode);
    const baseline = renderSelection(
      { factIds: packet.facts.slice(0, 4).map((f) => f.id) },
      packet,
    );
    const result = await directMatch(match, cutoff, mode, { team: "harbor" });
    rows.push({
      match: match.id,
      cutoff,
      mode,
      baseline: baseline.narrative,
      result,
      humanReview: {
        factualAccuracy: null,
        evidenceConsistency: null,
        relevance: null,
        narrativeQuality: null,
        novelty: null,
        repetition: null,
        audienceUsefulness: null,
        abstentionQuality: null,
        preferableToBaseline: null,
      },
    });
    expect(result.source).toBe("openai");
    expect(
      result.stories.every((s) =>
        s.evidenceEventIds.every((id) =>
          match.events.some((e) => e.id === id && e.time <= cutoff),
        ),
      ),
    ).toBe(true);
  });
afterAll(() => {
  vi.unstubAllGlobals();
  if (!rows.length && !attempts.length) return;
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(
    "artifacts/director-live-evaluation.json",
    JSON.stringify(
      {
        kind: "live or verified cache; inspect cached flag",
        maximumRequests: MAX_REQUESTS,
        requests: attempts.length,
        allowanceUsd: allowance,
        reservedUsd: attempts.length * RESERVATION_USD,
        attempts,
        improvementRate: null,
        rows,
      },
      null,
      2,
    ),
  );
});
