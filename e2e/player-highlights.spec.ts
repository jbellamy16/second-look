import { expect, test } from "@playwright/test";

test("lineups and player focus show goals and substitutions without revealing future events", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.getByRole("button", { name: "Lineups", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Starting XI", exact: true }),
  ).toHaveCount(2);
  await expect(
    page.getByRole("heading", { name: "Substitutes", exact: true }),
  ).toHaveCount(2);
  const arlo = page
    .locator(".player-row")
    .filter({ has: page.locator("strong", { hasText: "Arlo Hayes" }) });
  await expect(arlo.locator('[title^="Goal at"]')).toHaveCount(1);
  await expect(arlo).toContainText("Off · Nico Wells");
  await arlo.click();
  const goals = page
    .locator(".player-metrics > div")
    .filter({ hasText: "Goals" });
  await expect(goals.locator("strong")).toHaveText("1");
  await expect(page.locator(".player-metrics")).toContainText("Assists");
  await expect(page.locator(".player-status-line")).toContainText(
    "Off · Nico Wells",
  );
  await page.getByRole("slider", { name: "Match timeline" }).focus();
  await page.getByRole("slider", { name: "Match timeline" }).press("Home");
  await expect(goals.locator("strong")).toHaveText("0");
  await expect(page.locator(".player-status-line")).not.toContainText(
    "Nico Wells",
  );
  await page.getByRole("button", { name: "Lineups", exact: true }).click();
  await expect(arlo.locator(".player-badge")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("scoreline and player views credit Milo only after Arlo scores", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  const timeline = page.getByRole("slider", { name: "Match timeline" });
  await timeline.fill("59");
  await expect(page.locator(".score-contributions")).toHaveCount(0);
  await page.getByRole("button", { name: "Player focus", exact: true }).click();
  await page.getByLabel("Focus player").selectOption("harbor-6");
  const assists = page
    .locator(".player-metrics > div")
    .filter({ hasText: "Assists" })
    .locator("strong");
  await expect(assists).toHaveText("0");
  await timeline.fill("60");
  await expect(assists).toHaveText("1");
  await expect(page.locator(".score-goals")).toContainText("Arlo Hayes (1′)");
  await expect(page.locator(".score-assists")).toContainText(
    "Milo Serrano (1′)",
  );
  await expect(page.locator(".score-contributions")).not.toContainText("HT");
  await page.getByRole("button", { name: "Lineups", exact: true }).click();
  const milo = page
    .locator(".player-row")
    .filter({ has: page.locator("strong", { hasText: "Milo Serrano" }) });
  await expect(milo.locator('[title^="Assist at"]')).toHaveCount(1);
  await timeline.fill("55");
  await expect(milo.locator('[title^="Assist at"]')).toHaveCount(0);
  await expect(page.locator(".score-contributions")).toHaveCount(0);
});
