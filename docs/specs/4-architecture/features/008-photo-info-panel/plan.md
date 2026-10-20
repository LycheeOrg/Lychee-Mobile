# Feature Plan 008 – Photo Info Panel

_Linked specification:_ [spec.md](spec.md)  
_Linked tasks:_ [tasks.md](tasks.md)  
_Status:_ Complete  
_Last updated:_ 2026-10-20

> Guardrail: Keep this plan traceable back to the governing spec. Reference FR/NFR/Scenario IDs from `spec.md` where relevant, log any new high- or medium-impact questions in the feature's [open-questions.md](open-questions.md), and assume clarifications are resolved only when the spec's normative sections and, where applicable, ADRs under `docs/specs/6-decisions/` have been updated.

## Vision & Success Criteria
An "i" in the viewer shows what Lychee knows about the photo on screen: camera, exposure, dates, place on a map, albums. Success: on the Pixel 11 Pro and an iPhone, a GPS-tagged Pixel photo shows the same facts as the web panel in the owner's screenshot; the panel follows swipes; server settings that hide data are respected; nothing from the server runs as HTML.

## Scope Alignment
- **In scope:** FR-008-01 … 07, NFR-008-01 … 05.
- **Out of scope:** spec Non-Goals (editing, rating, statistics, faces, palette, info outside the viewer, other map services).

## Dependencies & Interfaces
- No new dependency (NFR-008-04). No native change.
- Lychee: `Album::photos` (`preformatted`, `precomputed`), `GET Photo/{id}/albums` (7.4.0+), `GET Map::provider`, `Gallery::Init.is_exif_disabled`, `Album::head.config.is_map_accessible`.
- Modules: `galleryParsers` (details, settings, head), `gallery` (`photoAlbums`, `mapProvider`), `sensitiveDisplay.settings` (holds `Gallery::Init`), `PhotoViewer`, `AlbumPage`, `galleryContext.recoverSession`.
- ADR-008-01 (static map), ADR-003-02 (`<img>` from other origins), ADR-006-01 (bridge holds credentials → NFR-008-02).

## Assumptions & Risks
- **Assumptions:** an `IonModal` sheet opened from inside the viewer's full-screen modal works on both platforms; with `backdropBreakpoint` 0.75 the photo above stays swipeable at 0.5.
- **Risks / Mitigations:**
  - _Tile server refuses WebView requests_ → grey map, text still shown (FR-008-05); device check; if refused, raise with the owner.
  - _Sheet drag vs Swiper gestures_ → the sheet only covers the lower half; device check S-008-02.
  - _Server HTML in descriptions_ → text only (NFR-008-02), unit test with hostile markup.

## Implementation Drift Gate
After T-008-11: map FR/NFR/S IDs to code and tests, rerun the quality gate, record a Drift Gate Report below.

## Increment Map
1. **I1 – Fixtures and parsers** (DO-008-01, 02; FR-008-02 … 05, 07; NFR-008-02, 03): full EXIF/GPS photo in `album-photos.json`, `is_exif_disabled` in `gallery-init.json`, new `photo-albums.json`, `map-provider.json`; failing parser tests → `PhotoTile.details`, `GallerySettings.exifDisabled`, `AlbumHead.mapAllowed`.
2. **I2 – Services and helpers** (FR-008-05, 06; API-008-02, 03): failing tests → `Gallery.photoAlbums`, `Gallery.mapProvider` (cached), `loadPhotoAlbums` (401 recovery), `mapTiles`, `mapsUrl`, `cameraLine`.
3. **I3 – Panel** (FR-008-02 … 06; UI-008-02, 03): failing component tests → `PhotoInfoPanel.vue`, `StaticMap.vue`.
4. **I4 – Viewer wiring** (FR-008-01; UI-008-01): "i" button, sheet, active photo, `exifDisabled`, `mapAllowed` from `AlbumPage`.
5. **I5 – Device checks** (S-008-01 … 12).
6. **I6 – Docs and drift gate.**

_Commands for every increment:_ `npx vp test <file>`, `npx vp check`, `npx vp run typecheck`; I4 also `npx vp run build`, `npx cap sync`.

## Scenario Tracking

| Scenario ID | Increment / Task reference | Notes |
|-------------|---------------------------|-------|
| S-008-01, 03, 07, 12 | I1 / T-008-01, 02; I3 / T-008-05, 06 | |
| S-008-02, 04 | I4 / T-008-07, 08 | |
| S-008-05, 06, 11 | I1; I2 / T-008-03, 04; I3 | |
| S-008-08, 09 | I2 / T-008-03, 04; I3 | |
| S-008-10 | I1 / T-008-02 | NFR-008-02 |

## Analysis Gate

Run 2026-10-20 by the agent.
1. Specification completeness — ✅ FR-008-01 … 07, NFR-008-01 … 05; Q-008-01 … 04 folded in; phone mock-up, tablet noted.
2. Open questions review — ✅ none open; ADR-008-01 written for the map.
3. Plan alignment — ✅ plan links spec and tasks; success criteria match the scenarios.
4. Tasks coverage — ✅ FR-008-01: T-008-07, 08; FR-008-02 … 04: T-008-01, 02, 05, 06; FR-008-05: T-008-01 … 06; FR-008-06: T-008-03 … 06; FR-008-07: T-008-01, 02; tests precede code; failure branches listed (S-008-05, 06, 08, 09, 10).
5. Working-agreement compliance — ✅ no dependency, no native change; pure helpers for parsing, tiles, URLs; ADR-003-02, ADR-006-01, ADR-004-01 reviewed.
6. Tooling readiness — ✅ commands above; devices as in Feature 007.

