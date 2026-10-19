# Feature 003 – Album Browsing

| Field | Value |
|-------|-------|
| Status | Ready |
| Last updated | 2026-10-19 |
| Owners | mlapaglia |
| Linked plan | [plan.md](plan.md) |
| Linked tasks | [tasks.md](tasks.md) |
| Roadmap entry | #003 |

> Guardrail: This specification is the single normative source of truth for the feature. Track high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), encode resolved answers directly in the Requirements/NFR/Behaviour/UI/Telemetry sections below (no per-feature `## Clarifications` sections), and use ADRs under `docs/specs/6-decisions/` for architecturally significant clarifications (referencing their IDs from the relevant spec sections).

## Overview
With a server connected (Feature 001) and the user signed in or browsing as a guest (Feature 002), the app opens on the gallery: the top-level albums, then each album's sub-albums and photo thumbnails, as deep as the albums go. Browsing uses Lychee's v2 paginated API (ADR-003-01) through the native HTTP transport (ADR-001-01); thumbnails are plain `<img>` elements pointing at the server's image URLs (ADR-003-02). Password-protected albums and galleries can be unlocked, and sensitive albums follow the server's settings. The server field and account line move from the start page to a settings page. The photo viewer is Feature 004: here a photo tile is display-only.

## Goals
- Open the app and see the albums the server shows this user, with covers, titles and counts.
- Open an album and see its sub-albums and a scrolling grid of photo thumbnails, loading more as the user scrolls.
- Clear states for empty albums, failures, locked albums and galleries, sensitive albums and an ended session.

## Non-Goals
- The photo viewer, swiping, zoom, video and live photo playback (Feature 004).
- Uploading, editing, moving, deleting, sharing, downloading (Feature 005 and later).
- Search, timeline, map, tag filters, person albums' face tools.
- Lychee's v3 struct-of-arrays API (ADR-003-01).
- Grid virtualisation (Q-003-03; revisit only if NFR-003-02 fails).
- Offline caching beyond the WebView's HTTP cache.

## Functional Requirements

| ID | Requirement | Success path | Validation path | Failure path | Telemetry & traces | Source |
|----|-------------|--------------|-----------------|--------------|--------------------|--------|
| FR-003-01 | Album list. | `/albums` loads `GET /api/v2/Albums` and `GET /api/v2/Gallery::Init`, then shows the non-empty sections in this order with headings: Pinned, Smart albums, Albums, Shared with me, Tag albums, People. Each tile: cover, title, photo count when > 0, lock icon when `is_locked`. Order within a section is the server's. Pull to refresh reloads. The list reloads when the page is shown again after the server or account changed. | — | Network error or timeout → "Can't reach this server." with Retry. Every section empty → "No albums to show." `unauthenticated` → FR-003-06. `gallery_locked` → FR-003-05. Other errors → "Couldn't load the albums." with Retry. | None (no analytics in the PoC). | Roadmap 003, ADR-003-01 |
| FR-003-02 | Album page. | `/albums/:id` loads `Album::head` (title in the toolbar), then pages of sub-albums (`Album::albums`, regular albums only) followed by pages of photos (`Album::photos`). Sub-albums appear above the photos as album tiles; photos as a grid of square thumbnails, 3 columns below 600 px width, 5 from 600 px, 7 from 900 px. `ion-infinite-scroll` loads the next page (sub-albums first, then photos) until both are exhausted. Back returns to the previous page with its scroll position. Pull to refresh reloads from the first page. | `Album::albums` is called only for regular albums with `num_children > 0`. | 404 → "This album no longer exists."; `forbidden` → "You don't have access to this album."; `unauthenticated` → FR-003-06; `password_required` → FR-003-05; network error or timeout on the first load → "Can't reach this server." with Retry; a later page fails → tiles kept, "Couldn't load more." with Retry at the end. Empty album → "This album is empty." | — | Q-003-03 |
| FR-003-03 | Thumbnails. | Album covers: `thumb.thumb` with `thumb.thumb2x` as the 2x `srcset` entry. Photo tiles: `size_variants.thumb.url` / `thumb2x.url` the same way, `object-fit: cover`. `<img loading="lazy" decoding="async">` with the server's URL as is (ADR-003-02). Videos show a play badge, live photos a live badge. | No thumb (raw files, locked albums, empty albums) → placeholder icon. | Image error (including an expired temporary link) → placeholder icon; pull to refresh fetches new URLs. | — | ADR-003-02 |
| FR-003-04 | Server version. | Browsing needs Lychee 7.1.0 or newer. | Stored version older than 7.1.0 → the album list shows "Album browsing needs Lychee 7.1 or newer." and makes no gallery call. Hidden version (`null`) → tried. | — | — | ADR-003-01 |
| FR-003-05 | Locked albums and galleries. | **Album:** `Album::head` failing with `PasswordRequiredException` shows "This album needs a password.", a password field and Unlock → `POST Album::unlock {album_id, password}` → the page loads. **Gallery:** `GalleryPasswordRequiredException` on the album list shows "This gallery needs a password.", a password field, Unlock → `POST Gallery::unlock {password}` → the list loads, and "Sign in instead" (opens `/login`). Unlocks live in the server's cookies (session for albums, 30-day cookie for the gallery). | Empty password → Unlock disabled. | Wrong password (403) → "Wrong password."; 429 → "Too many attempts. Try again later."; network error → "Can't reach this server."; the field is cleared after every attempt. | — | Q-003-04 |
| FR-003-06 | Sign-in needed. | An `unauthenticated` failure (401 `UnauthenticatedException`) on a gallery call → the account store refreshes (FR-002-03). The page shows "Sign in to see these albums." with Sign in (opens `/login`); signed-in users whose session ended see "Your session ended. Sign in again." The page reloads when it is shown after signing in. | — | — | — | Feature 002 backlog |
| FR-003-07 | Transport. | Gallery calls share one `lycheeHttp` client per server. Any `api/v2` call answered with 419 (`SessionExpiredException`) restarts the session (`GET {server}/`) and is sent once more. | — | A second 419 is returned to the caller (→ `failed`). | — | Feature 002 drift gate |
| FR-003-08 | Navigation. | `/` and the launch route go to `/albums`. With no stored server, `/albums` replaces itself with `/settings`. `/settings` is today's start page (server field, banner, account line) with a back button to `/albums`; the album list's toolbar has a gear button to it. After a successful Connect the app goes to `/login` when signed out (FR-002-05), else to `/albums`. Leaving `/login` (signed in or Continue as guest) goes to `/albums` as the new root. | — | — | — | Q-003-06 |
| FR-003-09 | Sensitive albums. | Tiles with `is_nsfw` are hidden when `Gallery::Init.are_nsfw_visible` is false; a line "N sensitive albums hidden" with Show reveals them until the app restarts. Visible NSFW covers are blurred when `is_nsfw_background_blurred`. Opening an album whose `Album::head.config.is_nsfw_warning_visible` is true first shows "This album may contain sensitive content." with Continue and Back; Continue is remembered for that album until the app restarts. | — | `Gallery::Init` fails → NSFW albums shown unblurred, no hidden line (the album warning still comes from `Album::head`). | — | Q-003-05 |

