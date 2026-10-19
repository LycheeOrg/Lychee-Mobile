# Feature Plan 004 – Photo Viewer

_Linked specification:_ [spec.md](spec.md)  
_Linked tasks:_ [tasks.md](tasks.md)  
_Status:_ Complete  
_Last updated:_ 2026-10-19

> Guardrail: Keep this plan traceable back to the governing spec. Reference FR/NFR/Scenario IDs from `spec.md` where relevant, log any new high- or medium-impact questions in the feature's [open-questions.md](open-questions.md), and assume clarifications are resolved only when the spec's normative sections and, where applicable, ADRs under `docs/specs/6-decisions/` have been updated.

## Vision & Success Criteria
Tapping a photo opens it full screen; the user swipes through the whole album, zooms into details, plays videos and holds live photos to see them move. Success: on the Pixel 11 Pro and an iPhone, swiping through a large smart album stays smooth, zoom swaps in the original, videos and live photos play, and Android back closes the viewer.

## Scope Alignment
- **In scope:** FR-004-01 … 07, NFR-004-01 … 04.
- **Out of scope:** spec Non-Goals (details panel, editing, download/share, slideshow, deep links, immersive status bar).

## Dependencies & Interfaces
- **New dependency:** `swiper` `14.3.0`, pinned exactly. **Approved by the owner on 2026-10-19** (Q-004-01 Option A, "A for all four"). Rationale in ADR-004-01. Installed with `npm install --save-exact swiper@14.3.0`; `package-lock.json` gained only `node_modules/swiper`.
- Feature 003's album page model and `Album::photos` (API-003-04).

