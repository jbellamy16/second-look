import { MatchExperience } from "@/components/match-experience";
import { historicalEnabled } from "@/lib/sources/repository";
import { HISTORICAL_MATCHES } from "@/lib/sources/catalog";
import { researchFixtures } from "@/lib/sources/local-research";
export default async function Page() {
  return (
    <MatchExperience
      historicalEnabled={historicalEnabled()}
      fixtures={[...HISTORICAL_MATCHES, ...(await researchFixtures())]}
    />
  );
}