## Non-Functional Requirements

| ID | Requirement | Driver | Measurement | Dependencies | Source |
|----|-------------|--------|-------------|--------------|--------|
| NFR-003-01 | Each gallery request finishes or fails within 10 s. | As NFR-001-01. | Fake-timer tests. | `withTimeout()` | NFR-001-01 |
| NFR-003-02 | Scrolling a 500-photo smart album page stays smooth on the Pixel 11 Pro. | Usability. | Manual check on the device; if it stutters, reopen Q-003-03. | — | Q-003-03 |
| NFR-003-03 | API payloads are parsed into the app's own types at the service boundary; pages never read raw JSON; unknown fields are ignored, missing optional ones defaulted. | Server fields change between versions. | Parser tests with fixtures. | — | NFR-002-04 |
| NFR-003-04 | No new dependency. | AGENTS.md. | `package.json` diff. | — | Q-003-03 |
| NFR-003-05 | Passwords typed for albums or galleries are never stored or logged and are cleared after each attempt. | Same as NFR-002-01. | Store tests; code review. | — | NFR-002-01 |

## UI / Interaction Mock-ups

```
 Album list (/albums)                 Album page (/albums/:id)            Sign-in needed (FR-003-06)
┌──────────────────────────────┐    ┌──────────────────────────────┐    ┌──────────────────────────────┐
│ Lychee                    ⚙  │    │ ‹          Holidays          │    │ Lychee                    ⚙  │
│ Smart albums                 │    │ ┌──────┐┌──────┐             │    │                              │
│ ┌──────┐┌──────┐┌──────┐     │    │ │ img  ││ 🔒   │             │    │ Your session ended. Sign in  │
│ │ img  ││ img  ││ img  │     │    │ └──────┘└──────┘             │    │ again.                       │
│ └──────┘└──────┘└──────┘     │    │ 2024     Private             │    │ [          Sign in         ] │
│ Recent   Starred  Unsorted   │    │ ┌────┐┌────┐┌────┐           │    └──────────────────────────────┘
│ Albums                       │    │ │ ▢  ││ ▶  ││ ▢  │           │
│ ┌──────┐┌──────┐┌──────┐     │    │ └────┘└────┘└────┘           │     Locked album (FR-003-05)
│ │ img  ││ 🔒   ││ ░░░  │     │    │ ┌────┐┌────┐┌────┐           │    ┌──────────────────────────────┐
│ └──────┘└──────┘└──────┘     │    │ │ ▢  ││ ◎  ││ ▢  │           │    │ ‹          Family            │
│ Holidays Family  Party       │    │ └────┘└────┘└────┘           │    │ This album needs a password. │
│ 128      🔒      (blurred)   │    │ … more load while scrolling  │    │ [Password                  ] │
│ 2 sensitive albums hidden    │    └──────────────────────────────┘    │ [          Unlock          ] │
│ [Show]                       │     ▶ video  ◎ live photo              └──────────────────────────────┘
└──────────────────────────────┘
 Locked gallery                       Sensitive album (FR-003-09)         Settings (/settings)
┌──────────────────────────────┐    ┌──────────────────────────────┐    ┌──────────────────────────────┐
│ Lychee                    ⚙  │    │ ‹          Party             │    │ ‹          Settings          │
│ This gallery needs a         │    │ This album may contain       │    │ Server address               │
│ password.                    │    │ sensitive content.           │    │ [https://lapaglia.pics     ] │
│ [Password                  ] │    │ [         Continue         ] │    │ ✓ Connected to Lychee 7.11.1 │
│ [          Unlock          ] │    │ [           Back           ] │    │ [          Connect         ] │
│       Sign in instead        │    └──────────────────────────────┘    │ Signed in as matt [Sign out] │
└──────────────────────────────┘                                        └──────────────────────────────┘
```

