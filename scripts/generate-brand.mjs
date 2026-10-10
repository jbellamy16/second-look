// Original vector artwork. Rebuild every export with: npm run brand:build
import { readFile, writeFile, mkdir, copyFile, stat } from "node:fs/promises";
import * as fontkit from "fontkit";
import sharp from "sharp";
const display = fontkit.openSync(
  "node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2",
);
const ui = fontkit.openSync(
  "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
);
const C = {
  night: "#0B0F14",
  green: "#22C55E",
  slate: "#334155",
  mist: "#CBD5E1",
  white: "#F8FAFC",
  muted: "#94A3B8",
};
const inventory = [];
await mkdir("public/brand", { recursive: true });
await mkdir("docs/brand", { recursive: true });
function text(value, x, y, size, color = C.white, spacing = 0, font = display) {
  const run = font.layout(value);
  let cursor = 0;
  const scale = size / font.unitsPerEm;
  return `<g fill="${color}" aria-label="${value}">${run.glyphs
    .map((glyph, i) => {
      const p = run.positions[i];
      const path = `<path transform="translate(${(x + cursor + p.xOffset * scale).toFixed(3)} ${(y - p.yOffset * scale).toFixed(3)}) scale(${scale} ${-scale})" d="${glyph.path.toSVG()}"/>`;
      cursor += p.xAdvance * scale + spacing;
      return path;
    })
    .join("")}</g>`;
}
function mark(ink = C.white, accent = C.green, small = false) {
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="${small ? 6 : 3.5}"><path stroke="${ink}" d="M16 16V80M80 16V80M48 10V30M48 66V86"/><circle stroke="${ink}" cx="48" cy="48" r="18"/><path stroke="${accent}" d="M24 72C49 72 47 24 72 24M64 20L72 24L68 32"/>${small ? "" : `<circle cx="24" cy="72" r="3.5" fill="${accent}" stroke="none"/>`}</g>`;
}
function svg(w, h, body, title = "Between the Lines") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img"><title>${title}</title>${body}</svg>`;
}
function logo(kind, ink, accent) {
  if (kind === "mark") return [96, 96, mark(ink, accent)];
  if (kind === "compact")
    return [224, 96, mark(ink, accent) + text("BTL", 112, 73, 72, ink, 3)];
  if (kind === "stacked")
    return [
      320,
      330,
      `<g transform="translate(94 10) scale(1.375)">${mark(ink, accent)}</g>` +
        text("BETWEEN", 28, 219, 68, ink, 5) +
        text("THE LINES", 28, 280, 68, ink, 2.2),
    ];
  return [
    376,
    112,
    `<g transform="translate(0 8)">${mark(ink, accent)}</g>` +
      text("BETWEEN", 116, 50, 58, ink, 5.5) +
      text("THE LINES", 116, 102, 58, ink, 3),
  ];
}
async function save(path, content, w, h, role) {
  await writeFile(path, content);
  inventory.push({
    file: path,
    width: w,
    height: h,
    role,
    bytes: (await stat(path)).size,
  });
}
async function raster(path, source, w, h, role) {
  await save(
    path,
    await sharp(Buffer.from(source))
      .resize(w, h)
      .png({ compressionLevel: 9 })
      .toBuffer(),
    w,
    h,
    role,
  );
}
for (const [variant, ink, accent] of [
  ["dark", C.white, C.green],
  ["light", C.night, "#15803D"],
  ["white", "#FFFFFF", "#FFFFFF"],
  ["black", "#000000", "#000000"],
]) {
  for (const kind of ["horizontal", "stacked", "mark", "compact"]) {
    const [w, h, body] = logo(kind, ink, accent);
    const art = svg(w, h, body);
    const base = `public/brand/btl-${kind}-${variant}`;
    await save(
      `${base}.svg`,
      art,
      w,
      h,
      `${kind}; ${variant} ink/surface variant; outlined type`,
    );
    await raster(
      `${base}.png`,
      art,
      w * 4,
      h * 4,
      `${kind}; transparent high-resolution PNG`,
    );
  }
}
const icon = svg(
  512,
  512,
  `<rect width="512" height="512" rx="108" fill="${C.night}"/><g transform="translate(16 16) scale(5)">${mark(C.white, C.green, true)}</g>`,
);
const maskable = svg(
  512,
  512,
  `<path fill="${C.night}" d="M0 0H512V512H0Z"/><g transform="translate(112 112) scale(3)">${mark(C.white, C.green, true)}</g>`,
);
await save("public/icon.svg", icon, 512, 512, "App icon");
await save(
  "public/favicon.svg",
  icon,
  512,
  512,
  "Simplified small-size symbol",
);
await save(
  "public/safari-pinned-tab.svg",
  svg(96, 96, mark("#000", "#000", true)),
  96,
  96,
  "Monochrome browser mask",
);
for (const size of [16, 32, 48])
  await raster(
    `public/favicon-${size}x${size}.png`,
    icon,
    size,
    size,
    "Favicon",
  );
