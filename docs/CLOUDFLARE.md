# Cloudflare deployment

Second Look runs on Cloudflare Workers through OpenNext, retaining the existing Next.js application and Azure standalone deployment. OpenAI is the selected provider. Paid inference is disabled, all narration quotas are zero, and no provider key or Redis secret is uploaded with the application.

## Build and verify

```sh
npm ci
npm run typecheck
npm test
npm run cloudflare:build
npx wrangler deploy --dry-run
npx playwright test --config playwright.cloudflare.config.ts
```

The build script creates an isolated temporary source copy, installs the lockfile, builds, verifies that the adapter's embedded environment map is empty, copies `.open-next` back and removes the temporary directory. It never copies or changes `.env.local`. This matters because OpenNext normally embeds `.env` files in its server bundle. Credentials belong in runtime Worker secrets, never build inputs.

The public metadata origin defaults to `https://second-look.sybgm6dkhk.workers.dev`. Set `NEXT_PUBLIC_SITE_URL` to another HTTPS origin before rebuilding if the host changes.

OpenNext 1.20.10 omits Next.js 16.4's `preview-props.json` from its manifest matcher. The build script makes one guarded change inside the disposable adapter installation to include the actual generated manifest. It does not change Next.js or invent preview keys. Remove this workaround once the adapter supports that manifest upstream. Both Node production and Workers runtime browser suites run in CI.

## Publish after hosting approval

The current Cloudflare account is already on Workers Standard. Publishing can contribute to its shared billable usage. Approval to publish must cover that hosting usage; a request to enable OpenAI spending is separate. A 100 ms CPU limit bounds work per invocation; it is not a monthly spending cap. No subscription upgrade, database, R2 bucket, Durable Object, image service or domain purchase is needed for the disabled-inference release.

After tests and CI pass, authenticate the intended account and run:

```sh
npx wrangler whoami
npx wrangler deploy
```

This uploads the already verified bundle. `npm run cloudflare:deploy` rebuilds before publishing. The Worker name is `second-look`; the self-reference binding must match it. Keep deployment manual. Azure's workflow remains available.

Verify HTTPS, the main page, `/api/insights`, `/api/recap` with a valid timestamp, branding images, manifest and icons. With this configuration the status endpoint must report offline, and recap POSTs must return deterministic evidence. Recheck seeking, both modes and mobile layout. Do not infer live OpenAI verification from successful hosting.

## Enable OpenAI later

Before public inference, configure an existing persistent TLS Redis store with no eviction, verify shared quotas and failure behavior in the actual Worker runtime, record the human semantic review, and approve a finite narration allowance. Use `wrangler secret put OPENAI_API_KEY` and `wrangler secret put AI_REDIS_URL` interactively; never put values into this repository or commands saved in chat. Then explicitly set nonzero quotas and `AI_ENABLED=true` and redeploy. Zero quotas are a second guard while the integration is disabled.

The current global Redis client was tested in Node; its Cloudflare TCP/TLS behavior still needs verification with an approved store before enabling inference. If a Workers-native store is chosen later, it must preserve atomic reservations, deduplication, the persistent total allowance and fail-closed behavior. In-memory limits are prohibited in production.

Cloudflare hosting approval does not authorize OpenAI API calls. The previous eight-request live test allowance is exhausted. Foundry remains available when Azure access returns.

## References

- [Cloudflare OpenNext adapter](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- [OpenNext setup](https://opennext.js.org/cloudflare/get-started)
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
