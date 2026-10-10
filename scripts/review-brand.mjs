// Review the running application. BRAND_REVIEW_URL can point to a production server.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
const baseURL = process.env.BRAND_REVIEW_URL ?? "http://127.0.0.1:3000";
const output = "docs/brand/review";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const [name, width, height] of [
    ["desktop-1920", 1920, 1080],
    ["desktop-1440", 1440, 1100],
    ["tablet", 834, 1112],
    ["iphone", 390, 844],
    ["android", 360, 800],
    ["mobile-320", 320, 740],
  ]) {
    for (const colorScheme of ["dark", "light"]) {
      const context = await browser.newContext({
        viewport: { width, height },
        colorScheme,
        reducedMotion: "reduce",
        isMobile: width < 600,
        hasTouch: width < 1000,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(baseURL);
      await page.locator('.app-shell[aria-busy="false"]').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `${output}/${name}-${colorScheme}.png`,
        fullPage: true,
      });
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      const logos = await page
        .locator('img[alt="Between the Lines"]:visible')
        .count();
      results.push({
        name,
        width,
        height,
        colorScheme,
        overflow,
        visibleLogos: logos,
        errors,
        violations: audit.violations,
      });
      if (colorScheme === "dark" && ["desktop-1440", "iphone"].includes(name)) {
        await page
          .getByRole("navigation")
          .getByRole("button", { name: "Player focus", exact: true })
          .click();
        await page.getByLabel("Focus player").selectOption("riverside-9");
        await page.screenshot({
          path: `docs/screenshots/visual-assets-${name === "iphone" ? "mobile-" : ""}player.png`,
          fullPage: true,
        });
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  `${output}/results.json`,
  JSON.stringify(results, null, 2) + "\n",
);
console.log(
  results.map(({ violations, ...r }) => ({
    ...r,
    violations: violations.length,
  })),
);
if (
  results.some(
    (r) =>
      r.overflow ||
      r.visibleLogos !== 1 ||
      r.errors.length ||
      r.violations.length,
  )
)
  process.exitCode = 1;

// Keep README/demo references on the current identity; the explicit before pair is historical.
const { default: sharp } = await import("sharp");
const { copyFile } = await import("node:fs/promises");
const inputs = await Promise.all(
  ["before-desktop.png", "desktop-1440-dark.png"].map((file) =>
    sharp(`${output}/${file}`).resize({ width: 700 }).toBuffer(),
  ),
);
const heights = await Promise.all(
  inputs.map(async (input) => (await sharp(input).metadata()).height),
);
const heading = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1460" height="64"><rect width="1460" height="64" fill="#0b0f14"/><g font-family="Arial,sans-serif" font-size="18" fill="#cbd5e1"><text x="20" y="40">BEFORE / SECOND LOOK</text><text x="740" y="40">AFTER / BETWEEN THE LINES</text></g></svg>',
);
await sharp({
  create: {
    width: 1460,
    height: Math.max(...heights) + 84,
    channels: 3,
    background: "#0b0f14",
  },
})
  .composite([
    { input: heading, left: 0, top: 0 },
    ...inputs.map((input, i) => ({ input, left: 20 + i * 720, top: 64 })),
  ])
  .png()
  .toFile(`${output}/before-after.png`);
for (const [from, to] of [
  ["desktop-1440-dark", "desktop-match"],
  ["iphone-dark", "iphone-match"],
  ["android-dark", "android-match"],
  ["desktop-1440-dark", "visual-assets-desktop"],
  ["iphone-dark", "visual-assets-mobile"],
  ["mobile-320-dark", "visual-assets-small-mobile"],
])
  await copyFile(`${output}/${from}.png`, `docs/screenshots/${to}.png`);
