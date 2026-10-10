# Between the Lines — submission preparation

## Project pitch

More than the score. Between the Lines is an AI-assisted second-screen football experience that turns a synthetic live match into clear, evidence-linked stories. Discover what is changing, replay the events behind it, and switch between a fan’s explanation and an analyst’s view—all without losing your place in the match.

## Technical description

A seeded event generator drives fictional football fixtures. A single timestamp gates every calculation, visualization, and recap. Statistical rules identify meaningful changes in high ball wins, shot frequency, and passing activity. Each observation carries exact evidence IDs and comparable time windows. An optional Microsoft Foundry workflow requires the model to retrieve verified evidence through a function tool before producing structured, audience-specific narrative. Both Foundry and the OpenAI alternative use verified statement selection; schema, exact fact IDs, required context and server-rendered wording validate the result; failures retain a clearly labeled deterministic explanation.

The frontend is Next.js, React, TypeScript, Tailwind/CSS, and an interactive SVG pitch. Deployment preparation targets an existing Azure App Service using GitHub Actions and Next.js standalone output. The offline demo needs no database; public AI requires shared Redis usage controls.

## Microsoft technology summary

- **Microsoft Foundry:** implemented server-side Azure OpenAI Responses API adapter, tool retrieval, structured output, and validation. Real deployment credentials and a successful live call remain required.
- **Azure App Service:** prepared manual deployment workflow; not deployed yet.
- **GitHub:** source repository, pull request workflow, CI, tests, and deployment automation.
- Do not claim Azure hosting, managed identity, Foundry Agent Service, autonomous multi-agent collaboration, Fabric, or Copilot usage unless separately implemented and verified.

## Category and judging fit

Primary: overall prize. Secondary: Best Use of Microsoft Foundry.

| Criterion                     | Demonstrable evidence                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Technological implementation  | Reproducible feed, one playback clock, prefix-invariance tests, server validation                           |
| Agentic design and innovation | Required model evidence retrieval followed by structured explanation; deterministic verification boundaries |
| Real-world impact             | A second-screen explanation that can be traced back to the match; future licensed-feed adapter boundary     |
| UX and presentation           | Responsive pitch-first design, sequence replay, fan/analyst switch, concise recap                           |
| Category alignment            | Synthetic football data transformed into evidence-linked narratives through Microsoft AI                    |

Foundry can select and order verified context for an insight or recap. OpenAI supports the same workflow while Foundry access is unavailable; always identify the actual provider. To strengthen the Foundry category entry, validate real narration quality and demonstrate the tool handoff visibly. Do not describe offline rules as model reasoning.

## Repeatable demo setup

1. Use a production build at a 1440×1000 or larger desktop viewport. Test mobile separately.
2. Select **Reset demo**. This restores the pressure fixture, Fan mode, neutral preferences, all categories, and the default playback speed.
3. At 63:24 Harbor leads 1–0. The generator seed is 202632. High ball wins and shots are detected from the event prefix.
4. Select **Watch the build-up** to start at 60:00 at 16×. The pressure observation appears at about 60:40, followed by the shots observation around 61:20. Both are calculated from events, not scripted insight text.
5. Select the high-ball-win insight. Compare current and previous windows. Inspect Evidence, select a recovery, then **Show me the sequence**. The replay follows that possession at 8× recorded timing and holds the final frame.
6. Switch to Analyst mode for event IDs, measurement notes, and equal-duration comparisons.
7. With real Foundry configured, select **Explain with Microsoft Foundry** and wait for the explicitly labeled response. Rehearse request latency; successful exact-input requests are cached.
8. Open **Catch me up**. The recap includes score, significant observed events, the leading current pattern, and what to watch. It opens instantly with a deterministic recap; optional on-demand AI selects verified statements. Expand **How Between the Lines knows** to inspect evidence and actual tool activity.
9. Optional: rewind to kickoff to show future evidence disappears, or choose the quiet scenario to show that the system does not invent a story.

## Suggested 90-second video

**0–12 seconds — the value**

“More than the score. Between the Lines turns football events into stories you can understand—and verify.” Show the match centre and an emerging pattern.

**12–30 seconds — the observation**

“Harbor are winning the ball higher up the pitch. Every number comes from the synthetic event stream, with a comparable earlier window.” Open the insight and show the two pitch maps.

**30–45 seconds — evidence in motion**

“Follow the observation back to its evidence. These are recorded actions, not invented player tracking.” Replay the sequence; select a supporting event.

**45–62 seconds — AI with a purpose**

“Microsoft Foundry retrieves verified match evidence through a tool before explaining the pattern. The server checks the response, while calculations stay deterministic.” Show a successfully returned and labeled real Foundry narrative. If credentials are absent or the request fails, do not record this claim as a working demonstration.

**62–76 seconds — two audiences**

“Fans get the story. Analysts get comparison windows, event-level evidence, and the limits of the data.” Switch modes, then show the timestamp-safe recap.

**76–90 seconds — close**

“Join late. Rewind. Follow your player. Between the Lines stays with your moment in the match. Football insights that go deeper. More than the score.” End on the pitch and tagline.

## Remaining submission steps

- [ ] Register as an individual by **October 20, 2026, noon Pacific (2 p.m. Central)**.
- [ ] Configure and verify real Foundry calls; review output quality and capture the actual tool workflow.
- [ ] Deploy to Azure and verify a publicly accessible, login-free URL. Keep judging access available through **November 10, 2026, 11:59 p.m. Pacific**.
- [ ] Review synthetic football realism, mobile Safari, and accessibility before final recording.
- [ ] Record a video **strictly under two minutes**, showing the application working. Avoid unlicensed trademarks, footage, music, and photos.
- [ ] Review dependency license obligations and ownership/eligibility requirements in the official rules.
- [ ] Supply public GitHub repository, working application URL, project pitch, Microsoft technology description, and public video URL.
- [ ] Obtain the owner’s approval before publishing the video or submitting the project.
- [ ] Submit by **October 27, 2026, 11:59 p.m. Pacific (October 28, 1:59 a.m. Central)**.

Source: [official Microsoft hackathon rules](https://github.com/microsoft/insidethegamehackathon/blob/main/OFFICIAL%20RULES.md), reviewed October 9, 2026. Recheck the official submission portal before entry.

## Copy for the project profile (manual update)

**Project name:** Between the Lines

**Tagline:** More than the score.

**Short description:** Football insights that go deeper. Between the Lines turns a synthetic match into clear, evidence-backed stories. Explore what is changing, replay the actions behind an observation, and switch between Fan and Analyst views without losing your place.

**Project description:** The score tells you what happened. Between the Lines helps you understand how the match is changing. It connects event-based observations to comparable time windows, pitch maps, individual actions, and sequence replays. Catch Me Up brings late arrivals back into the story; player preferences help surface relevant evidence. The demo uses fictional clubs and seeded synthetic data, with every view tied to the same match clock. Optional Microsoft Foundry and OpenAI adapters can retrieve verified evidence and select supporting statements; the server validates the response and retains deterministic explanations when AI is unavailable. No live professional feed or continuous tracking is claimed.

**Technology statement:** Next.js, React, TypeScript, interactive SVG, deterministic event analysis, optional server-side Microsoft Foundry / OpenAI Responses adapters, and shared Redis controls for public AI usage. Live Foundry validation and Azure deployment are separate readiness steps; this rebrand does not verify or claim them.

Use [the video title graphic](../public/brand/video-title.png), [current application screenshots](brand/REVIEW.md), and [brand guidelines](brand/README.md) for the recording and profile. The repository remains `jbellamy16/second-look`. Update Innovation Studio manually; no account changes or submission were made.