## Assumptions & Risks
- **Assumptions:** Swiper's Zoom and Virtual modules work together with `renderExternal` (documented pattern).
- **Risks / Mitigations:**
  - _Swiper gestures untestable in jsdom_ → logic kept outside the component and tested; gestures checked on devices.
  - _Video codecs_ (HEVC `.mov` on Android WebViews) → error message (FR-004-05); Lychee transcodes Google motion clips already (PR #4900).
  - _Press and hold vs swipe_ → 10 px movement tolerance cancels the hold.

## Implementation Drift Gate
After T-004-10: map FR/NFR/S IDs to tests, rerun the quality gate, record findings below.

## Increment Map
1. **I1 – Data** (DO-004-01, 02): failing parser and album page tests for variants, `liveUrl`, `total` → implementation.
2. **I2 – Helpers** (FR-004-02, 03, 06, 07): failing tests for `displayVariant()`/`zoomVariant()`, `counterText()`/`shouldLoadMore()`, `createPressAndHold()` → `src/utils/photoVariant.ts`, `src/utils/viewerSlides.ts`, `src/utils/pressAndHold.ts`.
3. **I3 – Viewer** (FR-004-01 … 07): `PhotoViewer.vue` (Swiper with Zoom and Virtual), `PhotoGrid` tap, `AlbumPage` modal and scroll-back.
4. **I4 – Device checks** (S-004-01 … 10, NFR-004-01, 02).
5. **I5 – Docs and drift gate.**

_Commands for every increment:_ `npx vp test <file>`, `npx vp check`, `npx vp run typecheck`; I3–I4 also `npx vp run build`, `npx cap sync`.

## Scenario Tracking

| Scenario ID | Increment / Task reference | Notes |
|-------------|---------------------------|-------|
| S-004-01, 10 | I3 / T-004-07; I4 | |
| S-004-02, 03 | I2 / T-004-04; I3; I4 | paging decision unit-tested |
| S-004-04 | I2 (variant swap); I4 | gestures on devices only |
| S-004-05, 07, 08 | I2, I3; I4 | |
| S-004-06 | I2 (press and hold); I4 | |
| S-004-09 | I3; I4 | |

## Analysis Gate

Run 2026-10-19 by the agent.
1. Specification completeness — ✅ FR/NFR complete; Q-004-01 … 04 folded in; ASCII mock-ups present.
2. Open questions review — ✅ none open; ADR-004-01 written.
3. Plan alignment — ✅ plan links spec and tasks; success criteria match.
4. Tasks coverage — ✅ every FR has tasks; tests precede code where the logic is testable; failure branches listed (S-004-03, 07, 08).
5. Working-agreement compliance — ✅ dependency approved and recorded above; ADR-003-01/02 reviewed.
6. Tooling readiness — ✅ commands above; Pixel 11 Pro; iOS through Xcode.

**Outcome:** cleared for implementation.

## Exit Criteria
- All tasks `[x]`; quality gate green; device checks recorded including NFR-004-01.
- Knowledge map and roadmap updated; drift gate recorded.

## Follow-ups / Backlog
- Photo details (EXIF, map), download and share.
- Immersive full screen (`@capacitor/status-bar`, needs approval).
- Capacitor's bridge logs plugin results in debug builds (`loggingBehavior` default `debug`), which puts `XSRF-TOKEN` values in logcat; no session cookie or password appeared (checked 2026-10-19). Release builds don't log. Revisit if debug builds are shared.

## Intent Log
- 2026-10-19: owner asked to start Feature 004 after merging 003. The agent read Lychee's web `PhotoBox.vue` (medium with original fallback, `<video>` for videos, LivePhotosKit for live photos, no single-photo endpoint), looked up Swiper 14.3.0, and drafted Q-004-01 … 04. Owner chose Option A for all four, approving Swiper. The agent installed it pinned and read its Virtual (`renderExternal`) and Zoom (edge hand-over to swiping) source before finalising FR-004-02 and FR-004-04. Implemented test-first where the logic is testable: variants, live URL and totals in the parsers and album page model, `photoVariant`, `viewerSlides`, `pressAndHold`, and `singleTap` (added while wiring Swiper, whose `tap` fires for both taps of a double tap). `PhotoViewer.vue`/`PhotoSlide.vue` render Swiper's virtual slides through `renderExternal` with `renderExternalUpdate: false`. 277 Vitest tests. The owner ran the device checklist on the Pixel 11 Pro and an iPhone and reported everything working.

## Drift Gate Report

Run 2026-10-19 by the agent; owner confirmed the device checks the same day.

**Preconditions:** 11/11 tasks `[x]` (plus T-004-00); `npx vp check`, `npx vp run typecheck`, `npx vp test` (21 files, 277 tests), `npx vp run build` green; `package.json` adds only `swiper` `14.3.0` (approved); Android build installed on the Pixel 11 Pro; iOS run from Xcode by the owner.

| Requirement | Code | Evidence |
|-------------|------|----------|
| FR-004-01 | `AlbumPage.vue` modal, `PhotoGrid` tap, `viewerClosed()` | devices: open, close, Android back, scroll back |
| FR-004-02 | `PhotoViewer.vue` (Virtual), `shouldLoadMore()` | `viewerSlides.test.ts`; fast swiping past the first page on the Pixel |
| FR-004-03 | `displayVariant()`, `zoomVariant()`, `PhotoSlide.vue` | `photoVariant.test.ts`; sharper original after zoom on devices |
| FR-004-04 | Swiper Zoom | devices (pinch, double tap, pan, edge hand-over) |
| FR-004-05 | `videoSource()`, `videoPoster()`, `PhotoSlide.vue` | `photoVariant.test.ts`; video pauses on swipe |
| FR-004-06 | `createPressAndHold()`, `PhotoSlide.vue` | `pressAndHold.test.ts` (6); live/motion photo on devices |
| FR-004-07 | `counterText()`, `createSingleTap()`, overlay | `viewerSlides.test.ts`, `singleTap.test.ts`; no flash on double tap |
| NFR-004-01 | Virtual module (current ± 1 slide) | smooth swiping in a large smart album |
| NFR-004-02 | medium variants first | manual, Wi-Fi |
| NFR-004-03 | helpers in `src/utils/` | 4 helper test files |
| NFR-004-04 | `swiper` pinned `14.3.0` | `package.json`, owner approval above |
| DO-004-01, 02 | parsers, album page `photoTotal` | parser and model tests |

**Not exercised on a device:** S-004-07 (raw file, image error) and S-004-08 (no original access) are unit-tested through the variant helpers only.

**Divergences:** `src/utils/singleTap.ts` was added during T-004-07 (logged in tasks); FR-004-04 was written to Swiper's edge hand-over before implementation. No behavioural drift.

**Lessons:**
- Read the dependency's source before specifying gestures: Swiper's zoom hands over to swiping at the image's edge and its `tap` fires twice for a double tap; both changed the spec or added a helper.
- Capacitor's bridge logs plugin results in debug builds (backlog note above).
