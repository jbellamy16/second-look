import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

export default defineConfig({
  ...config,
  use: { baseURL: "http://127.0.0.1:3100" },
  webServer: {
    command: "npm run cloudflare:preview",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
