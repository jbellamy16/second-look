import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function historical(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Real Match", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Historical replay", exact: true }),
  ).toBeVisible();
}
async function seek(page: Page, time: number) {
  await page.getByRole("slider", { name: "Match timeline" }).fill(String(time));
}
test("source selection, spoiler-safe replay, event exploration and match switching", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const paidRoutes: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") paidRoutes.push(r.url());
  });
  await historical(page);
  await expect(page.getByTestId("score")).toHaveText("0:0");
  await expect(page.getByTestId("final-score")).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Reveal final score" }).check();
  await expect(page.getByTestId("final-score")).toContainText(
    "Arsenal 4–3 Leicester City",
  );
  await page.getByRole("checkbox", { name: "Reveal final score" }).uncheck();
  await page.getByRole("button", { name: "Play match", exact: true }).click();
  await expect(page.getByTestId("clock")).not.toContainText("00:00");
  await page.getByLabel("Playback speed").selectOption("32");
  await page.getByRole("button", { name: "Pause match", exact: true }).click();
  await seek(page, 1800);
  await expect(page.getByTestId("score")).toHaveText("1:2");
  await expect(
    page
      .getByRole("heading", { name: "Arsenal are picking up the rhythm" })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Analyst mode", exact: true }).click();
  await expect(
    page.getByText(/153 pass attempts in the current/),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: /Pass attempts.*Arsenal are picking up the rhythm/,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Where it happened" }),
  ).toBeVisible();
  await page
    .locator(".historical-feed .event-feed-list button")
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Recorded passage" }),
  ).toBeVisible();
  await expect(page.locator(".event-inspector")).toContainText("Source ID:");
  const markers = await page
    .locator(".pitch [data-event-time]")
    .evaluateAll((nodes) =>
      nodes.map((n) => Number(n.getAttribute("data-event-time"))),
    );
  expect(markers.every((t) => t <= 1800)).toBe(true);
  await page.getByRole("button", { name: "Catch me up" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Arsenal 1–2 Leicester City",
  );
  await expect(page.getByRole("dialog")).not.toContainText("4–3");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Restart match" }).click();
  await expect(page.getByTestId("score")).toHaveText("0:0");
  expect(paidRoutes).toEqual([]);
  for (const [id, score] of [
    ["2499719", "4:3"],
    ["2499943", "4:3"],
    ["2499841", "1:2"],
  ]) {
    await page.getByLabel("Historical match").selectOption(id);
    await expect(page.locator(".historical-scoreboard")).toHaveAttribute(
      "data-match-id",
      id,
    );
    await expect(
      page.getByRole("heading", { name: "Historical replay", exact: true }),
    ).toBeVisible();
    await page.getByRole("slider", { name: "Match timeline" }).focus();
    await page.keyboard.press("End");
    await expect(page.getByTestId("score")).toHaveText(score);
    await page.getByRole("slider", { name: "Match timeline" }).focus();
    await page.keyboard.press("Home");
    await expect(page.getByTestId("score")).toHaveText("0:0");
  }
  await page.getByLabel("Historical match").selectOption("2499719");
  await expect(
    page.getByRole("heading", { name: "Historical replay", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".historical-scoreboard")).toContainText("Arsenal");
  await seek(page, 1800);
  await expect(page.getByTestId("clock")).toContainText("30:00");
  const size = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: innerWidth,
  }));
  expect(size.scroll).toBeLessThanOrEqual(size.width);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "Real Match", exact: true }).focus();
  await page.screenshot({
    scale: "css",
    path: `artifacts/historical-${info.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Synthetic", exact: true }).click();
  await expect(page.getByTestId("clock")).toContainText("63:24");
  await page.screenshot({
    path: `artifacts/source-synthetic-${info.project.name}.png`,
    scale: "css",
    fullPage: false,
  });
});
test("historical accessibility, offline explanation and cutoff validation", async ({
  page,
}) => {
  await historical(page);
  await seek(page, 1800);
  await page
    .getByRole("button", { name: "Verify this explanation", exact: true })
    .click();
  await expect(
    page.locator(".historical-intelligence .historical-provider").last(),
  ).toContainText("Deterministic offline");
  await page.getByRole("button", { name: "Catch me up" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Verify this explanation", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByText("How Between the Lines knows", { exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Evidence through 30:00",
  );
  await page.keyboard.press("Escape");
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
});
test("replays stoppage time before the second half without revealing future goals", async ({
  page,
}) => {
  await historical(page);
  await seek(page, 2820);
  await expect(page.getByTestId("clock")).toContainText("45+02:00");
  await expect(page.getByTestId("score")).toHaveText("2:2");
  await seek(page, 2854);
  await expect(page.getByTestId("clock")).toContainText("45:00");
  await expect(page.getByTestId("score")).toHaveText("2:2");
  await page.getByRole("button", { name: "Catch me up" }).click();
  await expect(page.getByRole("dialog")).not.toContainText("4–3");
  await expect(page.getByRole("dialog")).toContainText(
    "Two complete comparison windows within this half are not yet available",
  );
});
test("an emerging insight notifies once, without autonomous inference", async ({
  page,
}) => {
  await page.clock.install();
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") requests.push(r.url());
  });
  await historical(page);
  await seek(page, 1790);
  await page.getByLabel("Playback speed").selectOption("16");
  await page.getByRole("button", { name: "Play match", exact: true }).click();
  await page.clock.runFor(1000);
  await expect(page.locator(".insight-notice")).toBeVisible();
  await page.getByRole("button", { name: "Dismiss observation" }).click();
  await page.clock.runFor(15000);
  await expect(page.locator(".insight-notice")).toHaveCount(0);
  expect(requests).toEqual([]);
});
test("late AI answers cannot survive a rewind or a match switch", async ({
  page,
}) => {
  await page.route("**/api/insights", (route) =>
    route.fulfill({ json: { mode: "openai" } }),
  );
  let release: () => void = () => {};
  let started: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    started = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/historical/narrate", async (route) => {
    started();
    await gate;
    await route
      .fulfill({
        json: {
          source: "openai",
          narrative: {
            explanation: "Stale historical answer",
            why: "old",
            watch: "old",
            evidenceIds: [],
            insightId: "old",
          },
          provenance: {
            provider: "openai",
            cached: false,
            cutoff: 1800,
            activity: [],
            validation: [],
            limitations: [],
            facts: [],
          },
        },
      })
      .catch(() => {});
  });
  await historical(page);
  await seek(page, 1800);
  await page
    .getByRole("button", { name: "Explain with OpenAI", exact: true })
    .click();
  await pending;
  await page.getByRole("button", { name: "Restart match" }).click();
  release();
  await expect(page.getByTestId("score")).toHaveText("0:0");
  await expect(page.getByText("Stale historical answer")).toHaveCount(0);
  await page.getByRole("button", { name: "Synthetic", exact: true }).click();
  await expect(page.getByTestId("clock")).toContainText("63:24");
});
test("historical replay supports dark appearance, reduced motion and a 320px screen", async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 850 });
  await historical(page);
  await seek(page, 1800);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Real Match", exact: true }).focus();
  await page.screenshot({
    path: `artifacts/historical-dark-${info.project.name}.png`,
    scale: "css",
    fullPage: true,
  });
});
