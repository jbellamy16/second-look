import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../src/lib/foundry", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/foundry")>()),
  foundryConfigured: () => false,
}));
// Alias resolved explicitly by Vitest config.
import { POST } from "../src/app/api/insights/route";
const request = (data: unknown) =>
  new Request("http://localhost/api/insights", {
    method: "POST",
    body: JSON.stringify(data),
  });
it("rejects invalid or unbounded playback input", async () => {
  expect(
    (
      await POST(
        request({
          scenario: "pressure",
          time: 999999,
          mode: "fan",
          team: "harbor",
          category: "pressure",
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await POST(
        request({
          scenario: "real-match",
          time: 3804,
          mode: "fan",
          team: "harbor",
          category: "pressure",
        }),
      )
    ).status,
  ).toBe(400);
});
it("returns a truthful offline response with server-derived evidence", async () => {
  const res = await POST(
    request({
      scenario: "pressure",
      time: 3804,
      mode: "fan",
      team: "harbor",
      category: "pressure",
    }),
  );
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.source).toBe("offline");
  expect(data.narrative).toBeNull();
  expect(data.insight.end).toBe(3804);
});
it("does not produce an insight at kickoff", async () => {
  expect(
    (
      await POST(
        request({
          scenario: "pressure",
          time: 0,
          mode: "fan",
          team: "harbor",
          category: "pressure",
        }),
      )
    ).status,
  ).toBe(404);
});
