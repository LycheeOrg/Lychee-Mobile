# Feature Plan 013 – Live Photo Toggle

_Linked specification:_ [spec.md](spec.md)  
_Linked tasks:_ [tasks.md](tasks.md)  
_Status:_ Testing  
_Last updated:_ 2026-10-30

> Guardrail: Keep this plan traceable back to the governing spec. Reference FR/NFR/Scenario IDs from `spec.md` where relevant, log any new high- or medium-impact questions in the feature's [open-questions.md](open-questions.md), and assume clarifications are resolved only when the spec's normative sections and, where applicable, ADRs under `docs/specs/6-decisions/` have been updated.

## Vision & Success Criteria
A tap on LIVE plays the clip until the next tap (FR-013-01).

## Scope Alignment
- **In scope:** FR-013-01 in `PhotoSlide.vue`.
- **Out of scope:** sound, autoplay, other viewer changes.

## Dependencies & Interfaces
- None new. `pressAndHold.ts` stays (grid selection, Feature 007).

## Assumptions & Risks
- **Assumption:** Swiper's default `noSwiping` (`swiper-no-swiping`) skips its touch handling for the button, so no `tap`/`doubleTap` reaches the overlay toggle or Zoom (S-013-05, device check).

## Increment Map
1. **I1 – Toggle button** (FR-013-01): failing `PhotoSlide.test.ts`, then the button replaces press and hold.
2. **I2 – Device check and docs** (S-013-05, S-013-06).

## Analysis Gate
Run 2026-10-30 by the agent: one FR with success, validation and failure paths; no open questions; tests precede code; no dependency, permission or native change.

## Intent Log
- 2026-10-30: owner asked for the LIVE label to toggle a looping clip instead of press and hold. The agent read `PhotoSlide.vue` (hold handlers on the zoom container, badge with `pointer-events: none`) and `PhotoViewer.vue` (Swiper `tap` toggles the overlay, `doubleTap` zooms). New `PhotoSlide.test.ts` (7 cases) red against the old component, then the badge became a `<button class="swiper-no-swiping">` with `aria-pressed`; the hold handlers and `onBeforeUnmount` were removed. While writing the test, an attempt to pass `clientX` through `trigger()` threw in jsdom and looked like a failing test. The agent removed the coordinates and checked the red again.
