import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  configurationSummary,
  localAiConfig,
} from "../scripts/ai-local-config.mjs";
const dirs: string[] = [];
function fixture(contents: string) {
  const directory = mkdtempSync(join(tmpdir(), "second-look-config-"));
  dirs.push(directory);
  writeFileSync(join(directory, ".env.local"), contents, { mode: 0o600 });
  return directory;
}
afterEach(() =>
  dirs
    .splice(0)
    .forEach((directory) =>
      rmSync(directory, { recursive: true, force: true }),
    ),
);
it("loads local AI settings in test mode without enabling inference", () => {
  const directory = fixture(
    'OPENAI_API_KEY="test-only-local-key"\nAI_PROVIDER=openai\nAI_ENABLED=false\n',
  );
  const config = localAiConfig(directory, { NODE_ENV: "test" });
  expect(config.OPENAI_API_KEY).toBe("test-only-local-key");
  expect(config.AI_ENABLED).toBe("false");
  expect(config.NODE_ENV).toBeUndefined();
});
it("respects shell overrides including disablement and credential overrides", () => {
  const directory = fixture(
    "OPENAI_API_KEY=test-only-local\nAI_ENABLED=true\n",
  );
  const config = localAiConfig(directory, {
    AI_ENABLED: "false",
    OPENAI_API_KEY: "test-only-shell",
  });
  expect(config.AI_ENABLED).toBe("false");
  expect(config.OPENAI_API_KEY).toBe("test-only-shell");
});
it("does not load spending authorization or Node runtime flags from a file", () => {
  const directory = fixture(
    "SECOND_LOOK_AUTHORIZE_LIVE=yes\nNODE_OPTIONS=untrusted\nAI_PROVIDER=openai\n",
  );
  const config = localAiConfig(directory, {});
  expect(config).toEqual({ AI_PROVIDER: "openai" });
});
it("preflight never reports secrets or claims credentials have been validated", () => {
  const directory = fixture(
    "OPENAI_API_KEY=test-only-secret\nAI_REDIS_URL=rediss://secret-user:secret-password@example.test\nFOUNDRY_API_KEY=test-only-foundry\nAI_ENABLED=false\n",
  );
  const summary = configurationSummary(localAiConfig(directory, {}));
  expect(summary).toMatchObject({
    openaiKeyPresent: true,
    sharedStoreConfigured: true,
    credentialsValidated: false,
    inferenceEnabled: false,
    networkRequests: 0,
  });
  expect(JSON.stringify(summary)).not.toContain("secret");
  expect(JSON.stringify(summary)).not.toContain("test-only-foundry");
});
it("supports shell-only configuration with no local file", () => {
  const directory = fixture("");
  rmSync(join(directory, ".env.local"));
  expect(localAiConfig(directory, { AI_PROVIDER: "openai" })).toEqual({
    AI_PROVIDER: "openai",
  });
});
