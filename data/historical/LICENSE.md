# Third-party data attribution — CC BY 4.0

Data collected and provided by **Wyscout**. Published by **Luca Pappalardo and
Emanuele Massucco (2019), Soccer match event dataset, figshare**.

- Collection: https://doi.org/10.6084/m9.figshare.c.4415000
- Paper: Pappalardo, L., Cintia, P., Rossi, A., Massucco, E., Ferragina, P.,
  Pedreschi, D. & Giannotti, F. _A public data set of spatio-temporal match
  events in soccer competitions_. Scientific Data **6**, 236 (2019).
  https://doi.org/10.1038/s41597-019-0247-7
- License: **Creative Commons Attribution 4.0 International**.
  https://creativecommons.org/licenses/by/4.0/
- Legal code: https://creativecommons.org/licenses/by/4.0/legalcode

Each used item was independently checked through the figshare public article
version API on October 9, 2026. All seven used items specify CC BY 4.0.
`sources.json` preserves their titles, versioned DOIs, licenses, original file
IDs, download URLs and checksums. This notice applies to the third-party data
in this directory, not to the application's code.

| Item          | Article and version | Original file                |
| ------------- | ------------------- | ---------------------------- |
| Events        | 7770599 v1          | events.zip (14464685)        |
| Matches       | 7770422 v1          | matches.zip (14464622)       |
| Teams         | 7765310 v3          | teams.json (15073697)        |
| Players       | 7765196 v3          | players.json (15073721)      |
| Competitions  | 7765316 v4          | competitions.json (15073685) |
| Event mapping | 11743836 v1         | eventid2name.csv (21385245)  |
| Tag mapping   | 11743818 v1         | tags2name.csv (21385239)     |

Changes by Between the Lines: selected three complete English league event
streams and their match records; retained only associated teams and players;
removed unused personal player fields; decoded escaped player names; combined
records into per-match JSON and reformatted JSON. Original match/event IDs,
event names, periods, timestamps, locations and tags remain in those records.
Runtime normalization, derived observations and known limitations are documented
in `docs/HISTORICAL-DATA.md`. The mapping CSV files are unchanged.

Keep attribution, license links and modification notices with redistributed
copies or adaptations. No endorsement by Wyscout, the authors, clubs or the
competition is implied. No club crests, league marks, photographs or footage
are included. This attribution does not grant rights in those separate assets.
