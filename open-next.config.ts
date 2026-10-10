import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No ISR or image transformation resources are needed by the locally bundled match replays.
// AI caching remains in the shared usage store, independent of page caching.
export default defineCloudflareConfig({});