## Branch & Scenario Matrix

| Scenario ID | Description / Expected outcome |
|-------------|--------------------------------|
| S-003-01 | Signed-in user opens the app → sections with their albums and shared albums. |
| S-003-02 | Guest on a server with public albums → those albums; with none → "No albums to show." |
| S-003-03 | Album with sub-albums and photos → both shown; scrolling loads every page up to the last. |
| S-003-04 | Smart album (e.g. Recent) → photos only, up to 500 per page. |
| S-003-05 | Server unreachable → message with Retry; Retry succeeds once it is back. |
| S-003-06 | Later page fails → loaded tiles kept, Retry at the end. |
| S-003-07 | Album deleted meanwhile (404) → "This album no longer exists." |
| S-003-08 | Session ended or login required (401) → sign-in message, Sign in, page reloads after signing in. |
| S-003-09 | 419 on any call → session restarted and the call retried once. |
| S-003-10 | Photo without thumbnail, or image error → placeholder. |
| S-003-11 | Local-network http server → thumbnails load on Android and iOS. |
| S-003-12 | Server older than 7.1.0 → version message, no gallery call. |
| S-003-13 | Locked album → password prompt; wrong password → message; right password → album loads. |
| S-003-14 | Locked gallery → password prompt; right password → list loads; Sign in instead → `/login`. |
| S-003-15 | NSFW album with `are_nsfw_visible` false → hidden, Show reveals it; with blur on → blurred cover. |
| S-003-16 | NSFW album with the warning on → warning first; Continue opens it; reopening in the same run skips the warning. |
| S-003-17 | First launch without a server → settings; Connect → sign-in or album list. |
| S-003-18 | Server or account changed in settings → album list reloads on return. |

## Test Strategy
- **Units (Vitest):** parsers for the root list, album head, album and photo pages and `Gallery::Init` against fixtures (NFR-003-03); the gallery service's error mapping (404, 401, 403, `PasswordRequiredException`, `GalleryPasswordRequiredException`, 429, network, timeout), unlock calls; `lycheeHttp` 419 retry; version comparison; NSFW filtering.
- **Store (Vitest):** album list and album page models: first load, sub-album pages then photo pages, end of pages, refresh, failure and retry of a later page, unlock flows, NSFW warning memory, sign-in handoff, no password in state.
- **Lychee API contract:** fixtures written from Lychee 7.11.1's resource classes (`RootAlbumResource`, `ThumbAlbumResource`, `ThumbResource`, `HeadAbstractAlbumResource`, `PaginatedAlbumsResource`, `PaginatedPhotosResource`, `PhotoResource`, `SizeVariantResource`, `InitConfig`) with the error bodies' real shape; neither test server shows albums to a guest, so the device checks against real servers confirm them.
- **Native:** Pixel 11 Pro and iOS through Xcode against `lapaglia.pics` (signed in) and the LAN server; scroll a large smart album (NFR-003-02).

## Interface & Contract Catalogue

