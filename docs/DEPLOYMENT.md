# Deploy Between the Lines to Azure

For the current Cloudflare route, see [Cloudflare deployment](CLOUDFLARE.md). This runbook preserves the Azure option.

## Current status

No Azure deployment has been verified. OpenAI Fan narration passed a local authorized live check; an Analyst context omission is fixed with offline captured-response verification, and the revised flow has not been rechecked live. Foundry remains unverified live. On October 9, 2026, the owner logged into Azure CLI but reported that the required access remains unavailable. Normal inference stays disabled. Nothing in this repository provisions resources automatically.

## 1. Prepare an existing App Service

Sign into the intended subscription with `az login`. Select the subscription explicitly. Use an existing Linux App Service with a supported Node runtime; the repository’s CI/container target Node 24 LTS. Verify availability in the target subscription/region:

```sh
az webapp list-runtimes --os linux -o table
```

If no suitable app exists, review App Service plan and Foundry model costs and obtain approval before creating resources. This runbook intentionally contains no resource-creation commands.

Configure the existing app:

- Linux Node runtime compatible with the application, preferably Node 24 LTS.
- Startup command: `node server.js` (deployment packages the standalone server).
- `NODE_ENV=production`, `HOSTNAME=0.0.0.0`; allow the hosting platform to supply `PORT`.
- `SCM_DO_BUILD_DURING_DEPLOYMENT=false`; the workflow uploads the completed build.
- Public access, HTTPS only; no login barrier for judges.
- Keep `AI_ENABLED=false` until paid inference is approved. Production inference requires an existing TLS Redis store shared across all instances; see the controls and persistence requirements in `AI-EVALUATION.md`.

## 2. Configure GitHub

Create a GitHub environment named `production`. Add:

| Kind                 | Name                           | Meaning                                       |
| -------------------- | ------------------------------ | --------------------------------------------- |
| Environment variable | `AZURE_WEBAPP_NAME`            | Existing App Service name                     |
| Environment variable | `AZURE_WEBAPP_URL`             | Full public HTTPS URL, without trailing slash |
| Environment secret   | `AZURE_WEBAPP_PUBLISH_PROFILE` | Existing app’s downloaded publish profile XML |

Upload the profile directly into GitHub Secrets; never commit it or paste it into a chat. Publish-profile deployment requires SCM publishing authentication enabled on the app. If organizational policy disables it, replace the workflow with approved OIDC authentication rather than weakening policy. Rotate/revoke the profile when no longer needed.

Run **Deploy existing Azure App Service** manually on `main` from the Actions tab. It checks types, runs unit and browser tests against a production build, deploys the standalone package, and verifies the returned HTML and intelligence-status endpoint. A failed URL verification means deployment is not yet verified even if upload succeeded.

## 3. Configure an optional provider after spending approval

In Microsoft Foundry, select an existing Azure OpenAI model deployment supporting the Responses API, function tools, and structured output. Verify availability for that model and region. Do not create a paid deployment without approval.

In the App Service Configuration/Environment variables panel, enter `FOUNDRY_ENDPOINT`, `FOUNDRY_API_KEY`, `FOUNDRY_DEPLOYMENT`, plus `AI_PROVIDER=foundry` and `AI_ENABLED=true`, and conservative shared `AI_MINUTE_LIMIT`, `AI_HOURLY_LIMIT`, `AI_DAILY_LIMIT`, and `AI_TOTAL_LIMIT` settings. Configure `AI_REDIS_URL` with an existing TLS Redis connection. Use the Azure OpenAI resource root endpoint, e.g. `https://RESOURCE.openai.azure.com`. The server calls `/openai/v1/responses` with resource API-key authentication. The `.services.ai.azure.com` resource hostname is accepted, but project endpoints requiring Entra authentication are not supported by this key-based adapter.

For the OpenAI alternative, use `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and `OPENAI_MODEL=gpt-5.4-mini` with the same shared usage controls. Do not enable both workflows independently: the selector routes through one shared orchestration.

Keep all secrets server-side; never put keys in repository variables, browser code, `NEXT_PUBLIC_*`, screenshots, or submission materials. Use persistent Redis quota storage with no eviction and consistent limits on all instances. Store outages fail closed. Alerts are useful but are not hard spending caps; the application enforces request reservations, not a dollar-denominated billing ceiling. Run the authorized small evaluation and human review in `AI-EVALUATION.md` before public AI access.

## 4. Verify the actual deployment

1. Load the public URL in a signed-out/private browser. Confirm score 1–0 at 63:24 in the pressure fixture.
2. Play, pause, seek back to kickoff: score must be 0–0; early recaps must exclude later events.
3. Select pressure evidence and replay; switch to Analyst mode and inspect window comparisons.
4. Select **Explain with Microsoft Foundry**. Confirm the **MICROSOFT FOUNDRY · VERIFIED STORY** label appears and a natural-language explanation is returned. A “configured” header alone is insufficient.
5. Review prose for unsupported claims. Check that evidence IDs match the displayed pattern and that event-derived figures remain unchanged.
6. Confirm offline fallback by temporarily setting `AI_ENABLED=false` and restarting; restore only if the configured integration works.
7. Check browser console and server logs without logging keys or request authentication headers.
8. Confirm desktop and physical mobile behavior, HTTPS, and uninterrupted judge access through November 10, 2026, at 11:59 p.m. Pacific.

## Optional container route

The Dockerfile packages the same standalone app for an existing Azure container host. Build and run locally:

```sh
docker build -t second-look .
docker run --rm -p 3000:3000 second-look
```

Container build was supplied as deployment preparation; it must be tested in the destination container environment. No registry, container host, or paid service is provisioned here.

## Official technical references

- [Microsoft Foundry Responses API](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/responses)
- [Structured outputs](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/structured-outputs)
- [Azure App Service GitHub Actions deployment](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions)
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)

## Brand metadata before hosting

Set `NEXT_PUBLIC_SITE_URL` to the chosen public HTTPS origin **at build time** so Open Graph and X image URLs resolve to the actual host. The variable is a public origin, not a secret. Keep inference keys server-side. Verify `/manifest.webmanifest`, `/favicon.ico`, `/apple-touch-icon.png`, `/opengraph-image.png`, and `/twitter-image.png` after deployment. The supplied OG is 1200×630 and X is 1200×675. The manifest does not imply offline caching.
