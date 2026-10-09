import { afterEach, expect, it, vi } from "vitest";
import { POST, GET } from "../src/app/api/insights/route";
import { POST as recapPost } from "../src/app/api/recap/route";
import { generateMatch, DEMO_TIME } from "../src/lib/match";
import { buildEvidence } from "../src/lib/ai/evidence";
import { detectInsights } from "../src/lib/intelligence";
import { configure, mockProvider } from "./ai-helpers";
const data = {
  scenario: "pressure",
  time: DEMO_TIME,
  mode: "fan",
  team: "harbor",
  category: "pressure",
};
const request = (body: unknown) =>
  new Request("http://localhost/api", {
    method: "POST",
    body: JSON.stringify(body),
  });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it("coalesces concurrent requests, reuses validated cache and labels OpenAI accurately", async () => {
  configure();
  const events = generateMatch("pressure");
  const insight = detectInsights(events, DEMO_TIME)[0];
  const mock = mockProvider(
    buildEvidence(events, DEMO_TIME, "fan", {}, insight),
  );
  vi.stubGlobal("fetch", mock);
  const responses = await Promise.all([
    POST(request(data)),
    POST(request(data)),
  ]);
  for (const res of responses) {
    const value = await res.json();
    expect(value.source).toBe("openai");
    expect(value.provenance.provider).toBe("openai");
  }
  const cached = await (await POST(request(data))).json();
  expect(cached.provenance.cached).toBe(true);
  expect(mock).toHaveBeenCalledTimes(2);
});
it("production fails closed without a shared store even if memory is selected", async () => {
  configure();
  vi.stubEnv("NODE_ENV", "production");
  const mock = vi.fn();
  vi.stubGlobal("fetch", mock);
  expect((await (await GET()).json()).mode).toBe("offline");
  expect((await (await POST(request(data))).json()).source).toBe("offline");
  expect(mock).not.toHaveBeenCalled();
});
it("reports only successful provenance and never leaks provider errors", async () => {
  configure();
  vi.stubEnv("OPENAI_MODEL", "failure-model");
  const mock = vi.fn().mockRejectedValue(new Error("secret provider details"));
  vi.stubGlobal("fetch", mock);
  const value = await (await POST(request(data))).json();
  expect(value.source).toBe("offline");
  expect(value.provenance.activity).toEqual([]);
  expect(JSON.stringify(value)).not.toContain("secret provider");
});
it("skips paid calls in an empty recap and preserves cutoff", async () => {
  configure();
  const mock = vi.fn();
  vi.stubGlobal("fetch", mock);
  const value = await (
    await recapPost(request({ scenario: "quiet", time: 0, mode: "analyst" }))
  ).json();
  expect(value.source).toBe("offline");
  expect(value.summary.moments).toEqual([]);
  expect(value.provenance.cutoff).toBe(0);
  expect(mock).not.toHaveBeenCalled();
});
it("validates recap inputs and refuses client supplied facts", async () => {
  for (const body of [
    { scenario: "pressure", time: -1, mode: "fan" },
    { scenario: "pressure", time: DEMO_TIME, mode: "fan", stats: { goals: 8 } },
  ])
    expect((await recapPost(request(body))).status).toBe(400);
  expect(
    (
      await POST(
        request({
          ...data,
          preferences: { seenEvidenceIds: Array(201).fill("event") },
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (await POST(request({ ...data, extra: "x".repeat(17000) }))).status,
  ).toBe(400);
});

it.each(["fan", "analyst"] as const)(
  "recap API returns an attributed and timestamp-safe %s story",
  async (mode) => {
    configure("foundry");
    vi.stubEnv("AI_MINUTE_LIMIT", "10");
    const packet = buildEvidence(
      generateMatch("substitution"),
      DEMO_TIME,
      mode,
    );
    const mock = mockProvider(packet);
    vi.stubGlobal("fetch", mock);
    const value = await (
      await recapPost(
        request({ scenario: "substitution", time: DEMO_TIME, mode }),
      )
    ).json();
    expect(value.source).toBe("foundry");
    expect(value.provenance.provider).toBe("foundry");
    expect(value.provenance.cutoff).toBe(DEMO_TIME);
    expect(
      value.narrative.evidenceIds.every((id: string) =>
        packet.events.some((e) => e.id === id && e.time <= DEMO_TIME),
      ),
    ).toBe(true);
    expect(mock).toHaveBeenCalledTimes(2);
  },
);
it("rejects an insecure production store before making any provider request", async () => {
  configure();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("AI_REDIS_URL", "redis://localhost:6379");
  vi.stubEnv("OPENAI_MODEL", "tls-test");
  const mock = vi.fn();
  vi.stubGlobal("fetch", mock);
  expect((await (await POST(request(data))).json()).source).toBe("offline");
  expect(mock).not.toHaveBeenCalled();
});
