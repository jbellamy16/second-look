import { expect, test } from "@playwright/test";

test("event panels animate both ways, support keyboard input and survive rapid toggles", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  const panel = page.locator(".match-event-feed");
  const summary = panel.locator("summary");
  const collapsed = (await panel.boundingBox())!.height;
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toHaveAttribute("open", "");
  await panel.evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((a) => a.finished));
  });
  expect((await panel.boundingBox())!.height).toBeGreaterThan(collapsed + 100);
  const actions = await panel
    .locator(".event-feed-list button > span:last-of-type")
    .allTextContents();
  expect(actions.length).toBeGreaterThan(0);
  expect(actions.every((text) => /^[A-Z]/.test(text.trim()))).toBe(true);
  const closing = await summary.evaluate((el) => {
    (el as HTMLElement).click();
    return el
      .parentElement!.getAnimations()
      .some((a) => a.playState === "running");
  });
  expect(closing).toBe(true);
  await expect(panel).not.toHaveAttribute("open");
  expect((await panel.boundingBox())!.height).toBeCloseTo(collapsed, 0);
  await summary.evaluate((el) => {
    for (let i = 0; i < 3; i++) (el as HTMLElement).click();
  });
  await panel.evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((a) => a.finished));
  });
  await expect(panel.locator(".event-feed-list")).toBeVisible();
  await summary.focus();
  await page.keyboard.press("Space");
  await expect(panel).not.toHaveAttribute("open");
  await expect(panel.locator(".event-feed-list")).not.toBeVisible();
});

test("reduced motion keeps disclosures immediate", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  const panel = page.locator(".pitch-notes");
  await panel.locator("summary").click();
  await expect(panel).toHaveAttribute("open", "");
  expect(
    await panel.evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await panel.locator("summary").click();
  await expect(panel).not.toHaveAttribute("open");
});
