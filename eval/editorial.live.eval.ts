import { it, expect, vi } from "vitest";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { SyntheticMatchSource } from "../src/lib/sources/synthetic";
import { loadHistorical } from "../src/lib/sources/repository";
import { observe } from "../src/lib/ai/director/observer";
import { directMatch, investigate } from "../src/lib/ai/director/runner";
import { matchEvidence } from "../src/lib/sources/intelligence";
import { composeNarration } from "../src/lib/ai/narration";
import type { MatchData } from "../src/lib/sources/model";

// Separate, explicitly authorized suite. Never loaded by npm test or CI.
// The ledger persists usage and unresolved reservations across diagnostic reruns.
const outputDir = process.env.SECOND_LOOK_EDITORIAL_OUTPUT_DIR ?? "artifacts";
const ledgerPath = `${outputDir}/editorial-comparison-ledger.json`;
const variant = process.env.SECOND_LOOK_EDITORIAL_VARIANT;
if (!["original-mini", "revised-mini", "revised-gpt54"].includes(variant ?? ""))
  throw new Error("Explicit comparison variant required");
const endpoint =
  "https://josh-5098-resource.openai.azure.com/openai/v1/responses";
const model =
  variant === "revised-gpt54"
    ? "between-the-lines-gpt54-eval"
    : "between-the-lines-gpt54-mini";
const allowance = 2;
const maxRequests = 90;
const price =
  variant === "revised-gpt54"
    ? { input: 2.5, cachedInput: 0.25, output: 15 }
    : { input: 0.75, cachedInput: 0.075, output: 4.5 };
const pricingReference =
  "https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/introducing-openai%E2%80%99s-gpt-5-4-mini-and-gpt-5-4-nano-for-low-latency-ai/4500569";

type Attempt = {
  case: string;
  variant: string;
  model: string;
  reservedUsd: number;
  latencyMs: number;
  status?: number;
  responseStatus?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    input_tokens_details?: { cached_tokens?: number };
  };
  estimatedUsd?: number;
  error?: string;
  output?: unknown[];
  toolResults?: unknown[];
};
type Case = {
  name: string;
  match: MatchData;
  time: number;
  mode: "fan" | "analyst";
  preferences?: {
    player?: string;
    team?: "harbor" | "riverside";
    categories?: ("pressure" | "chances" | "rhythm")[];
  };
  workflow?: "recap";
};