### Domain Objects
| ID | Description | Modules |
|----|-------------|---------|
| DO-003-01 | `AlbumTile`: `{ id, title, thumb: Thumb \| null, photoCount: number \| null, isLocked, isNsfw }`; `Thumb`: `{ src, src2x: string \| null }`. | `src/services/gallery.ts` |
| DO-003-02 | `PhotoTile`: `{ id, title, thumb: Thumb \| null, kind: "photo" \| "video" \| "live" \| "raw" }`. | `src/services/gallery.ts` |
| DO-003-03 | `RootAlbums`: `{ sections: { key: "pinned" \| "smart" \| "albums" \| "shared" \| "tags" \| "people", albums: AlbumTile[] }[] }` (non-empty, in display order). | `src/services/gallery.ts` |
| DO-003-04 | `AlbumHead`: `{ id, title, kind: "album" \| "smart" \| "tag" \| "person", hasSubAlbums: boolean, nsfwWarning: boolean }`. | `src/services/gallery.ts` |
| DO-003-05 | `Page<T>`: `{ items: T[], page, lastPage }`. | `src/services/gallery.ts` |
| DO-003-06 | `GalleryFailure`: `unreachable`, `not_found`, `unauthenticated`, `forbidden`, `password_required`, `gallery_locked`, `failed`; `UnlockFailure`: `wrong_password`, `throttled`, `unreachable`, `failed`. | `src/services/gallery.ts` |
| DO-003-07 | `GallerySettings`: `{ nsfwVisible, nsfwBlurred }` from `Gallery::Init`. | `src/services/gallery.ts` |

### API Routes / Services
| ID | Transport | Description | Notes |
|----|-----------|-------------|-------|
| API-003-01 | Lychee REST `GET /api/v2/Albums` (consumed) | `smart_albums`, `pinned_albums`, `albums`, `shared_albums`, `tag_albums`, `person_albums`: `ThumbAlbumResource[]` (`id`, `title`, `thumb {id, type, thumb, thumb2x, placeholder} \| null`, `num_photos`, `is_nsfw`, `is_locked`, `is_tag_album`, `is_person_album`, …); `config`, `rights`. Not paginated. | `AlbumsController`, `RootAlbumResource` |
| API-003-02 | `GET /api/v2/Album::head?album_id=` | `{ config: { is_nsfw_warning_visible, … }, resource: { id, title, … } }`; the kind is inferred from the resource fields: `is_tag_album` → tag, `is_person_album` → person, `has_albums` present → regular (sub-albums when `num_children > 0`), none → smart. `PasswordRequiredException` when locked. | 7.1.0+ |
| API-003-03 | `GET /api/v2/Album::albums?album_id=&page=` | `{ data: ThumbAlbumResource[], current_page, last_page, per_page, total }`. | 30 per page by default |
| API-003-04 | `GET /api/v2/Album::photos?album_id=&page=` | `{ photos: PhotoResource[], current_page, last_page, per_page, total }`; `size_variants.{thumb, thumb2x}.{url, width, height}`, `precomputed.{is_video, is_livephoto, is_raw}`. | 100 per page, 500 for smart albums |
| API-003-05 | `POST /api/v2/Album::unlock {album_id, password}`, `POST /api/v2/Gallery::unlock {password}` | Success with an empty body; wrong password 403; throttled 10 per minute. | 7.10.0+ for the gallery |
| API-003-06 | `GET /api/v2/Gallery::Init` | `are_nsfw_visible`, `is_nsfw_background_blurred` (and more, ignored). Exempt from the gallery password. | |

### Native Capabilities
| ID | Plugin / permission | Behaviour |
|----|---------------------|-----------|
| NC-003-01 | `android.allowMixedContent: true` in `capacitor.config.ts` | http thumbnails from local-network servers on Android (ADR-003-02). |

### UI States
| ID | State | Trigger / Expected outcome |
|----|-------|---------------------------|
| UI-003-01 | Loading | First load: spinner in the content area. |
| UI-003-02 | Content | Sections / sub-albums and photo grid. |
| UI-003-03 | Message | Empty, failure, version too old, sign-in needed: text plus the action named in the FR. |
| UI-003-04 | Password prompt | Locked album or gallery (FR-003-05). |
| UI-003-05 | Sensitive warning | FR-003-09. |
| UI-003-06 | Load more failed | Retry at the end of the grid. |

## Telemetry & Observability
None in the proof of concept.

## Documentation Deliverables
- Roadmap row 003; knowledge map: gallery service, list and page models, pages, routes, settings page.
- ADR-003-01 (v2 API for browsing), ADR-003-02 (thumbnails through the WebView).