for (const size of [64, 192, 256, 512, 1024])
  await raster(`public/icon-${size}.png`, icon, size, size, "Application icon");
await raster("public/apple-touch-icon.png", icon, 180, 180, "Apple touch icon");
await raster(
  "public/icon-maskable-512.png",
  maskable,
  512,
  512,
  "Maskable; all foreground inside 80% safe circle",
);
const pngs = await Promise.all(
  [16, 32, 48].map((n) => readFile(`public/favicon-${n}x${n}.png`)),
);
const ico = Buffer.alloc(6 + 16 * pngs.length);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(3, 4);
let offset = ico.length;
pngs.forEach((p, i) => {
  const at = 6 + i * 16;
  ico[at] = [16, 32, 48][i];
  ico[at + 1] = ico[at];
  ico.writeUInt16LE(1, at + 4);
  ico.writeUInt16LE(32, at + 6);
  ico.writeUInt32LE(p.length, at + 8);
  ico.writeUInt32LE(offset, at + 12);
  offset += p.length;
});
await save(
  "public/favicon.ico",
  Buffer.concat([ico, ...pngs]),
  48,
  48,
  "Multi-resolution ICO: 16, 32, 48",
);
function pitch(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><g stroke="${C.slate}" stroke-width="2" fill="none"><rect width="440" height="600" rx="2"/><path d="M0 300H440M130 0V90H310V0M170 0V35H270V0M130 600V510H310V600M170 600V565H270V600"/><circle cx="220" cy="300" r="66"/></g><path d="M74 480L164 404L135 270L270 193L338 102" stroke="${C.green}" stroke-width="3" fill="none"/><path d="M325 109L338 102L336 117" fill="none" stroke="${C.green}" stroke-width="3"/>${[
    [74, 480],
    [164, 404],
    [135, 270],
    [270, 193],
  ]
    .map(
      ([x, y], i) =>
        `<circle cx="${x}" cy="${y}" r="${i === 2 ? 12 : 7}" fill="${i === 2 ? C.green : C.night}" stroke="${C.green}" stroke-width="3"/>`,
    )
    .join(
      "",
    )}<circle cx="135" cy="270" r="27" stroke="${C.green}" opacity=".25" fill="none"/>${[
    [320, 390],
    [290, 460],
    [92, 180],
    [345, 245],
    [185, 135],
  ]
    .map(
      ([x, y]) =>
        `<path d="M${x - 5} ${y - 5}l10 10m0-10l-10 10" stroke="${C.muted}" stroke-width="2"/>`,
    )
    .join("")}</g>`;
}
function social(w, h) {
  const tall = h > w;
  const s = w / 1200;
  const W = 1200,
    H = h / s;
  const body =
    `<rect width="${W}" height="${H}" fill="${C.night}"/><path d="M64 0V${H}M1136 0V${H}" stroke="${C.slate}" opacity=".45"/><g transform="translate(96 64) scale(.74)">${logo("horizontal", C.white, C.green)[2]}</g>` +
    (tall ? pitch(280, 900, 1.5) : pitch(730, -45, 1.03)) +
    text("MORE THAN", 96, tall ? 420 : 285, tall ? 124 : 104, C.white, 2) +
    text("THE SCORE.", 96, tall ? 558 : 401, tall ? 124 : 104, C.green, 2) +
    `<path d="M96 ${tall ? 616 : 445}H160" stroke="${C.green}" stroke-width="4"/>` +
    text("Football insights", 96, tall ? 696 : 496, 26, C.mist, 0, ui) +
    text("that go deeper.", 96, tall ? 737 : 535, 26, C.mist, 0, ui) +
    text("MATCHES / PATTERNS / STORIES", 96, H - 46, 14, C.muted, 2, ui);
  return svg(
    w,
    h,
    `<g transform="scale(${s})">${body}</g>`,
    "Between the Lines. More than the score. Football insights that go deeper.",
  );
}
for (const [name, w, h] of [
  ["opengraph-image", 1200, 630],
  ["twitter-image", 1200, 675],
  ["social-square", 1080, 1080],
  ["social-story", 1080, 1920],
  ["video-title", 1920, 1080],
]) {
  // Square uses a deliberately stacked composition, with pitch as a lower-right detail.
  let art = social(w, h);
  if (name === "social-square")
    art = svg(
      w,
      h,
      `<rect width="1080" height="1080" fill="${C.night}"/><g transform="translate(80 65) scale(.85)">${logo("horizontal", C.white, C.green)[2]}</g>${pitch(670, 610, 0.82)}${text("MORE THAN", 80, 405, 142, C.white, 2)}${text("THE SCORE.", 80, 555, 142, C.green, 2)}<path d="M80 618H152" stroke="${C.green}" stroke-width="4"/>${text("Football insights that go deeper.", 80, 684, 28, C.mist, 0, ui)}${text("SEE THE GAME DIFFERENTLY", 80, 1000, 16, C.muted, 2, ui)}`,
    );
  const source = `public/brand/${name}.svg`;
  await save(
    source,
    art,
    w,
    h,
    "Original broadcast composition; outlined text",
  );
  await raster(
    name.includes("image") ? `public/${name}.png` : `public/brand/${name}.png`,
    art,
    w,
    h,
    "Social / presentation export",
  );
}
const swatches = Object.entries(C)
  .filter(([name]) => name !== "muted")
  .map(
    ([name, color], i) =>
      `<rect x="${64 + i * 230}" y="658" width="204" height="80" rx="4" fill="${color}" stroke="#64748B"/>${text(name.toUpperCase(), 64 + i * 230, 770, 22, C.white, 2)}${text(color, 64 + i * 230, 800, 16, C.mist, 0, ui)}`,
  )
  .join("");
const board = svg(
  1280,
  1080,
  `<rect width="1280" height="1080" fill="${C.night}"/>${text("BETWEEN THE LINES / IDENTITY SYSTEM", 64, 54, 20, C.muted, 3)}<g transform="translate(64 142) scale(1.5)">${logo("horizontal", C.white, C.green)[2]}</g><rect x="830" y="90" width="386" height="370" rx="8" fill="${C.white}"/><g transform="translate(863 110)">${logo("stacked", C.night, "#15803D")[2]}</g>${text("MORE THAN THE SCORE.", 64, 445, 66, C.white, 1)}${text("Football insights that go deeper.", 64, 494, 24, C.mist, 0, ui)}${text("01 / HALFWAY LINE + ONE TACTICAL ROUTE", 64, 606, 20, C.muted, 2)}${swatches}${text("BARLOW CONDENSED / DISPLAY", 64, 901, 38, C.white, 1)}${text("Inter / Clear, precise, readable.", 64, 950, 28, C.mist, 0, ui)}<g transform="translate(950 845) scale(1.75)">${mark()}</g>${text("ORIGINAL VECTOR ARTWORK • 2026", 64, 1030, 14, C.muted, 2, ui)}`,
);
await save(
  "docs/brand/identity-preview.svg",
  board,
  1280,
  1080,
  "Identity overview",
);
await raster(
  "docs/brand/identity-preview.png",
  board,
  1280,
  1080,
  "Identity overview preview",
);
await copyFile(
  "node_modules/@fontsource/barlow-condensed/LICENSE",
  "docs/brand/Barlow-OFL.txt",
);
await copyFile(
  "node_modules/@fontsource-variable/inter/LICENSE",
  "docs/brand/Inter-OFL.txt",
);
await writeFile(
  "docs/brand/asset-inventory.json",
  JSON.stringify(inventory, null, 2) + "\n",
);
console.log(`Generated ${inventory.length} original assets.`);

// Keep the documentation token reference synchronized with shipped CSS.
const css = await readFile("src/app/brand-tokens.css", "utf8");
const declarations = (blocks) =>
  Object.fromEntries(
    blocks.flatMap((block) =>
      [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]),
    ),
  );
const dark = declarations(
  [...css.matchAll(/:root\s*\{([^}]+)\}/g)].map((m) => m[1]),
);
const light = {
  ...dark,
  ...declarations(
    [...css.matchAll(/:root\[data-theme="light"\]\s*\{([^}]+)\}/g)].map(
      (m) => m[1],
    ),
  ),
};
await writeFile(
  "docs/brand/brand-tokens.json",
  JSON.stringify(
    {
      palette: C,
      themes: { dark, light },
      typography: {
        ui: "Inter",
        display: "Barlow Condensed",
        displayWeight: 700,
        numerals: "tabular-nums",
      },
      spacingUnit: 4,
    },
    null,
    2,
  ) + "\n",
);
await writeFile(
  "docs/brand/ASSETS.md",
  "# Between the Lines — asset inventory\n\nGenerated with `npm run brand:build`. SVG type is outlined. Transparent PNG logo exports are 4× the SVG canvas dimensions. Dark variants use light ink; light variants use dark ink. All social artwork is original vector composition.\n\n| Asset | Dimensions | Bytes | Purpose |\n| --- | --- | ---: | --- |\n" +
    inventory
      .map(
        (a) =>
          `| [${a.file}](${a.file.startsWith("docs/brand/") ? a.file.slice(11) : "../../" + a.file}) | ${a.width} × ${a.height} | ${a.bytes} | ${a.role} |`,
      )
      .join("\n") +
    "\n\nSupporting files: [Inter license](Inter-OFL.txt), [Barlow license](Barlow-OFL.txt), [semantic tokens](brand-tokens.json), [guidelines](README.md), [review screenshots](REVIEW.md).\n",
);
