import { defineConfig } from "vitest/config";
import config from "./vitest.config";
export default defineConfig({
  ...config,
  test: {
    ...config.test,
    include: ["eval/director.live.eval.ts"],
    testTimeout: 65000,
    fileParallelism: false,
  },
});
