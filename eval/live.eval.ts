import { afterAll, expect, it } from "vitest";
import { loadEnvConfig } from "@next/env";
import { mkdirSync, writeFileSync } from "node:fs";
import { generateMatch, DEMO_TIME } from "../src/lib/match";
import { buildEvidence } from "../src/lib/ai/evidence";
import { configuredProvider } from "../src/lib/ai/providers";
import { usageStoreReady } from "../src/lib/ai/controls";
import { narratePacket } from "../src/lib/ai/service";
import { estimateCost } from "../src/lib/ai/cost";
const rows: unknown[] = [];
// This separate suite is never included in npm test, check, build or CI.
for (const mode of ["fan", "analyst"] as const)
  it(`authorized live ${mode} recap`, async () => {
    if (process.env.SECOND_LOOK_AUTHORIZE_LIVE !== "yes")
      throw new Error(
        "Live API calls require explicit owner authorization. Set SECOND_LOOK_AUTHORIZE_LIVE=yes only after approval.",
      );
    loadEnvConfig(process.cwd());
    expect(configuredProvider()).not.toBe("offline");
    expect(usageStoreReady()).toBe(true);
    const packet = buildEvidence(generateMatch("pressure"), DEMO_TIME, mode);
    const start = Date.now();
    const result = await narratePacket(packet);
    const provenance = result.provenance;
    const cost =
      result.source !== "offline" && provenance.usage
        ? estimateCost({
            provider: result.source,
            model: provenance.model!,
            usage: provenance.usage,
            narrative: result.narrative!,
            selectedFactIds: provenance.facts.map((f) => f.id),
            activity: provenance.activity,
            validation: provenance.validation,
          })
        : null;
    rows.push({
      mode,
      result,
      verifiedFacts: packet.facts,
      comparisons: packet.comparisons,
      requestLatencyMs: Date.now() - start,
      estimatedNewCostUsd: provenance.cached ? 0 : cost,
      actualBillingCostUsd: null,
      failedRequestUsage:
        result.source === "offline"
          ? "unknown; provider failures can still be billable"
          : null,
      humanReview: {
        factualAccuracy: null,
        relevance: null,
        narrativeQuality: null,
        audienceFit: null,
        preferableToDeterministic: null,
      },
    });
    expect(result.source).not.toBe("offline");
    expect(
      provenance.facts.every((f) =>
        packet.facts.some(
          (verified) => verified.id === f.id && verified.text === f.text,
        ),
      ),
    ).toBe(true);
  });
afterAll(() => {
  if (!rows.length) return;
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(
    "artifacts/ai-live-evaluation.json",
    JSON.stringify(
      {
        kind: "live-or-validated-cache; inspect each cached flag",
        maximumNewRequests: 4,
        pricingReference:
          "https://developers.openai.com/api/docs/models/gpt-5.4-mini",
        pricingChecked: "2026-10-09",
        rows,
      },
      null,
      2,
    ),
  );
});
