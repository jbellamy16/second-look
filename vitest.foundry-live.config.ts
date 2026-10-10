import { defineConfig } from "vitest/config";
import config from "./vitest.config";
export default defineConfig({
  ...config,
  test: {
    ...config.test,
    include: ["eval/foundry.live.eval.ts"],
    testTimeout: 900000,
    fileParallelism: false,
  },
});
