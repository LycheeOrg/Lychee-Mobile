# Feature 004 – Photo Viewer

| Field | Value |
|-------|-------|
| Status | Ready |
| Last updated | 2026-10-19 |
| Owners | mlapaglia |
| Linked plan | [plan.md](plan.md) |
| Linked tasks | [tasks.md](tasks.md) |
| Roadmap entry | #004 |

> Guardrail: This specification is the single normative source of truth for the feature. Track high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), encode resolved answers directly in the Requirements/NFR/Behaviour/UI/Telemetry sections below (no per-feature `## Clarifications` sections), and use ADRs under `docs/specs/6-decisions/` for architecturally significant clarifications (referencing their IDs from the relevant spec sections).

## Overview
Tapping a photo in an album (Feature 003) opens it full screen. The user swipes left and right through the album's photos, zooms into details, plays videos, and plays the motion of live and motion photos. Everything the viewer shows is already in `Album::photos` (size-variant URLs, `live_photo_url`, type); Lychee v2 has no single-photo endpoint, so the viewer is a full-screen modal over the album page and works from that page's photo list (Q-004-04). Swiping, zooming and keeping only nearby slides in the DOM use Swiper 14.3.0 (ADR-004-01), the only new dependency.

## Goals
- Open any photo from an album grid and see it full screen, quickly.
- Swipe through the whole album, loading further pages as needed.
- Zoom into photos; play videos; play live and motion photos.

## Non-Goals
- Photo details (EXIF, map, tags), editing, rating, deleting, downloading, sharing.
- Slideshow, 360° panoramas (shown as flat images), PDF pages.
- Deep links to single photos (Q-004-04).
- Apple's LivePhotosKit (Q-004-03).
- Immersive full screen that hides the system status bar (needs a plugin; later).

## Functional Requirements

| ID | Requirement | Success path | Validation path | Failure path | Telemetry & traces | Source |
|----|-------------|--------------|-----------------|--------------|--------------------|--------|
| FR-004-01 | Open and close. | Tapping a photo tile opens a full-screen `ion-modal` over the album page on that photo, given the album page model's photos, photo total, `hasMore` and `loadMore` (Q-004-04). The close button and Android's back button close it; the album grid then scrolls the last viewed photo into view. | — | — | None (no analytics in the PoC). | Roadmap 004 |
| FR-004-02 | Swipe. | Swiper with the Virtual module (slides rendered by Vue through `renderExternal`): a horizontal swipe moves to the previous or next photo, in the grid's order; only the current slide and one on each side exist in the DOM. When the current photo is within 3 of the last loaded one and the album has more, the album page model loads its next page (FR-003-02) and the new photos are appended to the slides. | First and last photo of the album: no further swipe (no loop). | Next page fails → swiping stops at the last loaded photo; the grid shows its Retry (FR-003-02) after closing. | — | Q-004-01, ADR-004-01 |
| FR-004-03 | Image. | The display image is the first available of `medium2x` (device pixel ratio > 1) or `medium`, then `original`, `small2x`, `small`, `thumb2x`, `thumb`. When the zoom scale passes 1.5× and `original` has a URL, the image switches to `original` for that photo while the viewer stays open. The thumbnail is shown, scaled, until the image has loaded. Black background; the photo fits the screen (contain). | No displayable variant (raw files) → "This file can't be shown." | Image error → the thumbnail stays with "Couldn't load this photo." | — | Q-004-02 |
| FR-004-04 | Zoom. | Swiper's Zoom module: pinch and double tap zoom up to 4×, double tap again returns to 1×; a drag pans while zoomed, and a drag that starts at the image's edge moves to the neighbouring photo (Swiper's behaviour, as iOS Photos). Leaving a slide resets its zoom. | Videos and raw files don't zoom. | — | — | Q-004-01, ADR-004-01 |
| FR-004-05 | Video. | Videos show a `<video>` with the original's URL, `controls`, `playsinline`, poster from `small`/`thumb`; playback starts when the user taps play, with sound; leaving the slide pauses it. | — | Video error → "This video can't be played on this device." | — | — |
| FR-004-06 | Live photos. | Photos with `live_photo_url` show a "LIVE" badge. Pressing and holding the photo for 300 ms (without moving more than 10 px) plays the clip in a muted, `playsinline` `<video>` over the still, looping while held; releasing, moving or swiping stops it and shows the still again. The long-press menu of the image is suppressed. | Not while zoomed. | Clip error → the still stays, no message. | — | Q-004-03 |
| FR-004-07 | Chrome. | A tap toggles the overlay: close button, the photo's title, and "n of total" (total from the album's photo count). The overlay starts visible. | — | — | — | — |

## Non-Functional Requirements

