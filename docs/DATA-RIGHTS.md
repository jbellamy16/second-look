# Football dataset rights review — October 9, 2026

## Public historical experience: Figshare / Wyscout

The [Pappalardo and Massucco Soccer Match Event Dataset](https://doi.org/10.6084/m9.figshare.c.4415000)
is the source for the three existing Premier League 2017–18 fixtures. The prior
integration was retained, independently rechecked and reproduced during this sprint.

We queried each **version-specific article**, checked that its license was CC BY
4.0, matched the used file ID, and compared the published MD5 with the pinned
import manifest. The saved [verification record](../data/historical/license-verification.json)
contains the exact API URLs and responses' relevant fields. The importer then
re-downloaded the original files into an ignored cache and reproduced all three
selected fixture files byte-for-byte.

| Used item         | Version-specific article                                                | File ID  | Verified license |
| ----------------- | ----------------------------------------------------------------------- | -------- | ---------------- |
| events.zip        | [7770599 v1](https://api.figshare.com/v2/articles/7770599/versions/1)   | 14464685 | CC BY 4.0        |
| matches.zip       | [7770422 v1](https://api.figshare.com/v2/articles/7770422/versions/1)   | 14464622 | CC BY 4.0        |
| teams.json        | [7765310 v3](https://api.figshare.com/v2/articles/7765310/versions/3)   | 15073697 | CC BY 4.0        |
| players.json      | [7765196 v3](https://api.figshare.com/v2/articles/7765196/versions/3)   | 15073721 | CC BY 4.0        |
| competitions.json | [7765316 v4](https://api.figshare.com/v2/articles/7765316/versions/4)   | 15073685 | CC BY 4.0        |
| eventid2name.csv  | [11743836 v1](https://api.figshare.com/v2/articles/11743836/versions/1) | 21385245 | CC BY 4.0        |
| tags2name.csv     | [11743818 v1](https://api.figshare.com/v2/articles/11743818/versions/1) | 21385239 | CC BY 4.0        |

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) permits sharing and
adaptation, including commercially, subject to attribution and its other terms.
Retain author/provider credit, source and license links, and notices describing
changes. Do not imply endorsement or impose restrictions that remove the
license's granted freedoms. Other rights in separate assets are not granted.

The existing [dataset notice](../data/historical/LICENSE.md) credits Wyscout,
Luca Pappalardo and Emanuele Massucco, the Figshare collection and research paper.
It discloses selection, name decoding, removal of unused personal fields and
normalization. The UI shows provider credit, source and license links, adaptation
notice and no endorsement. Data notices apply to `data/historical`; they do not
relicense the application or its original brand assets.

| Public fixture                                  | Source ID | Original event records | Reconciled final score |
| ----------------------------------------------- | --------- | ---------------------- | ---------------------- |
| Arsenal – Leicester City, 2017-08-11            | 2499719   | 1,768                  | 4–3                    |
| Liverpool – Manchester City, 2018-01-14         | 2499943   | 1,876                  | 4–3                    |
| Huddersfield Town – Manchester City, 2017-11-26 | 2499841   | 1,593                  | 1–2                    |

Six, five and six metadata substitution records respectively are added to the
canonical timeline, with minute precision and source JSON-path references. These
are documented source records, not fictional event actions. Final scores are
reconciled against match metadata; no independent official statistics claim is made.

No club crests, player photographs, league marks or broadcast footage are included.
Dataset availability does not authorize real-match material in a competition
requiring synthetic data. The official hackathon demo stays synthetic.

## StatsBomb: adapter retained, distribution blocked

Reviewed the [README](https://github.com/hudl/open-data/blob/4b73468fc5b0f1950f9f66fada70ad3a4f9327cb/README.md)
and [Public Data User Agreement](https://github.com/hudl/open-data/blob/4b73468fc5b0f1950f9f66fada70ad3a4f9327cb/LICENSE.pdf)
at repository revision `4b73468fc5b0f1950f9f66fada70ad3a4f9327cb`.
The agreement identifies September 8, 2023 as its last update.

The README invites research and requests StatsBomb attribution and its logo when
publishing analysis. The agreement's sections 1.2.1–1.2.2 restrict providing data
to third parties and commercial exploitation; section 7 adds restrictions around
modification and exploitation without written consent. Section 1.4 requires brand
logo credit on published analysis. These are not CC BY terms and do not establish
permission to distribute this application's normalized match assets.

Accordingly, no StatsBomb original or normalized dataset, screenshot, recording
or derived benchmark is committed or shipped. The importer, SHA-256 manifest and
author-created contract tests are distributable application code. A complete
France–Croatia 2018 fixture was validated locally against all original event IDs,
recorded timestamps, substitutions and scoring records. Research artifacts stay
in `.cache/statsbomb`; normal CI uses invented contract records, not redistributed
StatsBomb rows. No StatsBomb output is included in the public benchmark.

Production denies the research fixture regardless of its feature flag. External
AI requests for that fixture are disabled. Public/commercial use or hackathon
inclusion requires affirmative clarification/permission and fulfillment of
attribution and competition requirements; this sprint does not grant that approval.
