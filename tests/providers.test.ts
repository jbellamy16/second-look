import { afterEach, expect, it, vi } from "vitest";
import { generateMatch, DEMO_TIME } from "../src/lib/match";
import { buildEvidence, verifyInsight } from "../src/lib/ai/evidence";
import { configuredProvider, providerResponse } from "../src/lib/ai/providers";
import { composeNarration, renderSelection } from "../src/lib/ai/narration";
import { detectInsights, rankInsights } from "../src/lib/intelligence";
import { configure, editorialBaseline, mockProvider } from "./ai-helpers";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const events = generateMatch("pressure");
const packet = buildEvidence(events, DEMO_TIME, "fan");
it.each(["openai", "foundry"] as const)(
  "%s uses the same evidence and output contract",
  async (provider) => {
    configure(provider);
    const fetchMock = mockProvider(packet);
    vi.stubGlobal("fetch", fetchMock);
    const result = await composeNarration(packet, provider);
    expect(result.provider).toBe(provider);
    expect(result.usage).toMatchObject({
      inputTokens: 600,
      outputTokens: 50,
      requests: 2,
      complete: true,
    });
    expect(result.activity).toContain("get_verified_evidence completed");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      provider === "openai"
        ? "https://api.openai.com/v1/responses"
        : "https://example.openai.azure.com/openai/v1/responses",
    );
    expect(
      init.headers[provider === "openai" ? "Authorization" : "api-key"],
    ).toContain("test-only");
    expect(init.redirect).toBe("error");
    const first = JSON.parse(init.body);
    expect(first.store).toBe(false);
    expect(first.max_output_tokens).toBe(1800);
    expect(first.model).toBe(
      provider === "openai" ? "gpt-5.4-mini" : "test-deployment",
    );
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(JSON.parse(second.input.at(-1).output)).toEqual(packet);
    expect(second.text.format.strict).toBe(true);
    expect(result.narrative.explanation).toBe(
      editorialBaseline(packet)
        .factIds.map((id) => packet.facts.find((f) => f.id === id)!.text)
        .join(" "),
    );
  },
);
it("defaults to disabled and honors explicit disable over legacy Foundry enable", () => {
  vi.stubEnv("AI_ENABLED", "false");
  vi.stubEnv("FOUNDRY_ENABLED", "true");
  expect(configuredProvider()).toBe("offline");
  configure();
  expect(configuredProvider()).toBe("openai");
  vi.stubEnv("AI_PROVIDER", "unknown");
  expect(configuredProvider()).toBe("offline");
});
it.each([429, 500, 401])("does not retry provider HTTP %i", async (status) => {
  configure();
  const mock = vi
    .fn()
    .mockResolvedValue(new Response("private error", { status }));
  vi.stubGlobal("fetch", mock);
  await expect(providerResponse("openai", {})).rejects.toThrow(
    "Provider unavailable",
  );
  expect(mock).toHaveBeenCalledTimes(1);
});
it.each([
  { output: [], status: "incomplete" },
  { output: [{ type: "message", content: [{ type: "refusal" }] }] },
  {
    output: [
      { type: "function_call", name: "other", call_id: "x", arguments: "{}" },
    ],
  },
])("rejects refusal, incomplete output and wrong tools", async (value) => {
  configure();
  const mock = vi.fn().mockResolvedValue(Response.json(value));
  vi.stubGlobal("fetch", mock);
  await expect(composeNarration(packet, "openai")).rejects.toThrow();
  expect(mock).toHaveBeenCalledTimes(1);
});
it.each([
  { factIds: ["score", "invented-statistic"] },
  { factIds: ["score", "score"] },
  { factIds: ["score"], explanation: "Harbor dominated possession" },
])("rejects unsupported or misleading selection %j", (value) => {
  expect(() => renderSelection(value, packet)).toThrow();
});
it("requires abstention when no pattern qualifies and rejects forged comparison metrics", () => {
  const quiet = buildEvidence(generateMatch("quiet"), 0, "fan");
  expect(renderSelection({ factIds: [] }, quiet).selectedFactIds).toEqual([
    "score",
    "no-pattern",
  ]);
  expect(
    renderSelection({ factIds: ["score", "no-pattern"] }, quiet).narrative
      .explanation,
  ).toContain("not yet enough");
  const insight = detectInsights(events, DEMO_TIME)[0];
  expect(() => verifyInsight({ ...insight, current: 99 }, events)).toThrow();
  expect(() =>
    verifyInsight({ ...insight, evidenceIds: [events.at(-1)!.id] }, events),
  ).toThrow();
});
it("ranking accounts for novelty, evidence, preferences and audience", () => {
  const insights = detectInsights(events, DEMO_TIME);
  const fresh = rankInsights(insights, events, "fan");
  const seen = rankInsights(insights, events, "analyst", {
    seenEvidenceIds: insights.flatMap((i) => i.evidenceIds),
    team: "harbor",
  });
  expect(fresh.every((r) => r.factors.novelty === 1)).toBe(true);
  expect(seen.every((r) => r.factors.novelty === 0)).toBe(true);
  expect(
    seen.find((r) => r.insight.team === "harbor")!.factors.preference,
  ).toBe(2);
  expect(
    fresh.find((r) => r.insight.category === "chances")!.factors.audience,
  ).toBe(0.5);
  expect(rankInsights(insights, events, "fan", { categories: [] })).toEqual([]);
});

it("cost estimates use recorded usage and never invent prices for Foundry", async () => {
  const { estimateCost } = await import("../src/lib/ai/cost");
  configure();
  vi.stubGlobal("fetch", mockProvider(packet));
  const result = await composeNarration(packet, "openai");
  expect(estimateCost(result)).toBeCloseTo((600 * 0.75 + 50 * 4.5) / 1e6);
  expect(estimateCost({ ...result, provider: "foundry" })).toBeNull();
  expect(
    estimateCost({ ...result, usage: { ...result.usage, complete: false } }),
  ).toBeNull();
});

it("accepts nullable envelope fields without weakening fact validation", async () => {
  configure();
  const baseline = mockProvider(packet);
  const responses = [await baseline(), await baseline()];
  const first = await responses[0].json();
  const second = await responses[1].json();
  second.output.unshift({
    type: "reasoning",
    content: null,
    name: null,
    arguments: null,
    call_id: null,
    summary: [],
  });
  const mock = vi
    .fn()
    .mockResolvedValueOnce(Response.json(first))
    .mockResolvedValueOnce(Response.json(second));
  vi.stubGlobal("fetch", mock);
  expect((await composeNarration(packet, "openai")).selectedFactIds).toEqual(
    editorialBaseline(packet).factIds,
  );
});
it("diagnoses rejected selections without exposing private model reasoning", async () => {
  configure();
  vi.stubGlobal(
    "fetch",
    mockProvider(packet, { factIds: ["invented-statistic"] }),
  );
  await expect(composeNarration(packet, "openai")).rejects.toMatchObject({
    stage: "story_validation",
    activity: [
      "get_verified_evidence completed",
      "Structured story selection received",
    ],
    checks: ["Unsupported claim"],
  });
});
