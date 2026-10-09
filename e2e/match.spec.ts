import { expect, test } from "@playwright/test";
test("playback, evidence, modes, recap, and rewind stay synchronized", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await expect(page.getByTestId("clock")).toContainText("63:24");
  await expect(
    page.getByRole("heading", { name: "Harbor are winning it higher" }),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Show me the sequence" }).click();
  await expect(
    page.getByRole("heading", { name: "Sequence replay" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Analyst mode", exact: true }).click();
  await expect(page.getByText("Measurement notes")).toBeVisible();
  await page.getByRole("button", { name: /Catch me up/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText(/Event-derived recap/)).toContainText("63:24");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Restart match" }).click();
  await expect(page.getByTestId("score")).toHaveText("0:0");
  await expect(page.getByTestId("clock")).toContainText("00:00");
  await page.getByRole("button", { name: /Catch me up/ }).click();
  await expect(
    page.getByText("No major moments yet.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Play match", exact: true }).click();
  await expect(page.getByTestId("clock")).not.toContainText("00:00");
  await page.getByRole("button", { name: "Pause match", exact: true }).click();
  expect(errors).toEqual([]);
});
test("scenarios, navigation, player preferences and mobile layout work", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByLabel("Demo scenario").selectOption("quiet");
  await expect(page.getByText("Let the game tell its story.")).toBeVisible();
  await page.getByLabel("Demo scenario").selectOption("substitution");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Match stats" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Match statistics", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Lineups", exact: true })
    .click();
  await page.getByRole("button", { name: /17 Nico Wells/ }).click();
  await expect(page.getByRole("heading", { name: "Nico Wells" })).toBeVisible();
  await page.getByRole("button", { name: "Follow this player" }).click();
  await expect(
    page.getByRole("button", { name: "Following this player" }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Player focus" })
    .click();
  await page.getByLabel("Focus player").selectOption("harbor-12");
  await expect(
    page.getByRole("button", { name: "Following this player" }),
  ).toBeVisible();
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.viewport);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Match centre" })
    .click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("explanation provenance, category preferences, and arbitrary seeking are truthful", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the explanation" }).click();
  await expect(
    page.getByText("DETERMINISTIC · VERIFIED EXPLANATION"),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Offline demo");
  await page
    .getByRole("button", { name: "Your experience", exact: true })
    .click();
  for (const name of ["Pressure", "Chances", "Rhythm"])
    await page.getByRole("checkbox", { name }).uncheck();
  await page.getByRole("button", { name: "Save my experience" }).click();
  await expect(
    page.getByText("Choose an insight category in Your experience."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Choose an insight category in Your experience."),
  ).toBeVisible();
  const timeline = page.getByRole("slider", { name: "Match timeline" });
  await timeline.focus();
  await timeline.press("End");
  await expect(page.getByTestId("clock")).toContainText("90:00");
  await timeline.press("Home");
  await expect(page.getByTestId("clock")).toContainText("00:00");
  await expect(page.getByTestId("score")).toHaveText("0:0");
});
