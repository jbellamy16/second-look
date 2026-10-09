import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

const names = [
  "AI_ENABLED",
  "AI_PROVIDER",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "FOUNDRY_ENABLED",
  "FOUNDRY_ENDPOINT",
  "FOUNDRY_API_KEY",
  "FOUNDRY_DEPLOYMENT",
  "AI_USAGE_STORE",
  "AI_REDIS_URL",
  "AI_MINUTE_LIMIT",
  "AI_HOURLY_LIMIT",
  "AI_DAILY_LIMIT",
  "AI_TOTAL_LIMIT",
  "FOUNDRY_HOURLY_LIMIT",
];
/**
 * Explicit local evaluation config, including when Vitest sets NODE_ENV=test.
 * Return only AI settings; shell values take precedence, including explicit disables.
 * Never load authorization or runtime flags such as NODE_OPTIONS from this file.
 * @param {string} directory
 * @param {Record<string, string | undefined>} environment
 */
export function localAiConfig(directory, environment = process.env) {
  const path = join(directory, ".env.local");
  const local = existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {};
  return Object.fromEntries(
    names.flatMap((name) => {
      const value = environment[name] ?? local[name];
      return value === undefined ? [] : [[name, value]];
    }),
  );
}
/** Safe to print. Does not make any network request or validate credentials. */
export function configurationSummary(config) {
  return {
    provider: ["openai", "foundry", "offline"].includes(config.AI_PROVIDER)
      ? config.AI_PROVIDER
      : "offline",
    inferenceEnabled: config.AI_ENABLED === "true",
    openaiKeyPresent: !!config.OPENAI_API_KEY?.trim(),
    openaiModel: config.OPENAI_MODEL || "gpt-5.4-mini",
    sharedStoreConfigured: !!config.AI_REDIS_URL,
    localMemoryStore: config.AI_USAGE_STORE === "memory",
    credentialsValidated: false,
    networkRequests: 0,
  };
}
