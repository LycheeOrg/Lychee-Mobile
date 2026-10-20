# Feature 008 – Photo Info Panel

| Field | Value |
|-------|-------|
| Status | Ready |
| Last updated | 2026-10-20 |
| Owners | mlapaglia |
| Linked plan | [plan.md](plan.md) |
| Linked tasks | [tasks.md](tasks.md) |
| Roadmap entry | #008 |

> Guardrail: This specification is the single normative source of truth for the feature. Track high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), encode resolved answers directly in the Requirements/NFR/Behaviour/UI/Telemetry sections below (no per-feature `## Clarifications` sections), and use ADRs under `docs/specs/6-decisions/` for architecturally significant clarifications (referencing their IDs from the relevant spec sections).

## Overview
In the photo viewer (Feature 004) an "i" button opens an About panel for the photo on screen, like Lychee's web sidebar: file name, resolution and size, upload and capture dates, camera, lens, aperture, focal length, shutter, ISO, GPS coordinates, altitude, address, a map, and the albums the photo is in. Almost everything comes preformatted in the photo data the album pages already load (`preformatted`, `precomputed`), so the panel needs no request except the album list (`GET /api/v2/Photo/{id}/albums`, Lychee 7.4.0+). The server decides what may be shown (EXIF switched off, GPS or address hidden, map allowed); the app shows what it receives.

## Goals
- An "i" button in the viewer overlay opens the panel for the current photo; swiping to another photo with the panel open shows that photo's information.
- The same facts as Lychee's web About panel, laid out for a phone.
- Respect every server setting that hides information.

## Non-Goals
- Editing anything (title, description, tags, date, location, license) or rating.
- Statistics (visits, downloads), colour palette, people/faces, share links.
- Information for photos outside the viewer (grid long-press, album info).
- Reverse-geocoding or any map service other than the tile provider Lychee is configured with.

## Functional Requirements

