# Open Questions – Feature 004

Open questions for [Feature 004](spec.md). Log every high- and medium-impact question here (table row + Question Details entry) before asking the user; see [open-questions-format.md](../../spec-guidelines/open-questions-format.md). Once answered, fold the outcome into [spec.md](spec.md) (and an ADR when architecturally significant), then mark the entry resolved.

## Active Questions

| Question ID | Feature | Priority | Summary | Status | Opened | Updated |
|-------------|---------|----------|---------|--------|--------|---------|
| ~~Q-004-01~~ | 004 – Photo viewer | High | How are swiping and zooming built? (A Swiper 14 with its zoom module, new dependency; B hand-written Pointer Events gestures; C swipe with Ionic gestures, no pinch zoom) | Resolved (Option A — Swiper 14.3.0 with Zoom and Virtual, dependency approved by the owner; owner, 2026-10-19; spec FR-004-02, FR-004-04, NFR-004-01, NFR-004-04; ADR-004-01) | 2026-10-19 | 2026-10-19 |
| ~~Q-004-02~~ | 004 – Photo viewer | Medium | Which image size is shown? (A `medium`/`medium2x` by pixel ratio, `original` once zoomed in; B always `original`; C `medium` only) | Resolved (Option A — `medium2x`/`medium` by pixel ratio, `original` past 1.5×; owner, 2026-10-19; spec FR-004-03) | 2026-10-19 | 2026-10-19 |
| ~~Q-004-03~~ | 004 – Photo viewer | Medium | How do live and motion photos play? (A press and hold plays the clip muted over the still; B Apple's LivePhotosKit as the web UI; C still only) | Resolved (Option A — press and hold plays the clip muted; owner, 2026-10-19; spec FR-004-06) | 2026-10-19 | 2026-10-19 |
| ~~Q-004-04~~ | 004 – Photo viewer | Medium | How does the viewer open? (A full-screen modal over the album page, sharing its loaded photos; B its own route `/albums/:id/photos/:photoId`) | Resolved (Option A — full-screen modal sharing the album page model; owner, 2026-10-19; spec FR-004-01, FR-004-02) | 2026-10-19 | 2026-10-19 |

## Question Details

### ~~Q-004-01~~ – Swiping and zooming

**Context:** The viewer needs horizontal swiping between photos, pinch and double-tap zoom, and panning while zoomed, on Android and iOS WebViews. Ionic removed `ion-slides` in v7 and recommends Swiper for carousels. Ionic's own gesture utility tracks a single pointer, so it can swipe but not pinch. Lychee's web UI uses its own handlers and the browser's page zoom, which a full-screen app view can't rely on. Swiper 14.3.0 (MIT, 2026-09-28) ships a web-component build (`swiper/element`) with Zoom and Virtual modules; adding it needs owner approval (AGENTS.md).

- **Option A (chosen):** Swiper 14 (`swiper/element`) with the Zoom module (pinch, double tap, pan within bounds) and the Virtual module (only the slides around the current one exist in the DOM).
  - ✅ Mature gesture handling on both platforms (momentum, edge resistance, zoom bounds); little code of our own.
  - ✅ What Ionic itself points to.
  - ❌ New dependency (pinned exact version, approval recorded in the plan); its web components need a Vue custom-element setting.
- **Option B:** hand-written gestures with Pointer Events: two-pointer pinch, double tap, pan with bounds, swipe with snap.
  - ✅ No dependency; full control.
  - ❌ Most code and device testing; easy to get edge cases wrong (zoom bounds, swipe vs pan, iOS Safari quirks).
- **Option C:** swipe with Ionic gestures, no pinch zoom (double tap toggles 2× only).
  - ✅ No dependency, little code.
  - ❌ No pinch zoom, which users expect in a photo viewer.

### ~~Q-004-02~~ – Image size

**Context:** `Album::photos` already returns every size variant with URL, width and height: `medium2x`/`medium` (around 1080p/2160p by default, only generated when the original is larger), `small2x`/`small`, `original` (`url` is `null` when the viewer lacks full-photo access). Phones have pixel ratios of 2–3.

- **Option A (chosen):** show the first available of `medium2x` (pixel ratio > 1) or `medium`, then `original`, `small2x`, `small`, `thumb2x`, `thumb`. When the user zooms in past 1.5×, swap in `original` if it exists and is allowed. The thumbnail stays visible until the larger image has loaded.
  - ✅ Fast swiping on mobile data; full detail when zooming.
  - ❌ A second download for zoomed photos.
- **Option B:** always `original`.
  - ✅ One image, full detail.
  - ❌ Originals are often 5–20 MB: slow swiping and heavy data use.
- **Option C:** `medium` only.
  - ✅ Simplest.
  - ❌ Zoom shows a blurry image.

### ~~Q-004-03~~ – Live and motion photos

**Context:** Live photos (Apple pairs and, since Lychee PR #4900, Google motion photos) carry `live_photo_url`, a `.mov` clip. Lychee's web UI plays them with Apple's LivePhotosKit, which plays on press and hold in its own player. iOS Photos plays on press and hold; Google Photos plays automatically once when opened.

- **Option A (chosen):** a "LIVE" badge on the photo; press and hold plays the clip muted in a `<video>` over the still, releasing returns to the still. No dependency.
  - ✅ Same gesture as iOS; few lines; no autoplay data cost.
  - ❌ Not discoverable without the badge; differs from Google Photos' autoplay.
- **Option B:** LivePhotosKit as the web UI.
  - ✅ Apple's exact behaviour.
  - ❌ New dependency built for desktop browsers; its gestures would fight Swiper's.
- **Option C:** show the still only, with the badge.
  - ✅ Nothing to build.
  - ❌ Drops the motion that Feature 100 in Lychee just added.

### ~~Q-004-04~~ – Opening the viewer

**Context:** The album page model (Feature 003) holds the loaded photos and loads more pages on demand. Lychee v2 has no single-photo endpoint, so a viewer always works from an album's photo list. Android's back button closes Ionic overlays.

- **Option A (chosen):** tapping a photo tile opens a full-screen `ion-modal` over the album page, given the album page's photos and its "load more" function; swiping near the end loads the next page; closing returns to the album at the photo last shown (scrolled into view).
  - ✅ No duplicate state; Android back and a close button close it; the album page stays mounted.
  - ❌ No URL for a single photo (no deep links; not needed in the PoC).
- **Option B:** a route `/albums/:id/photos/:photoId`, with album page models kept in a registry so the route can find the list.
  - ✅ Deep-linkable; browser-style history.
  - ❌ More plumbing; a cold start on that route has no list and would have to page through the album to find the photo.
