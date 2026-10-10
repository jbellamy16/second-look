import { expect, test } from "@playwright/test";

test("timeline events preview on hover and focus without seeking", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  const goal = page.getByRole("button", {
    name: "Seek to 01:00 goal",
    exact: true,
  });
  const clock = page.getByTestId("clock");
  const initial = (await clock.textContent())!;
  await goal.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("Goal by Arlo Hayes");
  await expect(tooltip).toContainText("Assist: Milo Serrano");
  await expect(clock).toHaveText(initial);
  const bounds = (await tooltip.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await tooltip.hover();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  const sub = page.locator(".timeline-events .sub-tick").first();
  await sub.focus();
  await expect(tooltip).toContainText("Nico Wells on for Arlo Hayes");
  await expect(clock).toHaveText(initial);
  await goal.click();
  await expect(clock).toContainText("01:00");
  await expect(tooltip).toHaveCount(0);
});
