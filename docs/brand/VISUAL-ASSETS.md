# Second Look visual asset system

Reviewed and implemented 9 October 2026. This extends the original brand kit; the Second Look logo is retained.

## Direction and family selection

Use **Lucide outline** for the interface, with seven original football glyphs built to the same geometry. Club marks are identity artwork, not a second UI icon family. A solid crest does not make an inactive control look selected.

| Family evaluated                                            | Assessment for Second Look                                                                                                                                                                   | Decision                                                                              |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Lucide](https://lucide.dev/contribute/icons/specification) | Clear 24-unit construction, rounded 2-unit strokes, strong controls and chart vocabulary. Fits the product's precise, quiet visual language. Already installed, so no extra icon dependency. | Primary family; standardize its application rather than change libraries for novelty. |
| [Phosphor](https://github.com/phosphor-icons/core)          | Expressive family with multiple weights and filled/duotone treatments. Good alternative for a warmer editorial product. Those extra treatments are unnecessary for this interface.           | Not included.                                                                         |
| [Iconoir](https://github.com/iconoir-icons/iconoir)         | Refined linear alternative. Its lighter appearance would require a separate small-size tuning pass to match the dense dark interface.                                                        | Not included.                                                                         |
| [Tabler](https://github.com/tabler/tabler-icons)            | Strong 24-unit, 2-unit outline alternative with broad coverage. Does not offer enough benefit here to justify replacing the established Lucide controls.                                     | Not included.                                                                         |

These are design judgments, not a ranking of library quality. Lucide's published specification was checked against the installed package. All third-party UI geometry comes from the existing `lucide-react` dependency.

## Construction and application

- Import UI glyphs only from `src/components/icons.tsx`. No direct library imports in screens.
- Canvas: 24 × 24. Stroke: 2 units, scaling with the canvas. Round joins and caps, no filled active variants. Lucide uses 2-unit large corners and 1-unit small corners; original glyphs use the same rounded construction and simplified paths.
- Sizes: **16** for metadata, inline actions and timeline; **20** for navigation, event rows and controls; **24** for category badges; **32** for an isolated empty state or recap heading. The type prevents arbitrary sizes and stroke/fill overrides.
- Preserve the square aspect ratio. Use inline-flex centering and prevent flex shrink. Playback's triangle receives a 1px optical shift; pause stays geometrically centered.
- Icon/text spacing: 8px; navigation: 12px. Category containers: 40px with 10px corners. Event containers: 36px, reducing to 32px on phones, with 8px corners.
- Icon-only controls retain at least 44px touch targets. Timeline glyphs occupy 24px boxes with expanded 44px hit areas. Pitch selection retains the accessible event picker for overlapping points.
- Inactive glyphs inherit muted text; navigation selection uses blue with the existing background/edge indicator. Disabled buttons use the existing 55% opacity treatment. Hover and focus retain the same geometry; keyboard focus is outlined. Selection never switches to an unrelated filled icon.
- Green identifies evidence/pressure, amber identifies chances, blue identifies rhythm and primary navigation. Team identity uses **Harbor #72c6ff** and **Riverside #ff7a83** independently of status color.
- Decorative glyphs are hidden from assistive technology; visible labels or the parent button name communicate purpose. Do not use these decorative components alone as the accessible name of a control.

## Semantic inventory

| Purpose                 | Asset                                                   | Used in                                                                                            |
| ----------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Match events            | Lucide List                                             | Event feed header                                                                                  |
| Goal                    | Original segmented football                             | Timeline and event mapping                                                                         |
| Shot                    | Original ball with directed strike                      | Chances, event/evidence rows, player metrics                                                       |
| Pass                    | Original ball with transfer path                        | Event/evidence rows, player metrics                                                                |
| Tackle                  | Original opposing challenges around a ball              | Event/evidence rows                                                                                |
| Interception            | Original interrupted route and recovery path            | Event/evidence rows                                                                                |
| Ball recovery           | Original return arrow around a ball                     | Pressure, event/evidence rows, player metrics                                                      |
| Substitution            | Lucide ArrowLeftRight                                   | Timeline and event mapping                                                                         |
| Tactical insight        | Original route and opposition marker                    | Navigation, insight headings and explanation actions                                               |
| Match momentum / rhythm | Lucide ChartNoAxesCombined                              | Rhythm insight category; it represents a detected comparison, not a fabricated live momentum chart |
| Player/match statistics | Lucide ChartNoAxesColumnIncreasing, Focus; event glyphs | Navigation, viewing mode, player metrics                                                           |
| Replay                  | Lucide Play, Pause, RotateCcw, ListVideo                | Playback, sequence actions, recap                                                                  |
| Other recorded events   | Lucide MoveRight, Flag, CircleAlert, CircleDot          | Carry, corner, foul, possession mapping                                                            |
| Competition             | Lucide Trophy                                           | Invitational identity                                                                              |

`EVENT_ICONS` is exhaustive over the match's event type. Some types only appear at the relevant time or scenario. Labels remain next to unfamiliar football glyphs; users do not need to memorize them.

## Original identities

**Harbor Athletic:** a geometric harbor-gate H above a short water line. **Riverside FC:** a cut R above a rising river line. Both use a common shield envelope, inset color field, midnight monogram and consistent optical weight. There are no tiny dates, stars, borrowed heraldry, real club marks, or photographs.

Crests render at 48 × 54px in desktop scores, 32 × 36px on phones, and 24 × 27px in lists/identity cards. Paths are self-contained and do not depend on installed fonts. The fictional player card combines club code, crest, squad number and role. Lineups keep concise numbered tiles in the same club palette.

The pitch uses blue circles for Harbor and coral rounded squares for Riverside. A matching legend, team codes in the event feed, and visible player names reinforce color. Selection adds a white ring without changing the team's identity. Sequence paths and arrowheads inherit the event team's color; dash patterns distinguish action types.

## Full audit and disposition

### In-app assets

| Existing asset or family                                         | Finding                                                                      | Disposition                                                                                                                     |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Shield icon with serif H/R overlay and clipped pseudo-background | Placeholder appearance, thin outline, no distinctive club geometry           | Removed; replaced by original club SVGs.                                                                                        |
| CSS cutout player shirt                                          | Decorative silhouette without useful detail; inconsistent with the interface | Removed; replaced by club/number identity card. Responsive profile layout rebuilt for the new asset.                            |
| Striped pitch and radial lighting                                | Decorative simulation of turf competed with analytical marks                 | Removed. Retained useful pitch geometry on a flat field; constant screen-width field lines.                                     |
| Pitch points and labels                                          | Both teams were blue; small numbers, selection changed identity color        | Team color + shape encoding, larger numbers, stable selected color. Mobile tooltip replaced by the existing readable inspector. |
| Shot/pass/carry arrows                                           | Blue arrowhead could disagree with the path color                            | Team-colored paths with matching arrowheads; existing action dash semantics retained.                                           |
| Goal/substitution timeline dots                                  | Tiny dots did not explain the event type                                     | Football and substitution glyphs with expanded hit areas.                                                                       |
| Sparkles                                                         | Repeated generic AI decoration across football analysis                      | Replaced throughout by tactical-route glyph.                                                                                    |
| Pressure TrendingUp, chances ArrowUpRight, rhythm Activity       | Generic metaphors with inconsistent 21/22px sizing                           | Recovery, Shot, Momentum at a common 24px size.                                                                                 |
| Competition Goal (target glyph)                                  | Target did not identify the competition                                      | Lucide Trophy.                                                                                                                  |
| LayoutGrid, Users, Focus, BarChart3                              | Suitable navigational concepts                                               | Retained in the Lucide system; stats use the lighter column-increase geometry.                                                  |
| ArrowRight, ArrowUpRight, ChevronDown, ChevronRight              | Suitable directional controls                                                | Retained; 16/20px size steps.                                                                                                   |
| Check, CircleHelp, Clock3, Crosshair, Settings2, X               | Suitable utility/status vocabulary                                           | Retained; standardized sizing and decorative accessibility.                                                                     |
| Play, Pause, RotateCcw, ListVideo                                | Playback included filled glyphs and a CSS rule squeezing width to 15px       | Outline only, standardized square sizes; obsolete width rule removed.                                                           |
| Shield beside demo note                                          | Suitable protection/provenance concept but generic shape                     | Lucide ShieldCheck.                                                                                                             |
| Activity in empty states, TrendingUp for numerical increase      | Appropriate when describing activity or actual increase                      | Retained in those specific contexts.                                                                                            |
| Event/evidence rows                                              | Crests or play arrows alone did not identify action type                     | Semantic event glyphs, with textual descriptions and team codes in the feed.                                                    |
| Status dots, comparison bars, timeline, numbered lineup tiles    | Functional data marks, not illustrations                                     | Retained; team bars/tiles aligned to the club palette.                                                                          |
| Browser disclosure arrows                                        | Native affordances, not imported artwork                                     | Retained.                                                                                                                       |

### All existing public brand exports

The following were inspected in a browser asset sheet, including the smallest favicon at its native dimensions. They share the established original Second Look mark and remain fit for their role.

| Files                                                                                       | Decision                                                                                                                              |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `brand/second-look-mark-dark.svg`                                                           | Retain original scalable symbol.                                                                                                      |
| `brand/second-look-horizontal-dark.svg`, `brand/second-look-horizontal-light.svg`           | Retain source lockups. These contain live text; production continues to use the existing raster wordmarks for predictable typography. |
| `brand/second-look-horizontal-dark-1600.png`, `brand/second-look-horizontal-light-1600.png` | Retain crisp raster lockups. Light variant belongs on light surfaces only.                                                            |
| `favicon.svg`, `icon.svg`, `favicon.ico`                                                    | Retain browser-compatible brand mark variants.                                                                                        |
| `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`                               | Retain native-size favicon exports.                                                                                                   |
| `icon-64.png`, `icon-192.png`, `icon-256.png`, `icon-512.png`, `icon-1024.png`              | Retain application icon sizes.                                                                                                        |
| `icon-maskable-512.png`, `apple-touch-icon.png`                                             | Retain platform exports and safe-area treatment.                                                                                      |
| `safari-pinned-tab.svg`                                                                     | Retain monochrome mask; browser supplies its display tint.                                                                            |
| `opengraph-image.png`, `twitter-image.png`                                                  | Retain existing branded promotional artwork; not live match data.                                                                     |

Repository screenshots and the brand guidelines are documentation, not shipped interface illustrations. No new raster artwork was necessary: these new marks and symbols benefit from crisp vectors. Existing PNGs remain appropriate for platform icons, social previews and typography-stable lockups. No remote image service, image font or new icon family is loaded.

## Licenses and provenance

- Lucide: [ISC, plus MIT for Feather-derived portions](https://lucide.dev/license). Both full notices from the installed package are preserved in `public/icon-licenses.txt`, distributed by the app and linked from About. Keep this file when distributing the assets. No mandatory visible attribution banner is specified by these licenses; the About credit is also provided.
- Evaluated alternatives: Phosphor, Iconoir and Tabler publish MIT licenses in their linked official repositories. None of their assets were copied or installed.
- Seven football glyphs and two club marks: original project-authored vector artwork in `src/components/icons.tsx` and `public/teams/`. No external source assets or additional third-party attribution.
- Existing Second Look logo exports: retained project-authored assets described in the original brand kit. No Premier League marks, real club crests or player photos are used.

## Verification

Reviewed rendered screenshots, not just SVG syntax. The contact sheet shows each UI glyph at 16, 20, 24 and 32px and both crests at 24, 32, 48 and 80px. Reviewed match centre, event feed, sequence replay, insights, statistics, both club identities, lineups, player focus and dialogs on desktop and phone layouts. Extra inspection at 320px width.

Automated checks: production build/TypeScript pass; 110 unit tests pass (one existing live-provider test skipped); all 33 existing browser tests pass. After final refinements, 12 focused browser cases pass across desktop, Android-sized and iPhone-sized Chromium, including six new asset/identity checks and the existing all-screen accessibility and pitch interaction checks. No claim of physical-device Safari validation.

Visual review caught and corrected a squeezed mobile playback glyph, unreadable scaled tooltips, and the old shirt layout crowding the new mobile player card. The added browser regression checks verify loaded crests, square outline playback, away-team selection identity, readable team codes, and non-overlapping profile/metric placement.

Review evidence:

- [Asset contact sheet](../screenshots/visual-assets-board.png)
- [Desktop match centre](../screenshots/visual-assets-desktop.png)
- [Mobile match centre](../screenshots/visual-assets-mobile.png)
- [320px match centre](../screenshots/visual-assets-small-mobile.png)
- [Riverside player identity](../screenshots/visual-assets-player.png)
- [Mobile player identity](../screenshots/visual-assets-mobile-player.png)
