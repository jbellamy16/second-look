import { z } from "zod";
import type { Mode } from "../../intelligence";
import type { MatchData } from "../../sources/model";
import type { ProviderMode } from "../providers";
import { DIRECTOR_VERSION, type Candidate } from "./observer";

export const editorialSchema = z
  .object({
    decision: z.enum(["publish", "abstain"]),
    stories: z
      .array(
        z
          .object({
            claimId: z.string().max(300),
            form: z.enum(["brief", "detail"]),
            emphasis: z.enum(["sequence", "comparison", "contribution"]),
          })
          .strict(),
      )
      .max(3),
  })
  .strict();
export type EditorialPlan = z.infer<typeof editorialSchema>;
export type BroadcastStory = {
  schemaVersion: "1.0.0";
  storyId: string;
  matchId: string;
  cutoff: number;
  timestamp: number;
  headline: string;
  explanation: string;
  category: Candidate["category"];
  claimIds: string[];
  statistics: Candidate["statistics"];
  evidenceEventIds: string[];
  coordinates: { eventId: string; x: number; y: number; type: string }[];
  audience: Mode;
  visualization: "sequence" | "comparison" | "contribution";
  presentation: { earliest: number; expires: number; durationSeconds: number };
  limitations: string[];
  provider: ProviderMode;
  validation: "verified";
  evidenceQuality: "recorded-events";
  source: { provider: string; revision: string | null; attribution: string };
  promptVersion: string;
};
export function packageStory(
  candidate: Candidate,
  match: MatchData,
  cutoff: number,
  mode: Mode,
  provider: ProviderMode,
  form: "brief" | "detail" = mode === "fan" ? "brief" : "detail",
  emphasis: BroadcastStory["visualization"] = "sequence",
): BroadcastStory {
  const events = candidate.evidenceIds.map((id) =>
    match.events.find((e) => e.id === id),
  );
  if (events.some((e) => !e || e.time > cutoff || e.matchId !== match.id))
    throw new Error("Story evidence violation");
  return {
    schemaVersion: "1.0.0",
    storyId: candidate.id,
    matchId: match.id,
    cutoff,
    timestamp: candidate.timestamp,
    headline: candidate.headline,
    explanation: candidate[form],
    category: candidate.category,
    claimIds: [candidate.id],
    statistics: candidate.statistics,
    evidenceEventIds: candidate.evidenceIds,
    coordinates: events.flatMap((e) =>
      e?.position ? [{ eventId: e.id, ...e.position, type: e.type }] : [],
    ),
    audience: mode,
    visualization: emphasis,
    presentation: {
      earliest: cutoff,
      expires: Math.min(match.duration, cutoff + 180),
      durationSeconds: mode === "fan" ? 8 : 14,
    },
    limitations: [...match.limitations, ...candidate.limitations],
    provider,
    validation: "verified",
    evidenceQuality: "recorded-events",
    source: {
      provider: match.provenance.provider,
      revision: match.provenance.revision,
      attribution: match.attribution,
    },
    promptVersion: DIRECTOR_VERSION,
  };
}
export function validateEditorialPlan(
  raw: unknown,
  candidates: Candidate[],
  retrieved: Set<string>,
) {
  const plan = editorialSchema.parse(raw);
  if ((plan.decision === "abstain") !== !plan.stories.length)
    throw new Error("Invalid abstention");
  const seen = new Set<string>();
  for (const story of plan.stories) {
    const c = candidates.find((c) => c.id === story.claimId);
    if (!c || !retrieved.has(story.claimId) || seen.has(story.claimId))
      throw new Error("Uninvestigated or duplicate claim");
    if (
      story.emphasis === "comparison" &&
      !["activity-change", "shot-location", "window-comparison"].includes(
        c.category,
      )
    )
      throw new Error("Invalid comparison");
    if (
      story.emphasis === "contribution" &&
      ![
        "passing-pair",
        "substitute-involvement",
        "player-involvement",
      ].includes(c.category)
    )
      throw new Error("Invalid contributor");
    if (
      story.emphasis === "sequence" &&
      !["recovery-shot", "shot-sequence"].includes(c.category)
    )
      throw new Error("Invalid sequence");
    for (const prior of candidates.filter((c) => seen.has(c.id))) {
      const intersection = c.evidenceIds.filter((id) =>
        prior.evidenceIds.includes(id),
      ).length;
      if (
        intersection /
          Math.min(c.evidenceIds.length, prior.evidenceIds.length) >
        0.65
      )
        throw new Error("Overlapping stories");
    }
    seen.add(c.id);
  }
  return plan;
}
