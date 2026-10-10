import { cp, mkdtemp, rm, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

// OpenNext embeds .env files. Build an allowlisted copy without local secrets.
// Never move or change the developer's environment files.
const root = process.cwd();
const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    "https://second-look.sybgm6dkhk.workers.dev",
);
if (
  siteUrl.protocol !== "https:" ||
  siteUrl.origin !== siteUrl.href.replace(/\/$/, "")
)
  throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTPS origin");
const staging = await mkdtemp(join(tmpdir(), "second-look-cloudflare-"));
const files = [
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "next-env.d.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "open-next.config.ts",
  "wrangler.jsonc",
  "src",
  "data/historical",
  "public",
  "scripts/prepare-standalone.mjs",
];
const env = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  TMPDIR: process.env.TMPDIR,
  CI: "1",
  NEXT_TELEMETRY_DISABLED: "1",
  AI_ENABLED: "false",
  // Only public metadata and the non-secret historical feature flag cross the build boundary.
  HISTORICAL_MATCHES_ENABLED:
    process.env.HISTORICAL_MATCHES_ENABLED === "false" ? "false" : "true",
  NEXT_PUBLIC_SITE_URL: siteUrl.origin,
};
try {
  await mkdir(join(staging, "scripts"));
  for (const file of files)
    await cp(join(root, file), join(staging, file), { recursive: true });
  execFileSync("npm", ["ci", "--no-audit", "--no-fund"], {
    cwd: staging,
    env,
    stdio: "inherit",
  });
  // Next 16.4 split preview props into a new manifest. OpenNext 1.20.10's
  // manifest glob omits it. Include the real build file, never fabricated props.
  // Apply only inside this disposable install; fail loudly if upstream changes.
  const patchPath = join(
    staging,
    "node_modules/@opennextjs/cloudflare/dist/cli/build/patches/plugins/load-manifest.js",
  );
  const patchSource = await readFile(patchPath, "utf8");
  const oldGlob = "{*-manifest,required-server-files,prefetch-hints}.json";
  if (!patchSource.includes(oldGlob))
    throw new Error(
      "Recheck OpenNext preview-props compatibility before building",
    );
  await writeFile(
    patchPath,
    patchSource.replace(
      oldGlob,
      "{*-manifest,required-server-files,prefetch-hints,preview-props}.json",
    ),
  );
  execFileSync(
    join(staging, "node_modules/.bin/opennextjs-cloudflare"),
    ["build"],
    { cwd: staging, env, stdio: "inherit" },
  );
  const embeddedEnv = await readFile(
    join(staging, ".open-next/cloudflare/next-env.mjs"),
    "utf8",
  );
  if (
    embeddedEnv.trim() !==
    ["production", "development", "test"]
      .map((mode) => `export const ${mode} = {};`)
      .join("\n")
  )
    throw new Error("Refusing to package embedded environment values");
  await rm(join(root, ".open-next"), { recursive: true, force: true });
  await cp(join(staging, ".open-next"), join(root, ".open-next"), {
    recursive: true,
  });
} finally {
  await rm(staging, { recursive: true, force: true });
}