| ID | Requirement | Success path | Validation path | Failure path | Telemetry & traces | Source |
|----|-------------|--------------|-----------------|--------------|--------------------|--------|
| FR-008-01 | Open and close. | An "i" button (`informationCircleOutline`) at the right of the viewer overlay opens the panel as a bottom sheet over the viewer, at half height, draggable to full height (`IonModal` sheet, breakpoints 0, 0.5, 1); dragging down closes it. Below the 0.75 backdrop breakpoint the photo above stays interactive, so it can be swiped; at full height the photo is dimmed and tapping it closes the panel (Q-008-02). While it is open, swiping between photos updates it to the photo on screen. Closing the viewer closes the panel. | The button is hidden when `Gallery::Init` `is_exif_disabled` is true (Lychee's "EXIF disabled for all"). | — | None. | Owner request 2026-10-20; Lychee `PhotoPanel.vue` |
| FR-008-02 | Header and dates. | Title (file name), then `preformatted.resolution` and `preformatted.filesize`; for videos also `duration` and `fps`. Upload date `preformatted.created_at` (file icon) and, when present, capture date `preformatted.taken_at` (camera icon) with a `*` when `precomputed.is_taken_at_modified`. Dates are shown as the server formats them. | Empty strings and nulls are left out. | — | — | Lychee `PhotoDetails.vue` |
| FR-008-03 | Description, tags, license. | Description as plain text (the server's Markdown-rendered HTML with tags stripped, NFR-008-02); tags as non-interactive chips; license text when not "none" (Q-008-03). | Sections without content are left out. | — | — | Lychee `PhotoDetails.vue` |
| FR-008-04 | EXIF. | When `precomputed.has_exif`: camera (`make` and `model`, the make left out when the model already starts with it), lens, then a two-column grid: aperture `ƒ / {aperture}`, focal length, shutter, ISO. | Each line or cell is left out when its value is empty; the whole section is left out when all are empty. | — | — | Lychee `PhotoDetails.vue` |
| FR-008-05 | Location. | When `precomputed.has_location`: a map centred on `precomputed.latitude`/`longitude` with a marker (Q-008-01), then `preformatted.latitude`, `longitude`, `altitude` in one row, then `preformatted.location` (address). Tapping the map or coordinates opens the phone's maps app at that point (`geo:{lat},{lng}?q={lat},{lng}` on Android, `maps://?ll={lat},{lng}&q={lat},{lng}` on iOS). The map is static: the tiles around the point at zoom 15 from Lychee's provider (`Map::provider` `layer`, `{s}` → `a`), placed with CSS, a marker at the exact point, and the provider's attribution as text (ADR-008-01). | The map shows only when `Album::head` `config.is_map_accessible` is true and decimal coordinates are present (the server leaves them out when GPS display is off). | Map tiles that fail to load leave a grey area; coordinates and address still show. | — | Lychee `MapInclude.vue`, `PreformattedPhotoData` |
| FR-008-06 | Albums. | Opening the panel loads `GET /api/v2/Photo/{id}/albums` once per photo and lists the album titles (Q-008-03). | Empty list → "In no album you can see". | 404 (Lychee before 7.4.0) → the section is left out; 401 → session recovery once (FR-006-03), else left out; other errors or no answer in 10 s → "Couldn't load albums". | — | Lychee `PhotoController::albums` |
| FR-008-07 | Older servers. | Lychee 7.2.0+ provides all fields above in `preformatted`/`precomputed`. On 7.1.x camera, focal length, address and map are missing from those objects, and the panel shows the rest (Q-008-04). | — | — | — | Lychee 7.1.0 `PreformattedPhotoData` |

## Non-Functional Requirements

| ID | Requirement | Driver | Measurement | Dependencies | Source |
|----|-------------|--------|-------------|--------------|--------|
| NFR-008-01 | No extra request for anything but albums; the panel opens instantly from data already loaded. | Responsiveness. | Component test: opening the panel makes no gallery call except `photoAlbums`. | DO-008-01 | — |
| NFR-008-02 | Server-provided text is never inserted as HTML. The description is reduced to text with `DOMParser` and rendered with text interpolation. | The WebView has the native bridge (credentials, files); HTML from the server must not run or style anything. | Unit test with `<img onerror>` and `<script>` in a description. | — | ADR-006-01 |
| NFR-008-03 | Parsing details is pure and tested in jsdom; missing or malformed fields give empty values, never a failed page. | NFR-003-03. | Vitest. | — | NFR-003-03 |
| NFR-008-04 | No new dependency (Q-008-01). | AGENTS.md. | `package.json` diff. | — | — |
| NFR-008-05 | Map tiles come only from the provider Lychee is configured with (`GET /api/v2/Map::provider`), with its attribution shown. | OpenStreetMap tile policy; same source as the web UI. | Device check. | API-008-03 | Lychee `MapProviders` |

## UI / Interaction Mock-ups

Phone:

```
 Viewer with the "i" button           Panel at half height                 Panel dragged to full height
┌──────────────────────────────┐   ┌──────────────────────────────┐    ┌──────────────────────────────┐
│ ✕   1332.jpg     3 / 120  ⓘ  │   │ ✕   1332.jpg     3 / 120  ⓘ  │    │            ───               │
│                              │   │                              │    │ About                        │
│                              │   │        (photo, dimmed)       │    │ ▣ 1332.jpg                   │
│          (photo)             │   │                              │    │   3064 x 4080   4.74 MB      │
│                              │   │──────────── ─── ─────────────│    │ ⇪ Oct 20, 2026, 8:18:59 AM   │
│                              │   │ About                        │    │ 📷 Oct 20, 2026, 8:18:13 AM   │
│                              │   │ ▣ 1332.jpg                   │    │ Albums                       │
│                              │   │   3064 x 4080   4.74 MB      │    │ Mallory LaPaglia             │
│                              │   │ ⇪ Oct 20, 2026, 8:18:59 AM   │    │ EXIF data                    │
│                              │   │ 📷 Oct 20, 2026, 8:18:13 AM   │    │ 📷 Google Pixel 11 Pro        │
│                              │   │ Albums                       │    │ ◎ Pixel 11 Pro back camera…  │
│                              │   │ Mallory LaPaglia             │    │ ƒ / 1.7         ⟂ 7 mm       │
│                              │   │ EXIF data                    │    │ ⏱ 1/649 sec     ISO 35       │
│                              │   │ …                            │    │ Location                     │
└──────────────────────────────┘   └──────────────────────────────┘    │ ┌──────────────────────────┐ │
 ⓘ hidden when EXIF is disabled on the server.                         │ │   map tiles      📍       │ │
                                                                       │ │      © OSM contributors  │ │
                                                                       │ └──────────────────────────┘ │
                                                                       │ 40° 1' 40" N  86° 8' 43" W   │
                                                                       │ 242.8m                       │
                                                                       │ 16418 Southpark Drive, …     │
                                                                       └──────────────────────────────┘
 Swiping the photo behind the half-height panel updates it.  Tapping the map opens the phone's maps app.
```

Tablet: the same sheet, limited to 600 px wide and centred.

## Branch & Scenario Matrix

| Scenario ID | Description / Expected outcome |
|-------------|--------------------------------|
| S-008-01 | Photo from a Pixel with GPS → camera, lens, aperture, focal, shutter, ISO, coordinates, altitude, address, map, albums. |
| S-008-02 | Swipe to the next photo with the panel open → the panel shows that photo. |
| S-008-03 | Screenshot without EXIF or GPS → header, dates and albums only. |
| S-008-04 | Server with "EXIF disabled for all" → no "i" button. |
| S-008-05 | Server hides GPS (`gps_coordinate_display` off, or public for guests) → no coordinates, no map; address follows `location_show`. |
| S-008-06 | Album whose `is_map_accessible` is false → coordinates and address, no map. |
| S-008-07 | Video → duration and fps in the header; EXIF without aperture and focal. |
| S-008-08 | Lychee 7.1.x → no albums section (404), no camera/address/map (FR-008-07). |
| S-008-09 | Albums request fails → "Couldn't load albums"; the rest of the panel shows. |
| S-008-10 | Description with HTML → shown as plain text, nothing runs (NFR-008-02). |
| S-008-11 | Tap the map → the maps app opens at the photo's location. |
| S-008-12 | Capture date changed in Lychee → `*` after it. |

## Test Strategy
- **Units (Vitest):** details parser from the recorded photo (7.11.1 shape and a 7.1.x-shaped photo); camera line; description to text; maps URL per platform; albums service (200, empty, 404, 401, error, timeout).
- **Components (Vitest + @vue/test-utils):** panel sections shown and hidden per data; "i" hidden when EXIF is disabled; panel follows the active photo; map shown only when allowed.
- **Lychee API contract:** `album-photos.json` with a Pixel photo's full `preformatted`/`precomputed`; `photo-albums.json`; `map-provider.json`; `Gallery::Init` with `is_exif_disabled`.
- **Native:** Pixel 11 Pro and iPhone: S-008-01 … 12; map tiles load from the WebView.

## Interface & Contract Catalogue

### Domain Objects
| ID | Description | Modules |
|----|-------------|---------|
| DO-008-01 | `PhotoDetails` on each `PhotoTile`: `resolution`, `filesize`, `duration`, `fps`, `createdAt`, `takenAt`, `takenAtModified`, `description` (text), `tags`, `license`, `hasExif`, `camera`, `lens`, `aperture`, `focal`, `shutter`, `iso`, `hasLocation`, `latitude`/`longitude` (decimal or null), `latitudeText`, `longitudeText`, `altitudeText`, `address`. | `src/services/photoDetails.ts` (proposed), `galleryParsers.ts` |
| DO-008-02 | `GallerySettings.exifDisabled`; `AlbumHead.mapAllowed`. | `galleryParsers.ts` |
| DO-008-03 | `PhotoAlbumsResult`: `{ kind: "ok", albums: { id, title }[] }`, `unsupported` (404), `unauthenticated`, `failed`. | `gallery.ts` |

### API Routes / Services
| ID | Transport | Description | Notes |
|----|-----------|-------------|-------|
| API-008-01 | Album photo pages (`Album::photos`), already loaded | `preformatted` (`PreformattedPhotoData`) and `precomputed` (`PreComputedPhotoData`) per photo. | 7.2.0+ shape; 7.1.x differs (FR-008-07). |
| API-008-02 | `GET /api/v2/Photo/{photo_id}/albums` | `PhotoAlbumResource[]` `{ id, title }` the user may see. | Lychee 7.4.0+. |
| API-008-03 | `GET /api/v2/Map::provider` | `{ layer, attribution }`: tile URL template (OSM.org, .de, .fr with `{s}`, RRZE) and attribution HTML. | Attribution shown as text, tags stripped (NFR-008-02); loaded once per server; a failure leaves the map out (ADR-008-01). |
| API-008-04 | `Gallery::Init` `is_exif_disabled`; `Album::head` `config.is_map_accessible` | Visibility switches (FR-008-01, FR-008-05). | Both already in responses the app loads. |

Supported server versions: Lychee 7.1.0 and later; full panel on 7.4.0+ (FR-008-06, FR-008-07).

### Native Capabilities
| ID | Plugin / permission | Behaviour |
|----|---------------------|-----------|
| NC-008-01 | None new. Opening the maps app navigates to the `geo:` (Android) or `maps://` (iOS) URL; Capacitor cancels navigations outside the app and hands them to the OS (`Bridge.launchIntent`, `WebViewDelegationHandler`). | FR-008-05. |

### UI States
| ID | State | Trigger / Expected outcome |
|----|-------|---------------------------|
| UI-008-01 | "i" button | Viewer overlay; hidden when EXIF is disabled. |
| UI-008-02 | Panel (half / full) | FR-008-01 … 06. |
| UI-008-03 | Albums loading / failed | Spinner line; "Couldn't load albums". |

## Telemetry & Observability
None in the proof of concept.

## Documentation Deliverables
- Roadmap row 008; knowledge map: details parser, albums call, map provider, panel component.
- ADR-008-01: static map from Lychee's tile provider (Q-008-01).

## Fixtures & Sample Data
- Extend `album-photos.json` with a photo carrying full EXIF and location (from a Pixel photo's real payload shape).
- New `photo-albums.json`, `map-provider.json`; `gallery-init.json` gains `is_exif_disabled`.

## Spec DSL

```
domain_objects:
  - id: DO-008-01
    name: PhotoDetails
  - id: DO-008-02
    name: GallerySettings.exifDisabled, AlbumHead.mapAllowed
  - id: DO-008-03
    name: PhotoAlbumsResult
routes:
  - id: API-008-02
    method: GET
    path: /api/v2/Photo/{photo_id}/albums
  - id: API-008-03
    method: GET
    path: /api/v2/Map::provider
native_capabilities:
  - id: NC-008-01
    plugin: none (geo:/maps:// URLs)
ui_states:
  - id: UI-008-01
    description: Info button
  - id: UI-008-02
    description: Info panel
  - id: UI-008-03
    description: Albums loading or failed
```

## Appendix

### Where the data comes from (Lychee 7.11.1)
- `PreformattedPhotoData`: `created_at`, `taken_at` (server date formats), `make`, `model`, `shutter` (`s` → `sec`), `aperture` (without `f/`), `iso` (`ISO n`), `lens`, `focal`, `duration`, `fps`, `filesize`, `resolution`, `latitude`/`longitude` (degrees, minutes, seconds), `altitude` (`242.8m`), `location` (address), `license`, `description` (Markdown rendered to HTML). EXIF fields are empty when `display_exif_data` is off; GPS strings are null when `gps_coordinate_display` (or `…_public` for guests) is off; `location` is null when `location_show` (or `…_public`) is off.
- `PreComputedPhotoData`: `has_exif`, `has_location`, `is_taken_at_modified`, decimal `latitude`/`longitude`/`altitude` (same GPS switches).
- `InitConfig.is_exif_disabled` (`exif_disabled_for_all`): the web UI hides the whole details drawer.
- `AlbumConfig.is_map_accessible`: `map_display` and (signed in or `map_display_public`).
- Lychee 7.1.x had `make`, `model`, `focal`, `location` and decimal coordinates at the top level of the photo instead (its `preformatted` already had `lens`, shutter, aperture, ISO and the GPS strings).
