import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const url = process.env.REVIEW_URL ?? "http://127.0.0.1:3216";
const localResearch = process.argv.includes("--local-research");
const dir = localResearch ? ".cache/statsbomb/review" : "docs/foundation";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  recordVideo: { dir, size: { width: 1440, height: 1100 } },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url);
await expect(page.getByTestId("clock")).toContainText("63:24");
if (!localResearch)
  await page.screenshot({ path: `${dir}/synthetic-desktop.png` });
await page.getByRole("button", { name: "Real Match", exact: true }).click();
await expect(
  page.getByRole("heading", { name: "Historical replay", exact: true }),
).toBeVisible();
if (localResearch) {
  await page.getByLabel("Historical match").selectOption("statsbomb-8658");
  await expect(page.locator(".historical-scoreboard")).toHaveAttribute(
    "data-match-id",
    "statsbomb-8658",
  );
  await expect(page.getByTestId("score")).toHaveText("0:0");
}
await page.getByRole("button", { name: "Play match", exact: true }).click();
await expect(page.getByTestId("clock")).not.toContainText("00:00");
await page.getByLabel("Playback speed").selectOption("32");
await page.getByRole("button", { name: "Pause match", exact: true }).click();
await page.getByRole("slider", { name: "Match timeline" }).fill("1800");
await page.getByRole("button", { name: "Analyst mode", exact: true }).click();
await page.screenshot({
  path: `${dir}/historical-desktop.png`,
  fullPage: true,
});
await page.locator(".historical-feed .event-feed-list button").first().click();
await expect(
  page.getByRole("heading", { name: "Recorded passage" }),
).toBeVisible();
await page.getByRole("button", { name: "Catch me up" }).click();
await expect(page.getByRole("dialog")).toBeVisible();
await page.screenshot({ path: `${dir}/historical-evidence.png` });
await page.getByRole("button", { name: "Close dialog" }).click();
await page.getByRole("slider", { name: "Match timeline" }).focus();
await page.keyboard.press("End");
await expect(page.getByTestId("score")).toHaveText(
  localResearch ? "4:2" : "4:3",
);
await page.getByRole("slider", { name: "Match timeline" }).fill("0");
await expect(page.getByTestId("score")).toHaveText("0:0");
expect(errors).toEqual([]);
const video = page.video();
await context.close();
await video.saveAs(`${dir}/historical-replay.webm`);
await video.delete();
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const mp = await mobile.newPage();
await mp.goto(url);
await mp.getByRole("button", { name: "Real Match", exact: true }).click();
await expect(
  mp.getByRole("heading", { name: "Historical replay", exact: true }),
).toBeVisible();
await mp.getByRole("slider", { name: "Match timeline" }).fill("1800");
expect(
  await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
).toBe(true);
await mp.screenshot({ path: `${dir}/historical-mobile.png`, fullPage: true });
await mobile.close();
await browser.close();
console.log(
  `Verified playback, event selection, evidence, score and rewind. Review artifacts: ${dir}`,
);