| ID | Requirement | Driver | Measurement | Dependencies | Source |
|----|-------------|--------|-------------|--------------|--------|
| NFR-004-01 | Swiping stays smooth through a 500-photo smart album on the Pixel 11 Pro; only the slides around the current one exist in the DOM. | Usability, memory. | Manual check; DOM inspection. | Q-004-01 | — |
| NFR-004-02 | The first image of a swipe appears within 1 s on Wi-Fi for a `medium` variant. | Usability. | Manual check. | Q-004-02 | — |
| NFR-004-03 | Choosing the variant, the slide model and paging are pure functions or stores tested in jsdom; components only render. | Testability. | Vitest. | — | NFR-003-03 |
| NFR-004-04 | Swiper is the only new dependency, pinned to exactly `14.3.0`, with the owner's approval recorded in the plan. | AGENTS.md. | `package.json` diff. | ADR-004-01 | Q-004-01 |

## UI / Interaction Mock-ups


```
 Viewer, overlay visible             Zoomed (pinch / double tap)        Live photo (press and hold)
┌──────────────────────────────┐    ┌──────────────────────────────┐   ┌──────────────────────────────┐
│ ✕   Beach            12 of 104│   │                              │   │ ✕   Sparkler     14 of 104   │
│                              │    │   ┌──────────────────────┐   │   │ ◎ LIVE                       │
│                              │    │   │                      │   │   │                              │
│  ┌────────────────────────┐  │    │   │   (detail, panned)   │   │   │  ┌────────────────────────┐  │
│  │                        │  │    │   │                      │   │   │  │   clip plays, muted,   │  │
│  │        photo           │  │    │   │                      │   │   │  │   while held           │  │
│  │                        │  │    │   └──────────────────────┘   │   │  └────────────────────────┘  │
│  └────────────────────────┘  │    │                              │   │                              │
│        ‹ swipe ›             │    │                              │   │                              │
└──────────────────────────────┘    └──────────────────────────────┘   └──────────────────────────────┘
 Video: native controls, tap play.   Raw file: "This file can't be shown."
```

## Branch & Scenario Matrix

| Scenario ID | Description / Expected outcome |
|-------------|--------------------------------|
| S-004-01 | Tap a photo → viewer opens on it; close → back on the grid at that photo. |
| S-004-02 | Swipe through the album → next/previous in grid order; the next page loads near the end. |
| S-004-03 | First / last photo → no swipe beyond. |
| S-004-04 | Pinch and double tap zoom; drag pans; a drag from the image's edge moves to the next photo; leaving a slide resets its zoom; past 1.5× the original loads. |
| S-004-05 | Video → plays with controls on tap; swiping away pauses it. |
| S-004-06 | Live photo → LIVE badge; hold plays the clip muted; release stops it; a swipe during the hold cancels it. |
| S-004-07 | Raw file → message; image error → thumbnail with message. |
| S-004-08 | Photo without original access → shown from `medium`; zoom stays on `medium`. |
| S-004-09 | Tap → overlay hides and shows. |
| S-004-10 | Android back → viewer closes. |

## Test Strategy
- **Units (Vitest):** variant choice by pixel ratio and zoom; slide helpers ("n of total", when to load the next page); the press-and-hold detector (delay, movement tolerance, release, cancel) with fake timers.
- **Store:** the album page model exposes the photo total.
- **Parsers:** `PhotoTile` gains the variants the viewer needs (`medium`, `medium2x`, `original`, `small`, sizes, `live_photo_url`), against the existing fixtures.
- **Native:** Pixel 11 Pro and iPhone: swipe through a large album (NFR-004-01), zoom and the original swap, a video, a live photo, Android back. Swiper's gestures themselves are not unit-tested (jsdom has no layout).

## Interface & Contract Catalogue

### Domain Objects
| ID | Description | Modules |
|----|-------------|---------|
| DO-004-01 | `PhotoTile` extended with `variants` (`{ url, width, height }` or `null` for `medium2x`, `medium`, `original`, `small2x`, `small`, `thumb2x`, `thumb`) and `liveUrl: string \| null`. | `src/services/galleryParsers.ts` |
| DO-004-02 | `Page<T>` gains `total` (the album's item count). | `src/services/galleryParsers.ts` |

### API Routes / Services
No new Lychee calls: `Album::photos` (API-003-04) already carries the data, including `total`.

### Native Capabilities
| ID | Plugin / permission | Behaviour |
|----|---------------------|-----------|
| NC-004-01 | None | Android's back button closes the modal through Ionic's overlay handling. |

## Telemetry & Observability
None in the proof of concept.

## Documentation Deliverables
- Roadmap row 004; knowledge map: viewer components and models.
- ADR-004-01 (Swiper).
