import { expect, test } from "@playwright/test";

test("club assets load and replay glyphs retain their small-screen proportions", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  const crests = page.locator(".scoreboard .crest");
  await expect(crests).toHaveCount(2);
  expect(
    await crests.evaluateAll((elements) =>
      elements.every((element) => {
        const image = element as HTMLImageElement;
        return image.complete && image.naturalWidth > 0;
      }),
    ),
  ).toBe(true);
  for (const label of ["Play match", "Pause match"]) {
    const button = page.getByRole("button", { name: label, exact: true });
    const glyph = button.locator("svg");
    const box = await glyph.boundingBox();
    expect(box?.width).toBe(20);
    expect(box?.height).toBe(20);
    await expect(glyph).toHaveAttribute("fill", "none");
    await button.click();
  }
  await page.getByText("Recent match events", { exact: true }).click();
  await expect(
    page.locator(".event-feed-list .event-glyph").first(),
  ).toBeVisible();
  await expect(page.locator(".event-feed-list button").first()).toContainText(
    /HBA|RIV/,
  );
});

test("Riverside keeps its identity when an event is selected", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("Recent match events", { exact: true }).click();
  const awayEvent = page
    .locator(".event-feed-list button")
    .filter({ has: page.locator(".event-glyph.riverside") })
    .first();
  await awayEvent.click();
  const selected = page.locator(
    '.pitch-panel .event-marker[aria-pressed="true"]',
  );
  await expect(selected.locator(".marker-square")).toHaveAttribute(
    "fill",
    "#ff7a83",
  );
  await expect(page.locator(".event-inspector")).toContainText(
    "SELECTED ACTION",
  );
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Player focus", exact: true })
    .click();
  await page.getByLabel("Focus player").selectOption("riverside-9");
  await expect(page.locator(".player-identity")).toContainText("RIV");
  await expect(page.locator(".player-identity img")).toHaveAttribute(
    "src",
    "/teams/riverside.svg",
  );
  const followBox = await page
    .getByRole("button", { name: "Follow this player", exact: true })
    .boundingBox();
  expect(followBox!.height).toBeLessThan(60);
  const metricTops = await page
    .locator(".player-metrics > div")
    .evaluateAll((elements) =>
      elements.map((el) => el.getBoundingClientRect().top),
    );
  expect(new Set(metricTops).size).toBe(1);
  if (page.viewportSize()!.width <= 820) {
    const identity = await page.locator(".player-identity").boundingBox();
    const heading = await page
      .getByRole("heading", { name: "Hugo Silva", exact: true })
      .boundingBox();
    expect(identity!.x + identity!.width).toBeLessThanOrEqual(heading!.x);
  }
});
