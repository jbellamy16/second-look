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

it("publishes the complete BTL identity and canonical metadata", async () => {
  const { brandMetadata, siteUrl } = await import("../src/lib/brand");
  expect(brandMetadata.applicationName).toBe("Between the Lines");
  expect(brandMetadata.title).toEqual({
    default: "Between the Lines | More than the score.",
    template: "%s | Between the Lines",
  });
  expect(brandMetadata.metadataBase?.toString()).toBe(
    new URL(siteUrl).toString(),
  );
  expect(brandMetadata.alternates?.canonical).toBe("/");
  expect(brandMetadata.manifest).toBe("/manifest.webmanifest");
  expect(manifest().name).toBe("Between the Lines");
  expect(manifest().short_name).toBe("BTL");
  expect(manifest().theme_color).toBe("#0b0f14");
});

it("ships reproducible, correctly sized exports with portable vector lettering", async () => {
  const { readFile } = await import("node:fs/promises");
  const inventory = JSON.parse(
    await readFile("docs/brand/asset-inventory.json", "utf8"),
  );
  for (const asset of inventory) {
    await access(asset.file);
    if (asset.file.endsWith(".png")) {
      const image = await sharp(asset.file).metadata();
      expect([image.width, image.height]).toEqual([asset.width, asset.height]);
    }
    if (asset.file.endsWith(".svg")) {
      const svg = await readFile(asset.file, "utf8");
      expect(svg).toContain("<title>");
      expect(svg).not.toMatch(/<text\b|<image\b|Second Look/);
    }
  }
});

it("keeps primary action labels above WCAG AA contrast in both appearances", () => {
  const luminance = (hex: string) => {
    const rgb = hex.match(/[a-f\d]{2}/gi)!.map((part) => {
      const c = parseInt(part, 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const [background, foreground] of [
    ["22c55e", "0b0f14"],
    ["15803d", "ffffff"],
    ["4ade80", "0b0f14"],
    ["166534", "ffffff"],
  ]) {
    const [lighter, darker] = [
      luminance(background),
      luminance(foreground),
    ].sort((a, b) => b - a);
    expect((lighter + 0.05) / (darker + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});
