import { MatchExperience } from "@/components/match-experience";
import { historicalEnabled } from "@/lib/sources/repository";
import { HISTORICAL_MATCHES } from "@/lib/sources/catalog";
import { researchFixtures } from "@/lib/sources/local-research";
export default async function Page() {
  const showRecorded =
    process.env.RECORDED_MATCHES_VISIBLE === "true" && historicalEnabled();
  return (
    <MatchExperience
      historicalEnabled={showRecorded}
      fixtures={
        showRecorded
          ? [...HISTORICAL_MATCHES, ...(await researchFixtures())]
          : []
      }
    />
  );
}
