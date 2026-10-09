import { configurationSummary, localAiConfig } from "./ai-local-config.mjs";
console.log(
  JSON.stringify(configurationSummary(localAiConfig(process.cwd())), null, 2),
);
