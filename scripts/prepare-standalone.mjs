import { cp } from "node:fs/promises";

// Ship the same assets with the production server that browser tests inspect.
await cp("public", ".next/standalone/public", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
