import { historicalEnabled, loadHistorical } from "@/lib/sources/repository";
import { json } from "@/lib/ai/service";
export const runtime = "nodejs";
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!historicalEnabled())
    return json({ error: "Historical matches are disabled" }, 404);
  const { id } = await context.params;
  try {
    return json(await loadHistorical(id));
  } catch {
    return json({ error: "This historical match is unavailable" }, 404);
  }
}
