// Only non-spoiler metadata belongs in the initial browser bundle.
export type Fixture = {
  id: string;
  title: string;
  date: string;
  competition: string;
  provider: string;
};
export const HISTORICAL_MATCHES: readonly Fixture[] = [
  {
    id: "2499719",
    title: "Arsenal vs Leicester City",
    date: "2017-08-11",
    competition: "Premier League · 2017–18",
    provider: "Wyscout · CC BY 4.0",
  },
  {
    id: "2499943",
    title: "Liverpool vs Manchester City",
    date: "2018-01-14",
    competition: "Premier League · 2017–18",
    provider: "Wyscout · CC BY 4.0",
  },
  {
    id: "2499841",
    title: "Huddersfield Town vs Manchester City",
    date: "2017-11-26",
    competition: "Premier League · 2017–18",
    provider: "Wyscout · CC BY 4.0",
  },
];
