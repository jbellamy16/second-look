import { z } from "zod";
import { historicalEnabled, loadHistorical } from "@/lib/sources/repository";
import { historicalEvidence } from "@/lib/sources/intelligence";
import {
  json,
  narratePacket,
  offlineProvenance,
  readInput,
} from "@/lib/ai/service";
export const runtime = "nodejs";
const schema = z
  .object({
    matchId: z.string().regex(/^(2499719|2499943|2499841|statsbomb-8658)$/),
    time: z.number().finite().nonnegative().max(7200),
    mode: z.enum(["fan", "analyst"]),
    insightId: z.string().max(80).optional(),
  })
  .strict();
export async function POST(req: Request) {
  if (!historicalEnabled())
    return json({ error: "Historical matches are disabled" }, 404);
  let input: z.infer<typeof schema>;
  try {
    input = await readInput(req, schema);
  } catch {
    return json({ error: "Invalid historical match request" }, 400);
  }
  let match;
  try {
    match = await loadHistorical(input.matchId);
  } catch {
    return json({ error: "Historical match unavailable" }, 404);
  }
  if (input.time > match.duration)
    return json({ error: "Timestamp is outside this replay" }, 400);
  let packet;
  try {
    packet = historicalEvidence(match, input.time, input.mode, input.insightId);
  } catch {
    return json({ error: "No verified pattern at this timestamp" }, 404);
  }
  if (match.provenance.redistribution === "restricted")
    return json({
      source: "offline",
      narrative: null,
      provenance: offlineProvenance(packet),
      notice:
        "Local research evidence only; external AI requests are disabled for this fixture.",
    });
  if (!packet.facts.some((f) => f.kind === "pattern" || f.kind === "moment"))
    return json({
      source: "offline",
      narrative: null,
      provenance: offlineProvenance(packet),
      notice: "There is no supported development to narrate yet.",
    });
  return json(await narratePacket(packet));
}
