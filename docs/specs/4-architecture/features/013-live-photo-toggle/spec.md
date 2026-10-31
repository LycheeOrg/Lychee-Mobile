# Feature 013 – Live Photo Toggle

| Field | Value |
|-------|-------|
| Status | Testing |
| Last updated | 2026-10-30 |
| Owners | mlapaglia |
| Linked plan | [plan.md](plan.md) |
| Linked tasks | [tasks.md](tasks.md) |
| Roadmap entry | #013 |

> Guardrail: This specification is the single normative source of truth for the feature. Track high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), encode resolved answers directly in the Requirements/NFR/Behaviour/UI/Telemetry sections below (no per-feature `## Clarifications` sections), and use ADRs under `docs/specs/6-decisions/` for architecturally significant clarifications (referencing their IDs from the relevant spec sections).

## Overview
In the viewer, live and motion photos play their clip only while the photo is pressed and held (FR-004-06). The owner asked (2026-10-30) for the "LIVE" label to become a button: a tap starts the clip looping, a second tap shows the still again. This replaces press and hold.

## Goals
- Watch a live or motion photo's clip without keeping a finger on the screen.

## Non-Goals
- Sound (the clip stays muted), autoplay on open, a setting to choose between hold and tap.

## Functional Requirements

| ID | Requirement | Success path | Validation path | Failure path | Telemetry & traces | Source |
|----|-------------|--------------|-----------------|--------------|--------------------|--------|
| FR-013-01 | The LIVE label is a toggle button. | Photos with `live_photo_url` show a "◎ LIVE" button (`aria-pressed`). Tapping it plays the clip in a muted, `playsinline`, looping `<video>` over the still and fills the button white at once; the clip stays invisible (`opacity: 0`) until its `playing` event, so the still shows until the first frame and the WebView's empty-video placeholder (a grey square with a play icon on Android) never appears; tapping it again removes the clip and shows the still. Taps on the button are neither swipes nor viewer taps (Swiper's `swiper-no-swiping`), so they don't toggle the overlay or zoom. Press and hold on the photo no longer plays the clip; its long-press menu stays suppressed. | While zoomed the button is disabled (dimmed); zooming in stops the clip. Swiping to another photo stops the clip; coming back shows the still. | Clip error → the still and the button returns to off, no message. | — | Owner 2026-10-30; amends FR-004-06 |

## Non-Functional Requirements

| ID | Requirement | Driver | Measurement | Dependencies | Source |
|----|-------------|--------|-------------|--------------|--------|
| NFR-013-01 | Each branch of FR-013-01 has a component test that fails without it. | Test-first. | Vitest (`PhotoSlide.test.ts`). | — | AGENTS.md |

## UI / Interaction Mock-ups

```
 Live photo, still                   Live photo, playing                 Zoomed
┌──────────────────────────────┐    ┌──────────────────────────────┐    ┌──────────────────────────────┐
│ ✕   Sparkler     14 of 104   │    │ ✕   Sparkler     14 of 104   │    │                              │
│ (◎ LIVE)  ← tap: play        │    │ [◎ LIVE]  ← white; tap: stop │    │ (◎ LIVE)  ← dimmed, disabled │
│                              │    │                              │    │   ┌──────────────────────┐   │
│  ┌────────────────────────┐  │    │  ┌────────────────────────┐  │    │   │   (detail, panned)   │   │
│  │        still           │  │    │  │  clip loops, muted     │  │    │   │                      │   │
│  └────────────────────────┘  │    │  └────────────────────────┘  │    │   └──────────────────────┘   │
└──────────────────────────────┘    └──────────────────────────────┘    └──────────────────────────────┘
```

The tablet layout is the same.

## Branch & Scenario Matrix

| Scenario ID | Description / Expected outcome |
|-------------|--------------------------------|
| S-013-01 | Live photo → tap LIVE → clip loops, button white; tap again → still, button off. |
| S-013-02 | Clip playing → swipe to the next photo and back → still, button off. |
| S-013-03 | Clip playing → pinch or double tap to zoom → still; LIVE dimmed and inert until zoomed out. |
| S-013-04 | Clip fails to load → still, button off. |
| S-013-05 | Tap or double tap LIVE → the overlay doesn't toggle and the photo doesn't zoom (device check). |
| S-013-06 | Press and hold the photo → nothing plays, no image menu. |
| S-013-07 | Tap LIVE → the still stays until the clip plays, then the clip replaces it with no grey square or play icon in between. |

## Test Strategy
- **Component (Vitest):** `src/components/PhotoSlide.test.ts` covers S-013-01 … 04, 06 and 07, the `swiper-no-swiping` class, and no button without a clip.
- **Native:** S-013-05 on the Pixel and the iPhone (Swiper's touch handling isn't simulated in jsdom).

## Interface & Contract Catalogue
No API, store or native change.

## Telemetry & Observability
None.

## Documentation Deliverables
- Roadmap row 013; knowledge map entry for `PhotoSlide`; amendment note in the Feature 004 spec.
