import { MatchExperience } from "@/components/match-experience";
import { historicalEnabled } from "@/lib/sources/repository";
export default function Page() {
  return <MatchExperience historicalEnabled={historicalEnabled()} />;
}
