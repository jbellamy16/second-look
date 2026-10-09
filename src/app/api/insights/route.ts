import { NextResponse } from "next/server";
import { z } from "zod";
import { generateMatch } from "@/lib/match";
import { detectInsights } from "@/lib/intelligence";
import { foundryConfigured, narrate, Narrative } from "@/lib/foundry";
export const runtime = "nodejs";
const requestSchema = z
  .object({
    scenario: z.enum(["pressure", "substitution", "quiet"]),
    time: z.number().int().min(0).max(5400),
    mode: z.enum(["fan", "analyst"]),
    team: z.enum(["harbor", "riverside"]),
    category: z.enum(["pressure", "chances", "rhythm"]),
  })
  .strict();
const cache = new Map<string, { expires: number; value: Promise<Narrative> }>();
let budget = { start: Date.now(), used: 0 };
export async function GET() {
  return NextResponse.json(
    { mode: foundryConfigured() ? "foundry" : "offline" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 2048)
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  let input: z.infer<typeof requestSchema>;
  try {
    const raw = await req.text();
    if (raw.length > 2048) throw new Error("Large input");
    input = requestSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json(
      { error: "Invalid match request" },
      { status: 400 },
    );
  }
  const events = generateMatch(input.scenario);
  const insight = detectInsights(events, input.time).find(
    (i) => i.team === input.team && i.category === input.category,
  );
  if (!insight)
    return NextResponse.json(
      { error: "No verified pattern at this timestamp" },
      { status: 404 },
    );
  const fallback = { source: "offline", insight, narrative: null };
  if (!foundryConfigured()) return NextResponse.json(fallback);
  // One entry per timestamp and audience; requests coalesce. Only explicit user actions call this route.
  const key = JSON.stringify(input),
    now = Date.now();
  for (const [k, v] of cache) if (v.expires < now) cache.delete(k);
  const existing = cache.get(key);
  if (!existing) {
    if (now - budget.start > 3600000) budget = { start: now, used: 0 };
    const configured = Number(process.env.FOUNDRY_HOURLY_LIMIT ?? 30);
    const limit = Number.isFinite(configured)
      ? Math.max(0, Math.min(100, configured))
      : 30;
    if (budget.used >= limit)
      return NextResponse.json({
        ...fallback,
        notice:
          "The narration budget has been reached. Verified offline explanation is available.",
      });
    budget.used++;
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, {
      expires: now + 3600000,
      value: narrate(insight, events, input.mode),
    });
  }
  try {
    return NextResponse.json({
      source: "foundry",
      insight,
      narrative: await cache.get(key)!.value,
    });
  } catch {
    return NextResponse.json({
      ...fallback,
      notice:
        "Foundry narration is unavailable or did not pass validation. Showing the verified offline explanation.",
    });
  }
}