**Outcome:** cleared for implementation.

## Exit Criteria
- All tasks `[x]`; quality gate green; device checks recorded; knowledge map and roadmap updated; drift gate recorded.

## Follow-ups / Backlog
- Rating widget and statistics (Q-008-03 Option C).
- Info from the grid (long-press menu) or for albums.

## Intent Log
- 2026-10-20: owner asked for an "i" panel like Lychee's web About sidebar (screenshot). The agent read Lychee v7.11.1 `PhotoResource`, `PreformattedPhotoData`, `PreComputedPhotoData`, `PhotoDetails.vue`, `PhotoPanel.vue`, `MapInclude`/`MapProviders`, `AlbumConfig.is_map_accessible`, `InitConfig.is_exif_disabled`, `PhotoController::albums` (7.4.0+), and 7.1.0's shapes. Logged Q-008-01 … 04; owner chose A for all. Read Capacitor's `Bridge.launchIntent` and iOS `WebViewDelegationHandler`: both hand non-app URLs (`geo:`, `maps://`) to the OS.
- 2026-10-20: T-008-01 … 08 and 10 done test-first (575 Vitest tests). Notes: the viewer test mocks Swiper (jsdom has no layout); `lycheeHttp` no longer appends a bare `?` without parameters (found through `Map::provider`); `URLSearchParams.size` avoided for old Android WebViews; the EXIF section is left out when all its values are empty (FR-008-04). No CSP in `index.html`, so tiles load from the provider's origin. Remaining: T-008-09 (devices), T-008-11 (drift gate).
- 2026-10-20: owner device report (Android): the sheet opens at half height and expands to full height, map tiles load, tapping the map opens Google Maps, details match the web panel. iPhone and swiping with the sheet at half height not reported yet.

## Drift Gate Report

Run 2026-10-20 by the agent; device checks completed by the owner the same day.

**Preconditions:** all tasks `[x]` (T-008-01 … 11). `npx vp check`, `npx vp run typecheck`, `npx vp test` (41 files, 575 tests), `npx vp run build`, `npx cap sync`, `./gradlew assembleDebug` green. No dependency or native change.

| Requirement | Code | Evidence |
|-------------|------|----------|
| FR-008-01 | `PhotoViewer.vue` ("i" button, sheet `IonModal`, follows `activeIndex`), `infoAllowed` from `Gallery::Init` | `PhotoViewer.test.ts` (5), `galleryParsers.test.ts` (`exifDisabled`); sheet confirmed on Android |
| FR-008-02 | `PhotoInfoPanel.vue` header and dates | `PhotoInfoPanel.test.ts` (header, video, `*`) |
| FR-008-03 | description (text), tags, license | `PhotoInfoPanel.test.ts`, `photoDetails.test.ts` |
| FR-008-04 | EXIF section, `cameraLine()` | `PhotoInfoPanel.test.ts`, `photoInfo.test.ts`; matches the web panel on Android |
| FR-008-05 | `StaticMap.vue`, `mapTiles()`, `mapsUrl()`, `Gallery.mapProvider`, `AlbumHead.mapAllowed` | `photoInfo.test.ts` (11), `PhotoInfoPanel.test.ts` (map shown/hidden, open), `gallery.test.ts`; tiles and Google Maps confirmed on Android |
| FR-008-06 | `Gallery.photoAlbums`, `createPhotoAlbums()` | `gallery.test.ts` (200/empty/404/401/500/network/timeout), `photoAlbums.test.ts` (6) |
| FR-008-07 | 7.2.0+ shape only | `photoDetails.test.ts` (7.1.x-shaped photo) |
| NFR-008-01 | details parsed with the page; only albums and provider loaded on open | `PhotoViewer.test.ts` (nothing loaded before opening) |
| NFR-008-02 | `htmlToText()`, text interpolation only | `photoDetails.test.ts` (hostile markup), `PhotoInfoPanel.test.ts` |
| NFR-008-03 | pure parser | `photoDetails.test.ts` (7) |
| NFR-008-04 | no dependency | `package.json` unchanged |
| NFR-008-05 | provider layer and attribution | `gallery.test.ts`, `PhotoInfoPanel.test.ts` |

**Device checks:** all passed, as reported by the owner on 2026-10-20 ("everything is tested"): the iPhone incl. `maps://`, swiping with the sheet at half height, and the rest of S-008-01 … 12. The agent didn't see these runs; the evidence is the owner's report.

**Divergences:** `lycheeHttp` drops the bare `?` on parameterless requests (cross-feature, harmless); the EXIF section is hidden when all values are empty (FR-008-04 updated).

**Lessons:** hand-computed expectations for map maths need an independent check; small zooms wrap tiles, so tests must pick tiles by position, not URL.
- 2026-10-20: owner reported all remaining device checks passed; feature closed.
