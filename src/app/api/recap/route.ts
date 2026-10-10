import { z } from "zod";
import { SyntheticMatchSource } from "@/lib/sources/synthetic";
import { pitchEvents } from "@/lib/sources/model";
import { recap } from "@/lib/intelligence";
import { buildEvidence, matchRequestSchema } from "@/lib/ai/evidence";
import {
  json,
  narratePacket,
  offlineProvenance,
  readInput,
} from "@/lib/ai/service";
export const runtime = "nodejs";
const requestSchema = matchRequestSchema.strict();
export async function POST(req: Request) {
  let input: z.infer<typeof requestSchema>;
  try {
    input = await readInput(req, requestSchema);
  } catch {
    return json({ error: "Invalid match request" }, 400);
  }
  const events = pitchEvents(
    new SyntheticMatchSource().read(input.scenario, { profile: input.profile })
      .events,
  );
  const packet = buildEvidence(
    events,
    input.time,
    input.mode,
    input.preferences,
  );
  const summary = recap(events, input.time, input.mode);
  // No editorial choice to make: don't spend tokens to rephrase a quiet opening.
  if (
    !packet.facts.some(
      (f) =>
        f.kind === "pattern" || f.kind === "moment" || f.kind === "context",
    )
  )
    return json({
      summary,
      source: "offline",
      narrative: null,
      provenance: offlineProvenance(packet),
      notice: "There is no supported development to narrate yet.",
    });
  return json({ summary, ...(await narratePacket(packet)) });
}
