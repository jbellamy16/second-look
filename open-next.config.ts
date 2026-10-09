import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No ISR or image transformation resources are needed by this synthetic demo.
// AI caching remains in the shared usage store, independent of page caching.
export default defineCloudflareConfig({});