it("bounded three-arm editorial comparison", async () => {
  if (process.env.SECOND_LOOK_AUTHORIZE_EDITORIAL_COMPARISON !== "yes")
    throw new Error("Explicit live-evaluation authorization required");
  if (
    process.env.FOUNDRY_DEPLOYMENT !== model ||
    process.env.FOUNDRY_ENDPOINT !==
      endpoint.replace("/openai/v1/responses", "") ||
    !process.env.FOUNDRY_API_KEY
  )
    throw new Error("Unexpected Foundry configuration");
  mkdirSync(outputDir, { recursive: true });
  const ledger: { attempts: Attempt[] } = existsSync(ledgerPath)
    ? JSON.parse(readFileSync(ledgerPath, "utf8"))
    : { attempts: [] };
  const saveLedger = () =>
    writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
  const transport = globalThis.fetch;
  let activeCase = "",
    stop = false;
  const rows: any[] = [];
  vi.stubGlobal("fetch", async (...args: Parameters<typeof fetch>) => {
    if (String(args[0]) !== endpoint)
      throw new Error("Unexpected live destination");
    const payload = String(args[1]?.body ?? "");
    const body = JSON.parse(payload);
    const bytes = Buffer.byteLength(payload);
    if (
      body.model !== model ||
      body.store !== false ||
      bytes > 131072 ||
      body.max_output_tokens > 1800
    )
      throw new Error("Request envelope exceeded");
    // Conservative byte/token envelope, extra protocol allowance, no cache discount.
    const reservation =
      ((bytes + 2048) * price.input + body.max_output_tokens * price.output) /
      1e6;
    if (
      ledger.attempts.length >= maxRequests ||
      ledger.attempts.reduce(
        (s, a) => s + (a.estimatedUsd ?? a.reservedUsd),
        0,
      ) +
        reservation >
        allowance
    )
      throw new Error("Evaluation allowance exhausted");
    const attempt: Attempt = {
      case: activeCase,
      variant: variant!,
      model,
      reservedUsd: reservation,
      latencyMs: 0,
      toolResults: body.input
        .filter((x: any) => x.type === "function_call_output")
        .map((x: any) => JSON.parse(x.output)),
    };
    ledger.attempts.push(attempt);
    saveLedger();
    const start = Date.now();
    try {
      const response = await transport(...args);
      attempt.status = response.status;
      const data = await response
        .clone()
        .json()
        .catch(() => ({}));
      attempt.responseStatus = data.status;
      attempt.usage = data.usage;
      // Never retain reasoning items, API keys, headers or raw provider request bodies.
      attempt.output = data.output?.filter((x: any) =>
        ["function_call", "message"].includes(x.type),
      );
      if (data.error) {
        attempt.error = String(data.error.message).slice(0, 600);
        stop = true;
      }
      if (data.usage) {
        const u = data.usage,
          c = u.input_tokens_details?.cached_tokens ?? 0;
        attempt.estimatedUsd =
          ((u.input_tokens - c) * price.input +
            c * price.cachedInput +
            u.output_tokens * price.output) /
          1e6;
      }
      return response;
    } catch (error) {
      attempt.error = error instanceof Error ? error.message : String(error);
      stop = true;
      throw error;
    } finally {
      attempt.latencyMs = Date.now() - start;
      saveLedger();
    }
  });
  const source = new SyntheticMatchSource();
  const pressure = source.read("pressure"),
    quiet = source.read("quiet"),
    sub = source.read("substitution");
  const substitution = sub.events.find((e) => e.type === "substitution")!;
  const round = process.env.SECOND_LOOK_EDITORIAL_ROUND;
  if (round && !["hardened", "final"].includes(round))
    throw new Error("Unknown comparison round");
  const phase = `${variant}${round ? `-${round}` : ""}`;
  const allCases: Case[] = [
    { name: "pressure-fan", match: pressure, time: 3804, mode: "fan" },
    { name: "pressure-fan-repeat", match: pressure, time: 3804, mode: "fan" },
    { name: "pressure-analyst", match: pressure, time: 3804, mode: "analyst" },
    { name: "quiet-fan", match: quiet, time: 3804, mode: "fan" },
    {
      name: "after-substitution",
      match: sub,
      time: Math.ceil(substitution.time) + 600,
      mode: "analyst",
    },
    {
      name: "unfamiliar-fan",
      match: source.read("pressure", { seed: 8911, profile: "balanced" }),
      time: 4200,
      mode: "fan",
    },
    {
      name: "player-preference",
      match: pressure,
      time: 3804,
      mode: "fan",
      preferences: { player: "harbor-9", team: "harbor" },
    },
    {
      name: "historical-fan",
      match: await loadHistorical("2499719"),
      time: 1800,
      mode: "fan",
    },
  ];
  const selectedNames = process.env.SECOND_LOOK_FOUNDRY_CASES?.split(",");
  const cases = selectedNames
    ? allCases.filter((c) => selectedNames.includes(c.name))
    : allCases;
  if (
    !cases.length ||
    selectedNames?.some((name) => !cases.some((c) => c.name === name))
  )
    throw new Error("Unknown evaluation case");
  try {
    for (const c of cases) {
      // Azure estimates rate-limit usage before actual token billing. Pace the
      // diagnostic harness; production retains its no-automatic-retry policy.
      if (rows.length)
        await new Promise((resolve) => setTimeout(resolve, 20000));
      activeCase = `${phase}:${c.name}`;
      const begin = ledger.attempts.length,
        start = Date.now();
      process.env.AI_ENABLED = "false";
      const baseline = await directMatch(
        c.match,
        c.time,
        c.mode,
        c.preferences,
      );
      process.env.AI_ENABLED = "true";
      const candidates = observe(c.match, c.time, c.mode, c.preferences);
      const row: any = {
        name: c.name,
        match: c.match.id,
        cutoff: c.time,
        mode: c.mode,
        baseline,
        candidateCount: candidates.length,
        humanReview: null,
      };
      try {
        const result =
          c.workflow === "recap"
            ? await composeNarration(
                matchEvidence(c.match, c.time, c.mode),
                "foundry",
              )
            : candidates.length
              ? await investigate(
                  c.match,
                  c.time,
                  c.mode,
                  c.preferences ?? {},
                  "foundry",
                )
              : await directMatch(c.match, c.time, c.mode, c.preferences);
        row.result = result;
        if (candidates.length || c.workflow === "recap")
          expect("source" in result ? result.source : result.provider).toBe(
            "foundry",
          );
        else expect(ledger.attempts.length).toBe(begin);
        for (const id of result.narrative.evidenceIds)
          expect(
            c.match.events.some((e) => e.id === id && e.time <= c.time),
          ).toBe(true);
        if ("stories" in result)
          for (const story of result.stories) {
            expect(story.validation).toBe("verified");
            expect(
              story.evidenceEventIds.every((id) =>
                c.match.events.some((e) => e.id === id && e.time <= c.time),
              ),
            ).toBe(true);
          }
        // The deterministic observer must be identical with future events removed.
        expect(
          observe(
            {
              ...c.match,
              events: c.match.events.filter((e) => e.time <= c.time),
            },
            c.time,
            c.mode,
            c.preferences,
          ),
        ).toEqual(candidates);
        row.passed = true;
      } catch (error) {
        row.passed = false;
        row.error = error instanceof Error ? error.message : String(error);
        if (row.error.includes("allowance")) stop = true;
      }
      row.latencyMs = Date.now() - start;
      row.requests = ledger.attempts.length - begin;
      row.estimatedUsd = ledger.attempts
        .slice(begin)
        .reduce((s, a) => s + (a.estimatedUsd ?? 0), 0);
      rows.push(row);
      console.log(
        JSON.stringify({
          case: row.name,
          passed: row.passed,
          requests: row.requests,
          estimatedUsd: row.estimatedUsd,
          error: row.error,
        }),
      );
      if (stop) break;
    }
  } finally {
    vi.unstubAllGlobals();
    writeFileSync(
      `${outputDir}/editorial-${phase}.json`,
      JSON.stringify(
        {
          model,
          phase,
          comparisonPricing: {
            activeVariantRates: price,
            gpt54Reference:
              "https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/introducing-gpt-5-4-in-microsoft-foundry/4499785",
          },
          pricingReference,
          price,
          allowanceUsd: allowance,
          maximumRequests: maxRequests,
          ledgerPath,
          rows,
        },
        null,
        2,
      ),
    );
  }
  expect(rows.length).toBe(cases.length);
  expect(rows.every((r) => r.passed)).toBe(true);
});
