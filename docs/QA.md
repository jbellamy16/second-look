# OpenAI local evaluation follow-up — October 9, 2026

- Fixed local evaluation configuration loading under Vitest; shell overrides still win and the local file cannot authorize spending.
- Added `npm run ai:check`, which reports presence only and sends no network requests.
- Four owner-authorized OpenAI requests returned HTTP 200. Both recaps fell back during application validation, so accepted live narration remains unverified.
- Recorded 6,117 input tokens and 586 output tokens; estimated standard-rate cost $0.00722475. Actual billing was not inspected.
- Hardened nullable response-envelope handling and added safe validation-stage diagnostics and completed tool activity. Exact cause of the first rejections was not retained by the original report; a repeat needs a fresh request allowance.
- Type checks, 107 local tests, production build and 30 production browser journeys pass. CI additionally checks real Redis.
- Normal inference remains disabled; credentials stay in ignored `.env.local`. No deployment occurred.

The implementation and Phase 2 records below describe their earlier verification state.

# Multi-provider AI verification — October 9, 2026

- Type checks, all existing tests and the production build pass.
- 100 local unit/evaluation tests pass; the real Redis integration test is reserved for CI or a supplied disposable `REDIS_TEST_URL`.
- The evaluation report contains 180 mocked cases across scenarios, seeds, timestamps, modes and providers. No live model-quality claim is made.
- 30 production browser journeys pass across desktop, iPhone-sized and Android-sized Chromium. Includes expanded evidence accessibility, actual provider labels, on-demand requests and stale-result removal.
- “How Second Look knows” remains inside the existing insight card and recap. The scrollable evidence region is keyboard focusable and passes the included axe checks.
- Reviewed the generated screenshots: [desktop evidence](screenshots/ai-desktop-evidence.png), [mobile recap](screenshots/ai-mobile-recap.png), [mobile evidence](screenshots/ai-mobile-evidence.png).
- Zero live model requests and $0 actual inference cost for this implementation. Human semantic review and authorized live evaluation remain pending; see [the evaluation protocol](AI-EVALUATION.md).
- No public deployment, API enablement or paid resource creation.

The earlier Phase 2 evidence below is retained for reference.

# Phase 2 verification — October 9, 2026

## Automated checks

- TypeScript and Next.js route types pass.
- 28 unit/contract tests pass: deterministic scenarios and prefixes, active players, connected passes/carries/shots, foul/corner restarts, goal accounting, API fallback, Foundry evidence and endpoint checks, and brand export dimensions.
- Production build and standalone asset packaging pass.
- 24 Playwright journeys pass against the production standalone server: desktop Chromium (1440×1100), iPhone-sized Chromium (390×664, Playwright iPhone 13 profile), and Android-sized Chromium (360×800, Pixel 7 touch profile).
- All five main screens and both dialogs pass the included axe WCAG A/AA checks. Automated checks are not a complete accessibility certification.
- No page or console errors in the primary playback journey; main-screen overflow, dialog overflow, navigation, replay, preferences, recap, keyboard/touch selection, and metadata requests are covered.
- Supplied logo, favicon, Apple icon, maskable icon and social files were compared byte-for-byte with the owner's kit. OG: 1200×630. X: 1200×675.

## Visual review

Reviewed match centre, insight list, Fan and Analyst presentations, evidence selection and replay, statistics, lineups, player focus, Catch Me Up and preferences. Production screenshots:

- [Desktop](screenshots/desktop-match.png)
- [iPhone-sized Chromium](screenshots/iphone-match.png)
- [Android-sized Chromium](screenshots/android-match.png)

Replay intervals come from event timestamps, presented at 8×. Selecting evidence chooses that possession; completion keeps the final frame. The build-up preset starts at 60:00 at 16× and reveals evidence-derived observations. Reset restores the 63:24 demonstration and default preferences.

## Remaining external validation

- Foundry credentials and live inference are not configured or verified. Tests use clearly separated mocks; the application retains its deterministic fallback.
- No physical Safari device testing was performed. Real-device Safari, screen-reader use and external social preview crawlers need a hosted release.
- Hosting remains unconfigured. Set `NEXT_PUBLIC_SITE_URL` before a hosted build. Cloudflare/OpenAI were discussed as an interim option, but no migration, deployment or paid resources were created.
- The event feed models discrete possessions, not continuous tracking. Stoppages, added time and halftime breaks remain simplified. Pattern thresholds are descriptive, not tests of statistical significance.
