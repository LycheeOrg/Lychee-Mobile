# Feature 007 – Photo Download and Delete

| Field | Value |
|-------|-------|
| Status | Complete |
| Last updated | 2026-10-20 |
| Owners | mlapaglia |
| Linked plan | [plan.md](plan.md) |
| Linked tasks | [tasks.md](tasks.md) |
| Roadmap entry | #007 |

> Guardrail: This specification is the single normative source of truth for the feature. Track high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), encode resolved answers directly in the Requirements/NFR/Behaviour/UI/Telemetry sections below (no per-feature `## Clarifications` sections), and use ADRs under `docs/specs/6-decisions/` for architecturally significant clarifications (referencing their IDs from the relevant spec sections).

## Overview
In an album's photo grid, the user selects one or more photos and either downloads them to the phone's photo library or deletes them from Lychee. Selection is a new mode of `PhotoGrid` on `AlbumPage`; delete is one `DELETE /api/v2/Photo` call through the existing transport (ADR-001-01). Download fetches each photo's original through `GET /api/v2/Zip` (a single photo streams as the file itself) with `@capacitor/file-transfer` into the app cache, then adds it to the library with `@capacitor-community/media` on iOS and the app's `OriginalMedia` plugin on Android (Q-007-01, Q-007-07, ADR-007-01). Downloaded bytes never pass through the JavaScript bridge (NFR-007-01). Both actions follow the album's rights from `Album::head`; the server stays the authority.

## Goals
- Select photos in the grid, with a clear count and an easy way out.
- Download the selected photos and videos, unchanged (originals with GPS and other metadata), into the phone's photo library, where they stay if the app is uninstalled.
- Delete the selected photos after a confirmation that says what Lychee will do, and see them leave the grid.
- Offer selection in every photo grid, and enable each action only where the server grants it and where it does what it says.

## Non-Goals
- Download or delete from the photo viewer (Feature 004); a later feature (Q-007-06).
- Downloading or deleting whole albums; zip archives; choosing the size variant per download; downloads are always the original (Q-007-02).
- Saving iOS Live Photo pairs as Live Photos; the still is saved (Q-007-05).
- Delete in Recent, Starred, On This Day, tag and person albums (Q-007-03, Appendix).
- Saving into a named album in the iOS Photos app.
- Move, copy, star, rename, tag or any other photo edit.
- Selecting photos that aren't loaded yet ("Select all" across pages).
- Downloads that continue after leaving the app.
- Undo after delete (Lychee has no trash).

## Functional Requirements

