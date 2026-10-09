import "server-only";
import { z } from "zod";
export type Provider = "openai" | "foundry";
export type ProviderMode = Provider | "offline";
export function configuredProvider(): ProviderMode {
  const selected =
    process.env.AI_PROVIDER ??
    (process.env.FOUNDRY_ENABLED === "true" ? "foundry" : "offline");
  const enabled =
    process.env.AI_ENABLED === "true" ||
    (process.env.AI_ENABLED === undefined &&
      selected === "foundry" &&
      process.env.FOUNDRY_ENABLED === "true");
  if (!enabled) return "offline";
  if (selected === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (
    selected === "foundry" &&
    process.env.FOUNDRY_ENDPOINT &&
    process.env.FOUNDRY_API_KEY &&
    process.env.FOUNDRY_DEPLOYMENT
  )
    return "foundry";
  return "offline";
}
export function modelFor(provider: Provider) {
  return provider === "openai"
    ? process.env.OPENAI_MODEL || "gpt-5.4-mini"
    : process.env.FOUNDRY_DEPLOYMENT || "";
}
export function foundryUrl() {
  const endpoint = new URL(process.env.FOUNDRY_ENDPOINT!);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    (endpoint.port && endpoint.port !== "443") ||
    !["/", "/openai/v1", "/openai/v1/"].includes(endpoint.pathname) ||
    !/(\.openai\.azure\.com|\.services\.ai\.azure\.com)$/.test(
      endpoint.hostname,
    )
  )
    throw new Error("Expected an Azure Foundry endpoint");
  return (
    endpoint.href.replace(/\/$/, "").replace(/\/openai\/v1$/, "") +
    "/openai/v1/responses"
  );
}
const responseSchema = z.object({
  status: z.literal("completed").optional(),
  output: z.array(
    z
      .object({
        type: z.string(),
        name: z.string().nullish(),
        call_id: z.string().nullish(),
        arguments: z.string().nullish(),
        content: z
          .array(z.object({ type: z.string(), text: z.string().nullish() }))
          .nullish(),
      })
      .passthrough(),
  ),
  usage: z
    .object({
      input_tokens: z.number().nonnegative(),
      output_tokens: z.number().nonnegative(),
      input_tokens_details: z
        .object({ cached_tokens: z.number().nonnegative() })
        .optional(),
    })
    .optional(),
});
export async function providerResponse(
  provider: Provider,
  body: Record<string, unknown>,
) {
  const payload = JSON.stringify({
    ...body,
    model: modelFor(provider),
    store: false,
    max_output_tokens: 1800,
    ...(provider === "openai" ? { reasoning: { effort: "low" } } : {}),
  });
  if (Buffer.byteLength(payload, "utf8") > 131072)
    throw new Error("Evidence payload too large");
  const res = await fetch(
    provider === "openai"
      ? "https://api.openai.com/v1/responses"
      : foundryUrl(),
    {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(provider === "openai"
          ? { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
          : { "api-key": process.env.FOUNDRY_API_KEY! }),
      },
      body: payload,
      signal: AbortSignal.timeout(25000),
    },
  );
  if (!res.ok) throw new Error("Provider unavailable");
  const parsed = responseSchema.safeParse(await res.json());
  if (!parsed.success)
    throw new Error("Invalid or incomplete provider response", {
      cause: parsed.error,
    });
  return parsed.data;
}
