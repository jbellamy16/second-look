# Phase 6 release evidence

October 9, 2026. Screenshots show the actual interface and local recorded data,
with inference disabled. Historical screenshots are at Arsenal–Leicester 30:00;
final-score spoilers remain off. The dark screenshot is a 320px viewport with
reduced motion enabled. The existing local hover stylesheet was preserved during
capture and is not part of this feature's commit.

- [Synthetic source selector, desktop](synthetic-desktop.png)
- [Real Match source selector and replay, desktop](real-match-desktop.png)
- [Real Match, Android-sized screen](real-match-android.png)
- [Real Match, iPhone-sized screen](real-match-iphone.png)
- [Real Match, dark appearance at 320px](real-match-dark-320.png)
- [Reproducible offline evaluation](evaluation.json)
- [Data, rights, architecture and limitations](../HISTORICAL-DATA.md)
- [OpenAI configuration, allowance and AI evaluation](../PHASE-6-AI.md)

No paid API calls or hosted deployment were made for this phase. Historical live
model quality/latency and billing remain unmeasured. The OpenAI key was present
locally, inference remained disabled, and a client-bundle scan found no local key.
Production inference requires the existing shared usage-store controls.
