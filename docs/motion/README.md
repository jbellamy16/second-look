# Phase 4: motion and interaction system

The screenshots and recordings in this directory are historical evidence from the motion implementation before the rebrand. See [current Between the Lines screenshots](../brand/REVIEW.md) for the shipping identity. Motion behavior is preserved.

## Design and architecture

The existing brand, Lucide/football glyphs, fictional club crests and player identity cards are preserved in checkpoint `7aa8a65`. Motion is an additional layer; match generation, statistics, evidence selection and AI validation are unchanged.

`src/app/motion.css` is the timing source of truth: micro 150ms, standard 220ms, panels 280ms, significant feedback 420ms. Shared ease-out and state curves avoid springs, overshoot and constant decoration. The React helpers read these CSS tokens for native Web Animations and cancel superseded animations on cleanup.

We evaluated [Motion for React's lightweight options](https://motion.dev/docs/react-reduce-bundle-size). CSS transitions, native dialog discrete transitions, Web Animations for interruptible feedback, and a single SVG requestAnimationFrame loop cover this scope. No animation dependency was added.

Navigation, mode switches and evidence tabs share a moving selection indicator. Indicators measure only when selection or size changes. Insight cards keep a stable identity across minute updates, preserving focus and avoiding repeated entrance animations. Content remains immediately usable; reading transitions preserve contrast. Navigation remembers each section's scroll position. Cards and controls have quiet hover, press and keyboard-focus feedback. Exact metric values update immediately, without fabricated intermediate counts. Statistic bars animate with transforms.

Native dialogs retain their content through entrance/exit, restore opener focus, contain keyboard focus, lock background scrolling, support Escape and backdrop dismissal, and preserve mobile safe areas. Catch Me Up retains the verified briefing while narration loads, with a restrained progress line and a short reveal when a verified result arrives.

## Replay and event integrity

Replay runs in an isolated component. Its elapsed-time clock is independent of the held match cutoff. A 100ms UI sample updates the visible event set and replay clock; a single cancellable animation-frame loop reads the same time source to position the ball and draw its active path. The match's statistics and AI computations do not rerender at animation-frame frequency.

- Play, pause, restart, seek, change speed and choose an already-revealed event.
- Pause and seek commit an immediate authoritative time sample. Changing speed preserves fractional progress.
- Later markers disappear on rewind. Simultaneous events appear together. The final frame remains visible.
- Dialogs, other sections and hidden browser tabs suspend replay without consuming unseen playback time.
- Recorded recoveries/interceptions, shots and goals have different restrained emphasis. The goal banner is explicitly labeled as a recorded goal.
- Ball travel is a schematic interpolation of one event's recorded endpoints, over the interval until the next recorded event. It is **not measured travel time or continuous tracking**. We never interpolate between unrelated actions, possessions or player locations.
- Every replay event is first filtered at the held match cutoff. Animation does not change scores, event times, outcomes, possession IDs or inference inputs.
- Live match playback now derives elapsed time from a monotonic clock and stops on backgrounding.

## Accessibility and review

Reduced motion disables CSS movement, backdrop transitions and imperative animation; recorded actions still advance and remain inspectable. A change to the preference cancels an in-flight ball animation. The replay clock is not an incessant live region; score updates have a polite atomic announcement and replay state remains written in text.

The review includes desktop, 390px/360px touch viewports, 320px layouts, keyboard marker selection, focus trapping/restoration, native dialog transitions, rapid mode/tab changes, pause mid-pass, rewind and stale-animation cancellation. Accessibility scans run on the fully presented dialogs so transient entrance opacity does not distort contrast measurements.

## Recordings and reproducibility

The before recordings were captured from the preserved visual-identity checkpoint, before motion edits. The after recordings use the local production build.

| View    | Before                          | After                               |
| ------- | ------------------------------- | ----------------------------------- |
| Desktop | [Baseline](before-desktop.webm) | [Motion review](after-desktop.webm) |
| Mobile  | [Baseline](before-mobile.webm)  | [Motion review](after-mobile.webm)  |

[Desktop still](after-desktop.png) · [Mobile still](after-mobile.png) · [Measured performance](performance.json)

To regenerate the after recordings and performance observations, run a production build and server on port 3101, then `node scripts/review-motion.mjs`. `MOTION_REVIEW_URL` can select another local server. The script uses only synthetic match data and does not request AI narration.

## Practical limits and follow-up

The performance sample is a local headless-browser diagnostic, not a guarantee for physical mobile hardware. Follow up with a representative low-end Android and physical iPhone, including VoiceOver/TalkBack and battery profiling. Chromium touch viewports are supplemented by a WebKit 320px smoke review, not a full physical iOS test suite. Older browsers without discrete dialog transitions retain immediate functional closing. There is intentionally no player tracking or invented trajectory between event locations.

## Validation results

- TypeScript and production build pass.
- Unit tests: 115 pass locally; the Redis integration test is intentionally skipped when no Redis test service is configured. CI supplies Redis.
- Production Chromium browser suite: 60 pass across desktop, Android-sized touch and iPhone-sized touch projects. Includes all existing tests and 21 new motion checks.
- Axe WCAG 2 A/AA and 2.1 AA scans pass across the main screens and dialogs, including the 320px recap.
- WebKit smoke review at 320px passes with motion enabled and reduced: replay pause/seek, modes, dialog closing, player selection and no horizontal overflow.
- Final production recordings and raw frame/long-task/layout-shift measurements are included alongside this document.

The final 5.2-second replay samples recorded median **16.7ms** and p95 **16.8ms** frame intervals in both views, with **zero frames over 34ms** and **zero long tasks**. Measured unexpected layout-shift sums were 0.000013 on desktop and 0.000502 at the mobile viewport with 4× CPU slowdown. These small samples support the local smoothness review; they are not field performance or battery measurements.
