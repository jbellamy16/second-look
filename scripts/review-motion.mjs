// Run against a local production server: MOTION_REVIEW_URL=http://127.0.0.1:3101 node scripts/review-motion.mjs
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const baseURL = process.env.MOTION_REVIEW_URL ?? "http://127.0.0.1:3101";
const output = "docs/motion";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
for (const [name, width, height, cpuRate] of [
  ["desktop", 1440, 1000, 1],
  ["mobile", 390, 844, 4],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: "no-preference",
    isMobile: name === "mobile",
    hasTouch: name === "mobile",
    recordVideo: { dir: "artifacts/motion-review", size: { width, height } },
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
  await page.goto(baseURL);
  await page.getByRole("button", { name: "Show me the sequence" }).click();
  await page.getByRole("button", { name: "Pause replay", exact: true }).click();
  await page.getByLabel("Replay speed").selectOption("4");
  await page
    .locator(".pitch-panel")
    .evaluate((el) =>
      el.scrollIntoView({ block: "start", behavior: "instant" }),
    );
  await page.evaluate(() => {
    window.motionReview = { intervals: [], longTasks: [], shifts: [] };
    let previous = performance.now();
    const frame = (now) => {
      window.motionReview.intervals.push(now - previous);
      previous = now;
      window.motionReview.raf = requestAnimationFrame(frame);
    };
    window.motionReview.raf = requestAnimationFrame(frame);
    const longTasks = new PerformanceObserver((list) =>
      window.motionReview.longTasks.push(
        ...list.getEntries().map((e) => e.duration),
      ),
    );
    longTasks.observe({ type: "longtask", buffered: false });
    const shifts = new PerformanceObserver((list) =>
      window.motionReview.shifts.push(
        ...list
          .getEntries()
          .filter((e) => !e.hadRecentInput)
          .map((e) => e.value),
      ),
    );
    shifts.observe({ type: "layout-shift", buffered: false });
    window.motionReview.observers = [longTasks, shifts];
  });
  await page.getByRole("button", { name: "Play replay", exact: true }).click();
  await page.waitForTimeout(5200);
  await page.getByRole("button", { name: "Pause replay", exact: true }).click();
  const metrics = await page.evaluate(() => {
    const review = window.motionReview;
    cancelAnimationFrame(review.raf);
    review.observers.forEach((o) => o.disconnect());
    const intervals = review.intervals.slice(2).sort((a, b) => a - b);
    return {
      frames: intervals.length,
      medianFrameMs: intervals[Math.floor(intervals.length * 0.5)],
      p95FrameMs: intervals[Math.floor(intervals.length * 0.95)],
      framesOver34ms: intervals.filter((n) => n > 34).length,
      longTaskCount: review.longTasks.length,
      maxLongTaskMs: Math.max(0, ...review.longTasks),
      layoutShift: review.shifts.reduce((a, b) => a + b, 0),
    };
  });
  results.push({ name, width, height, cpuRate, ...metrics });
  await page.screenshot({
    path: `${output}/after-${name}.png`,
    fullPage: name === "desktop",
  });
  const range = page.getByLabel("Replay timeline");
  await range.fill(await range.getAttribute("min"));
  await page.waitForTimeout(350);
  await range.fill(await range.getAttribute("max"));
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Analyst mode", exact: true }).click();
  await page.waitForTimeout(450);
  await page.getByRole("button", { name: "Catch me up", exact: true }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  for (const name of ["Match stats", "Player focus", "Match centre"]) {
    await page
      .getByRole("navigation")
      .getByRole("button", { name, exact: true })
      .click();
    await page.waitForTimeout(350);
  }
  await context.close();
  await page.video().saveAs(`${output}/after-${name}.webm`);
}
await writeFile(
  `${output}/performance.json`,
  JSON.stringify(
    {
      method:
        "Headless Chromium, production build; 5.2s replay sample, desktop normal CPU and mobile viewport at 4× CPU slowdown. Local diagnostic, not a physical-device FPS guarantee.",
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(results, null, 2));
await browser.close();