| ID | Requirement | Success path | Validation path | Failure path | Telemetry & traces | Source |
|----|-------------|--------------|-----------------|--------------|--------------------|--------|
| FR-007-01 | Selection mode. | Long-pressing a photo tile selects it and enters selection mode: on Android the WebView's own long press (`contextmenu`, about 400 ms, with the system vibration; its menu is suppressed), elsewhere a 500 ms hold without moving; whichever comes first acts once; a **Select** toolbar button enters it with nothing selected (Q-007-04). In selection mode a tap or a long press toggles a tile (check mark overlay, dimmed tile) instead of opening the viewer; the toolbar shows "N selected" with **Cancel** in place of Back and Upload; a bottom toolbar shows **Download** and **Delete**. Infinite scroll keeps loading pages; selections persist across loaded pages. | The Select button and long-press are offered whenever the album shows photos, whatever the rights (owner, 2026-10-20). Download and Delete are disabled with 0 selected or without their right (FR-007-02). | Cancel, Android back, leaving the page, pull to refresh, or a reload (FR-005-05) clear the selection and leave selection mode. | None. | Owner request 2026-10-20 |
| FR-007-02 | Rights. | Both buttons always show in selection mode (owner, 2026-10-20). **Download** is enabled when `Album::head` `resource.rights.can_download` is true. **Delete** is enabled when `resource.rights.can_delete` is true **and** the page is a regular album or the Unsorted smart album. | Without the right, the button stays visible and disabled; guests, tag and person albums, and Recent, Starred and On This Day always have Delete disabled. | The server still checks each request (`PhotoPolicy::CAN_DELETE_BY_ID`, `PhotoPolicy::CAN_DOWNLOAD`); its refusals are handled in FR-007-03 and FR-007-04. | — | Q-007-03; Appendix |
| FR-007-03 | Delete. | Delete opens an alert: title "Delete N photos?" (or "Delete this photo?"), text "Photos that are also in other albums are only removed from this album. This can't be undone.", buttons Cancel / **Delete** (destructive). Confirming sends one `DELETE /api/v2/Photo` with JSON `{ photo_ids: [...], from_id: <album id or "unsorted"> }`; a spinner replaces the bottom toolbar. On 204 the photos leave the grid locally, `photoTotal` drops by N, and selection mode ends; when more photo pages remain, the next page to load becomes `floor(photos still shown / page size) + 1` (page size = the first photo page's length) and photos already shown are dropped from it, so the photos that moved up are not skipped. | — | 401 → session recovery once (`recoverSession()`, FR-006-03), then retry; still 401 → sign-in handoff (FR-003-06). 403 → "You can't delete some of these photos." 419 → retried by the transport (FR-003-07). 422 or other status → "Couldn't delete the photos." Network error → "Couldn't reach the server. Nothing was deleted." No answer in 30 s → "The server didn't answer. Some photos may have been deleted." and the album reloads. On any failure the selection stays so the user can retry. | — | Q-007-03; Lychee `DeletePhotosRequest` |
| FR-007-04 | Download. | Download saves the selected photos one at a time. For each photo: (1) `FileTransfer.downloadFile({ url: <server>/api/v2/Zip?photo_ids=<id>&variant=ORIGINAL&from_id=<album id>, path: <cache>/downloads/<photo id>.<ext>, headers: { Cookie: <server cookies> }, progress: true, connectTimeout: 10000, readTimeout: 60000 })` (Q-007-02); the cache path comes from `Filesystem.getUri({ directory: Cache })` (Q-007-08); `<ext>` per FR-007-06. (2) The file is added to the library: iOS `Media.savePhoto({ path })` or `Media.saveVideo({ path })` per FR-007-06 (camera roll, no album); Android `OriginalMedia.saveToGallery({ path, name, mimeType })` into `Pictures/Lychee` or `Movies/Lychee` (Q-007-07). (3) The cache file is deleted whatever the result; leftovers in `downloads/` are deleted when a run starts. A bar above the bottom toolbar shows "Saving 2 of 5" and the current file's progress (`bytes / contentLength` when `lengthComputable`). Selection mode ends when the run starts; the user may keep browsing in the album. When done: "Saved 5 photos to your library." or "Saved 4 of 5. 1 couldn't be saved." with **Retry failed**. | Live photos save the still only (Q-007-05). A second Download while a run is going appends to it. | Library permission denied → the run stops: "Saving needs permission to add to your photos. Allow it in the app's settings." Per photo (file-transfer `error.data.httpStatus`): 401 → session recovery once and retry, still 401 → the run stops with the sign-in handoff; 403 → "not allowed"; 404 → "no longer on the server"; connection error or read timeout → "interrupted"; library or storage error → "couldn't be saved". Other per-photo failures don't stop the run. | — | Q-007-01; Lychee `ZipRequest`, `BaseArchive::do()` |
| FR-007-05 | Library permission. | iOS: the media plugin asks for add-only access (`NSPhotoLibraryAddUsageDescription`) on the first save. Android 10+ (API 29+): `MediaStore` insert, no permission. Android 7–9 (API 24–28): `WRITE_EXTERNAL_STORAGE` (`maxSdkVersion="28"`) asked on the first download (Q-007-07). | Never asked at launch. | Denied, or "Don't ask again" → the message of FR-007-04. | — | Q-007-01 |
| FR-007-06 | File type and name. | The extension is the one in the path of the original variant's URL (query ignored), which is the stored file's; when the original URL is missing (downgraded variants), it comes from the photo's `type` (MIME): `image/jpeg` → `jpg`, `image/heic` → `heic`, `image/heif` → `heif`, `image/png` → `png`, `image/gif` → `gif`, `image/webp` → `webp`, `video/mp4` → `mp4`, `video/quicktime` → `mov`; otherwise the photo is skipped as "couldn't be saved". The save call is `saveVideo` for photos of kind `video` (`precomputed.is_video`), else `savePhoto`. The saved name (Android) is the photo's title with characters other than letters, digits, space, `-`, `_` and `.` replaced by `_`, or the photo id when the title is empty. | — | — | — | file-transfer returns no response headers; Appendix (RAW photos) |

## Non-Functional Requirements

| ID | Requirement | Driver | Measurement | Dependencies | Source |
|----|-------------|--------|-------------|--------------|--------|
| NFR-007-01 | Downloaded bytes never cross the JavaScript bridge: file-transfer streams each response to a cache file and the library save reads that file natively. | CapacitorHttp returns response bodies to JavaScript as strings; a 1 GB video would not fit. | Download a video over 500 MB on the Pixel and an iPhone without the app being killed. | NC-007-01 | NFR-005-01 |
| NFR-007-02 | Downloads keep the file as Lychee stores it: the `ORIGINAL` variant, written unchanged (no transcoding), so GPS and other metadata survive. | Mirror of NFR-005-04. | Device check on both platforms: a GPS-tagged photo uploaded by Feature 005 and downloaded again has the same checksum and shows its location in Photos / Google Photos. iOS photos pass through SDWebImage's downloader as raw data into `PHAssetCreationRequest.addResource(.photo, data:)`, so the checksum check is required there. | NC-007-02 | NFR-005-04 (Q-007-02) |
| NFR-007-03 | New dependencies, pinned to exact versions: `@capacitor/file-transfer` `2.0.6` and `@capacitor-community/media` `9.1.0` (owner-approved, Q-007-01), and `@capacitor/filesystem` `8.1.5` (owner-approved, Q-007-08). Transitive native libraries: `ion-ios-filetransfer` and `ionfiletransfer-android` (file-transfer), SDWebImage via SPM and OkHttp on Android (media). | AGENTS.md dependency rule. | `package.json` diff; rationale in the plan. | NC-007-01 … NC-007-03 | Q-007-01, Q-007-08 |
| NFR-007-04 | Selection state, rights gating, request building, MIME mapping, result mapping and the download run are pure or injected and tested in jsdom. | Testability. | Vitest. | — | NFR-003-03 |
| NFR-007-05 | Destructive action safety: Delete always confirms, names the count and says that it can't be undone. | No trash in Lychee. | Component test. | — | — |
| NFR-007-06 | The session cookie reaches the download request on both platforms. | file-transfer uses its own HTTP stack (`URLSession` on iOS, the Ionic Android library), not CapacitorHttp. | Device check: download a photo from a private album on the Pixel and an iPhone. | `lycheeHttp` cookie reader | ADR-001-01 |

## UI / Interaction Mock-ups

Phone:

```
 Album page (unchanged entry)        Selection mode                       Delete confirmation
┌──────────────────────────────┐   ┌──────────────────────────────┐    ┌──────────────────────────────┐
│ ‹    Holidays    Select  ☁   │   │ Cancel     3 selected        │    │                              │
│ ┌────┐┌────┐┌────┐           │   │ ┌────┐┌────┐┌────┐           │    │  Delete 3 photos?            │
│ │ ▢  ││ ▢  ││ ▢  │           │   │ │ ✓▒ ││ ▢  ││ ✓▒ │           │    │                              │
│ └────┘└────┘└────┘           │   │ └────┘└────┘└────┘           │    │  Photos that are also in     │
│ ┌────┐┌────┐┌────┐           │   │ ┌────┐┌────┐┌────┐           │    │  other albums are only       │
│ │ ▢  ││ ▢ ▶││ ▢  │           │   │ │ ▢  ││ ✓▒▶││ ▢  │           │    │  removed from this album.    │
│ └────┘└────┘└────┘           │   │ └────┘└────┘└────┘           │    │  This can't be undone.       │
│  long-press a tile ─► select │   │ …                            │    │                              │
│                              │   │──────────────────────────────│    │   [ Cancel ]   [ Delete ]    │
│                              │   │   ⤓ Download    🗑 Delete     │    │                  (red)       │
└──────────────────────────────┘   └──────────────────────────────┘    └──────────────────────────────┘
 ✓▒: selected tile (check mark, dimmed). ▶: video badge (Feature 003).
 Download and Delete always show; each is disabled without its right (Delete: can_delete in regular albums and Unsorted).

 Download running                    Download finished with a failure     Library permission denied
┌──────────────────────────────┐   ┌──────────────────────────────┐    ┌──────────────────────────────┐
│ ‹    Holidays    Select  ☁   │   │ ‹    Holidays    Select  ☁   │    │                              │
│ ┌────┐┌────┐┌────┐           │   │ ┌────┐┌────┐┌────┐           │    │  Saving needs permission to  │
│ │ ▢  ││ ▢  ││ ▢  │           │   │ │ ▢  ││ ▢  ││ ▢  │           │    │  add to your photos. Allow   │
│ └────┘└────┘└────┘           │   │ └────┘└────┘└────┘           │    │  it in the app's settings.   │
│ …                            │   │ …                            │    │                              │
│──────────────────────────────│   │──────────────────────────────│    │   [            OK          ] │
│ Saving 2 of 5                │   │ Saved 4 of 5. 1 couldn't be  │    └──────────────────────────────┘
│ ██████████░░░░░░░░  58%      │   │ saved.  [Retry failed]   ✕   │
└──────────────────────────────┘   └──────────────────────────────┘
```

Tablet: same layout; the grid has 5 or 7 columns (Feature 003) and the bottom toolbar spans the page.

## Branch & Scenario Matrix

| Scenario ID | Description / Expected outcome |
|-------------|--------------------------------|
| S-007-01 | Long-press a tile → selection mode with it selected; tap two more → "3 selected"; Cancel → mode ends, nothing selected. |
| S-007-02 | In selection mode a tap toggles the tile and never opens the viewer. |
| S-007-03 | Album without `can_download` and `can_delete` → Select and long-press still enter selection mode; Download and Delete are disabled. |
| S-007-04 | Recent, Starred, On This Day, tag or person album → Delete disabled; Download follows `can_download`. |
| S-007-05 | Delete 3 photos in a regular album → confirmation; 204 → they leave the grid and the count drops. |
| S-007-06 | Delete in Unsorted → `from_id: "unsorted"`; photos removed. |
| S-007-07 | Delete refused (403) → message; selection kept. |
| S-007-08 | Delete with the session expired → silent sign-in, then the delete succeeds. |
| S-007-09 | Delete times out → message; album reloads. |
| S-007-10 | Download 3 photos (JPEG, HEIC, MOV) → all three in Photos / Google Photos with original bytes and GPS. |
| S-007-11 | Download a video over 500 MB → saved; the app isn't killed (NFR-007-01). |
| S-007-12 | Library permission denied → message, the run stops. |
| S-007-13 | One photo fails mid-run (network drop) → the run continues; summary with Retry failed; retry saves it. |
| S-007-14 | Android 7–9 → `WRITE_EXTERNAL_STORAGE` asked once, then saved into `Pictures/Lychee` (Q-007-07). |
| S-007-15 | Pull to refresh while selecting → selection cleared. |
| S-007-16 | Download from a private album (session cookie needed) → saved on both platforms (NFR-007-06). |
| S-007-17 | Uninstall the app after downloading → the photos stay in the library (Q-007-07). |
| S-007-18 | Photo with an unknown `type` and no original URL → "couldn't be saved"; the run continues. |
| S-007-19 | Delete photos while more pages remain, then scroll on → every remaining photo appears once. |

## Test Strategy
- **Units (Vitest):** selection model (enter, toggle, count, clear on reload); rights gating per album kind and rights; delete request body (`from_id` for regular albums and Unsorted); delete result mapping (204, 401 with recovery, 403, 419, 422, other, network, 30 s timeout); download URL building; MIME → extension and save call; file name sanitising; file-transfer error mapping (`httpStatus` 401/403/404, connection error, timeout); download run with injected file-transfer, filesystem and saver (order, progress, per-file failures, retry failed, append, stop on 401 and on permission denied, cache cleanup); messages.
- **Units:** `enabledActions()` (rights × selection count).
- **Components (Vitest + @vue/test-utils):** `PhotoGrid` long-press vs tap in both modes; selection toolbar; delete confirmation text and count; download bar states.
- **Lychee API contract:** `Album::head` fixtures with `can_delete`/`can_download` true and false; 403/422 error bodies for `DELETE Photo`.
- **Native:** Pixel 11 Pro and iPhone: S-007-10 … S-007-17; Android 9 emulator for S-007-14; checksum comparison for NFR-007-02.

## Interface & Contract Catalogue

### Domain Objects
| ID | Description | Modules |
|----|-------------|---------|
| DO-007-01 | `PhotoSelection`: `{ active: boolean, ids: Set<string> }`, cleared by reload. | `src/stores/photoSelection.ts` (proposed) |
| DO-007-02 | `AlbumHead` gains `canDownload` and `canDelete` (from `resource.rights`); `PhotoTile` gains `mimeType` (from `type`). | `src/services/galleryParsers.ts` |
| DO-007-03 | `DeleteResult`: `ok`, `unauthenticated`, `forbidden`, `failed`, `unreachable`, `timeout`. | `src/services/gallery.ts` (`Gallery.deletePhotos`), `src/stores/albumPage.ts` (recovery, local removal) |
| DO-007-04 | `SaveResult` per photo: `saved`, `forbidden`, `not_found`, `interrupted`, `unsaveable`, `unauthenticated`, `permission_denied`; run state `{ total, done, current: { bytes, total } \| null, failed[] }`. | `src/services/download.ts`, `src/stores/downloadRun.ts` (proposed) |

### API Routes / Services
| ID | Transport | Description | Notes |
|----|-----------|-------------|-------|
| API-007-01 | `DELETE /api/v2/Photo` (JSON) | Body `{ photo_ids: string[] (min 1), from_id: album ID or smart album ID }`; 204 no body. | `PhotoPolicy::CAN_DELETE_BY_ID`; unchanged since 7.1.0. `lycheeHttp` gains a JSON DELETE. |
| API-007-02 | `GET /api/v2/Zip?photo_ids=<id>&variant=ORIGINAL&from_id=<album id>` | One photo → the file itself (`BaseArchive::file()`); several → a zip (not used). No JSON content-type or accept middleware on this route; GET needs no XSRF token. | `PhotoPolicy::CAN_DOWNLOAD`; `RAW` gated by `raw_download_enabled`. Fetched by file-transfer (NC-007-01) with the session cookie. |
| API-007-03 | `Album::head` `resource.rights.can_download`, `resource.rights.can_delete`; photo `type` | Gating (FR-007-02), file type (FR-007-06). | Already in the responses; parsers extended. |

Supported server versions: Lychee 7.1.0 and later (`MIN_BROWSING_VERSION`); both endpoints checked at 7.1.0 and 7.11.1.

### Native Capabilities
| ID | Plugin / permission | Behaviour |
|----|---------------------|-----------|
| NC-007-01 | `@capacitor/file-transfer` `2.0.6` | `downloadFile` streams to a cache path with `progress` events (throttled to 100 ms); rejects with `error.data.httpStatus` on HTTP errors. |
| NC-007-02 | `@capacitor-community/media` `9.1.0`, used on iOS only (Q-007-07); its Android half ships unused | `savePhoto({ path })` / `saveVideo({ path })` without `albumIdentifier` → camera roll with add-only authorisation. |
| NC-007-03 | `@capacitor/filesystem` `8.1.5` (Q-007-08) | `getUri({ directory: Cache, path: "downloads/…" })` for file-transfer's target; `deleteFile` / `rmdir` for cleanup. |
| NC-007-04 | App-local `OriginalMedia.saveToGallery({ path, name, mimeType })` (Android) (Q-007-07) | API 29+: `MediaStore` insert with `RELATIVE_PATH` `Pictures/Lychee` or `Movies/Lychee` and `IS_PENDING`, byte copy, then clear `IS_PENDING`. API 24–28: copy into the public `Pictures/Lychee` or `Movies/Lychee` folder and scan it. Rejects with `PERMISSION_DENIED` or `UNSAVEABLE`. |
| NC-007-05 | iOS `NSPhotoLibraryAddUsageDescription` | "Lychee saves the photos you download to your library." |
| NC-007-06 | Android `WRITE_EXTERNAL_STORAGE` with `android:maxSdkVersion="28"` (Q-007-07) | Saving on Android 7–9 only. |

### UI States
| ID | State | Trigger / Expected outcome |
|----|-------|---------------------------|
| UI-007-01 | Selection mode | FR-007-01. |
| UI-007-02 | Delete confirmation | FR-007-03. |
| UI-007-03 | Deleting | Spinner in the bottom toolbar. |
| UI-007-04 | Download bar | Running and finished states (FR-007-04). |
| UI-007-05 | Permission message | FR-007-05. |

## Telemetry & Observability
None in the proof of concept. The Cookie header passed to file-transfer is never logged (bridge logging stays off, NFR-006-01).

## Documentation Deliverables
- Roadmap row 007; knowledge map: selection store, photo actions and download services, file-transfer, media and filesystem plugins, `OriginalMedia.saveToGallery`, `DELETE Photo` and `Zip` in the Lychee server section, new permissions.
- ADR-007-01 for the download path (libraries, cache files, cookie, library saving per platform, permissions).
- Plan: dependency rationale and the native hand edits (`Info.plist` usage string, Android manifest permission, `OriginalMediaPlugin`).

## Fixtures & Sample Data
- `src/services/__fixtures__/lychee-7.11.1/album-head-*.json` variants with `can_delete` / `can_download` set.
- Error bodies for `DELETE Photo` 403 and 422.
- Photo payloads with `type` `image/heic` and `video/quicktime`.

## Spec DSL

```
domain_objects:
  - id: DO-007-01
    name: PhotoSelection
  - id: DO-007-02
    name: AlbumHead.canDownload/canDelete, PhotoTile.mimeType
  - id: DO-007-03
    name: DeleteResult
  - id: DO-007-04
    name: SaveResult
routes:
  - id: API-007-01
    method: DELETE
    path: /api/v2/Photo
  - id: API-007-02
    method: GET
    path: /api/v2/Zip
  - id: API-007-03
    method: GET
    path: /api/v2/Album::head
native_capabilities:
  - id: NC-007-01
    plugin: "@capacitor/file-transfer@2.0.6"
  - id: NC-007-02
    plugin: "@capacitor-community/media@9.1.0 (iOS)"
  - id: NC-007-03
    plugin: "@capacitor/filesystem@8.1.5"
  - id: NC-007-04
    plugin: app-local OriginalMedia.saveToGallery (Android)
  - id: NC-007-05
    plugin: iOS NSPhotoLibraryAddUsageDescription
  - id: NC-007-06
    plugin: Android WRITE_EXTERNAL_STORAGE (maxSdkVersion 28)
ui_states:
  - id: UI-007-01
    description: Selection mode
  - id: UI-007-02
    description: Delete confirmation
  - id: UI-007-03
    description: Deleting
  - id: UI-007-04
    description: Download bar
  - id: UI-007-05
    description: Library permission message
```

## Appendix

### What Lychee's delete does (`App\Actions\Photo\Delete`, 7.1.0 – 7.11.1)
`DELETE /api/v2/Photo` always runs against one album, `from_id`:
- A photo in no album (Unsorted) is deleted for good, files included.
- A photo in `from_id` and no other album is deleted for good.
- A photo also in other albums is only unlinked from `from_id`; it stays in the others.
- With `from_id` set to Recent, Starred or On This Day, a photo that lives in a real album is in "other albums" and not linked to the smart album, so **nothing happens** and the server still answers 204. Hence FR-007-02 limits Delete to regular albums and Unsorted.

Authorisation (`PhotoPolicy::canDeleteById`): the user may upload and owns every photo, or every photo is in albums whose parent grants delete. `rights.can_delete` on `Album::head` is the album's own delete right, which Lychee's web UI also uses to show photo Delete.

### RAW photos
When Lychee converts a RAW upload, it stores a JPEG as the `ORIGINAL` variant and the camera file as the `RAW` variant (`CreateRawSizeVariant`), but the photo's `type` stays the camera MIME (e.g. `image/x-canon-cr2`, set by `HydrateMetadata` from the source's EXIF), and the single-file `Zip` response even sends that `type` as `Content-Type`. The original variant's URL carries the stored file's real extension, so FR-007-06 prefers it.

### What a single-photo `Zip` returns
`BaseArchive::do()` streams the one size variant as the file itself (`BaseArchive::file()`) with a `Content-Disposition` file name; two or more photos give a zip. The app always requests one photo per call.

### Library findings (read from the published packages, 2026-10-20)
- `@capacitor/file-transfer` 2.0.6: `downloadFile({ url, path, headers, progress, connectTimeout, readTimeout })` → `{ path }`; `path` must be a full file path ("use `@capacitor/filesystem`"); no response headers on success; HTTP errors reject with `error.data.httpStatus`; Android asks for storage permission only for public-directory targets. No cookie handling of its own.
- `@capacitor-community/media` 9.1.0, iOS: `savePhoto` loads the file through SDWebImage's downloader and adds the raw data with `PHAssetCreationRequest.addResource(.photo, data:)`; `saveVideo` uses `creationRequestForAssetFromVideo(atFileURL:)`; add-only authorisation when no album is given.
- `@capacitor-community/media` 9.1.0, Android: `albumIdentifier` is required and must be a folder under `getExternalMediaDirs()[0]` (`Android/media/<application ID>/`); the file is byte-copied there and a media scan is broadcast; no permission outside "gallery mode". Android removes that folder when the app is uninstalled (Q-007-07).
