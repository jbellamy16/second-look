import { expect, test } from "@playwright/test";

test("hosted APIs preserve disabled inference, input validation and timestamp-safe recaps", async ({
  request,
}) => {
  // Stop before POST if a destination has enabled inference. This is a no-spend test.
  const status = await request.get("/api/insights");
  expect(status.ok()).toBe(true);
  expect(await status.json()).toMatchObject({
    mode: "offline",
    configured: "offline",
  });
  for (const mode of ["fan", "analyst"]) {
    for (const time of [0, 3804]) {
      const response = await request.post("/api/recap", {
        data: { scenario: "pressure", time, mode },
      });
      expect(response.ok()).toBe(true);
      const body = await response.json();
      expect(body.source).toBe("offline");
      expect(body.narrative).toBeNull();
      expect(body.provenance.cutoff).toBe(time);
      expect(body.provenance.activity).toEqual([]);
      const score = body.provenance.facts.find(
        (fact: { id: string }) => fact.id === "score",
      );
      expect(score.text).toContain(time === 0 ? "0–0" : "1–0");
      if (time === 0) expect(JSON.stringify(body)).not.toContain("Arlo Hayes");
    }
  }
  const invalid = await request.post("/api/recap", {
    data: { scenario: "pressure", time: -1, mode: "fan" },
  });
  expect(invalid.status()).toBe(400);
});
