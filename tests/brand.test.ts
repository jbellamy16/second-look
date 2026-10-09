import { expect, it } from "vitest";
import sharp from "sharp";
import { access } from "node:fs/promises";
import manifest from "../src/app/manifest";

it("all raster exports have their intended dimensions", async () => {
  for (const [file, width, height] of [
    ["favicon-32x32", 32, 32],
    ["apple-touch-icon", 180, 180],
    ["icon-192", 192, 192],
    ["icon-512", 512, 512],
    ["icon-maskable-512", 512, 512],
    ["opengraph-image", 1200, 630],
    ["twitter-image", 1200, 675],
  ] as const) {
    const image = await sharp(`public/${file}.png`).metadata();
    expect([image.width, image.height, image.format]).toEqual([
      width,
      height,
      "png",
    ]);
  }
});
it("every manifest icon references an existing export", async () => {
  for (const icon of manifest().icons ?? []) await access(`public${icon.src}`);
});
