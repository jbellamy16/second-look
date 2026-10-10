import { test, expect } from "@playwright/test";

test("Between the Lines metadata, installed identity, and SVG logos agree", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Between the Lines | More than the score.");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(
    page.locator('img[alt="Between the Lines"]:visible'),
  ).toHaveCount(1);
  expect(await page.locator("body").innerText()).not.toMatch(/Second Look/i);
  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  expect(canonical).toMatch(/^https?:\/\//);
  for (const selector of [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
  ]) {
    const url = await page.locator(selector).getAttribute("content");
    const image = await request.get(new URL(url!).pathname);
    expect(image.ok()).toBe(true);
    expect(image.headers()["content-type"]).toContain("image/png");
  }
  const manifestPath = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  const manifest = await (await request.get(manifestPath!)).json();
  expect(manifest.name).toBe("Between the Lines");
  expect(manifest.short_name).toBe("BTL");
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).ok()).toBe(true);
  {
    await page.getByRole("button", { name: "Settings", exact: true }).click();
  }
  await page
    .getByRole("button", { name: "About Between the Lines", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "More than the score.", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).not.toContainText("Second Look");
});

test("the new identity fits a 320px viewport with reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  const logo = page.locator('img[alt="Between the Lines"]:visible');
  const box = await logo.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(128);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  for (const [selector, minimum] of [
    [".selected-observation h2", 20],
    [".detail-tabs button", 12],
    [".catchup-button", 12],
  ] as const) {
    const size = await page
      .locator(selector)
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(minimum);
  }
});
