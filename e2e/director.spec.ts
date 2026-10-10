import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("computed story connects evidence, broadcast JSON, and rewind-safe visibility", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const story = page.locator(".director-story");
  await expect(story).toBeVisible();
  await expect(story).toContainText("Deterministic offline");
  await story
    .getByRole("button", { name: "Replay story evidence", exact: true })
    .click();
  await expect(story.locator("svg").first()).toBeVisible();
  await story.getByText("Broadcast story", { exact: true }).click();
  await expect(story.locator(".broadcast-frame")).toBeVisible();
  const download = page.waitForEvent("download");
  await story
    .getByRole("button", { name: "Download verified story JSON" })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "between-the-lines-story.json",
  );
  const audit = await new AxeBuilder({ page })
    .include(".director-story")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await story.screenshot({
    path: `artifacts/director-${testInfo.project.name}.png`,
  });
  await page.getByRole("slider").first().fill("0");
  await expect(story).not.toBeVisible();
});
test("Catch Me Up calls the director and remains explicitly offline", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Catch me up", exact: true }).click();
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/director") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Review verified recap", exact: true })
    .click();
  const result = await (await response).json();
  expect(result.source).toBe("offline");
  expect(result.metrics.requests).toBe(0);
  await expect(page.getByRole("dialog")).toContainText(
    result.narrative.explanation,
  );
});
test("an investigation response cannot survive a rewind", async ({ page }) => {
  const response = await page.request.post("/api/director", {
    data: { scenario: "pressure", time: 3804, mode: "fan" },
  });
  const result = await response.json();
  // Delayed UI transport fixture only; this test does not simulate successful live inference.
  result.stories[0].headline = "LATE INVESTIGATION RESULT";
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/director", async (route) => {
    await held;
    await route.fulfill({ json: result }).catch(() => {});
  });
  await page.goto("/");
  const request = page.waitForRequest((r) => r.url().endsWith("/api/director"));
  await page
    .getByRole("button", { name: "Investigate this passage", exact: true })
    .click();
  await request;
  await page.getByRole("slider", { name: "Match timeline" }).fill("0");
  release();
  await expect(page.locator(".director-story")).not.toBeVisible();
  await expect(page.getByText("LATE INVESTIGATION RESULT")).toHaveCount(0);
});
