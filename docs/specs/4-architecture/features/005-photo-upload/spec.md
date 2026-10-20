# Feature 005 – Photo Upload

| Field | Value |
|-------|-------|
| Status | Ready |
| Last updated | 2026-10-19 |
| Owners | mlapaglia |
| Linked plan | [plan.md](plan.md) |
| Linked tasks | [tasks.md](tasks.md) |
| Roadmap entry | #005 |

> Guardrail: This specification is the single normative source of truth for the feature. Track high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), encode resolved answers directly in the Requirements/NFR/Behaviour/UI/Telemetry sections below (no per-feature `## Clarifications` sections), and use ADRs under `docs/specs/6-decisions/` for architecturally significant clarifications (referencing their IDs from the relevant spec sections).

> **Amended by Feature 010 (2026-10-20):** the Upload button became Upload photos in the toolbar's "+" menu (`AddButton`); rights and behaviour unchanged (FR-010-01).

> **Amended by Feature 009 (2026-10-20):** Android uploads use the camera's file name from MediaStore when the user grants photo access (FR-009-05, ADR-009-01).

## Overview
A user who may upload picks photos and videos on the phone and uploads them, unchanged, into the album they are looking at (or into Unsorted from the album list). Files come from the native photo pickers through `@capawesome/capacitor-file-picker` (ADR-005-01), so the exact original bytes, including GPS and other metadata, reach Lychee (NFR-005-04). Lychee's upload API takes files in chunks (`POST /api/v2/Photo`, multipart); the app reads each picked file one chunk at a time and sends it through the native HTTP transport (ADR-001-01) with the session and XSRF token, while a sheet shows each file's progress and result.

## Goals
- Upload several photos and videos at once into an album the user may upload to, or into Unsorted.
- Keep every byte of the original, including GPS.
- See each file's progress and result; retry failures; see the new photos when the queue finishes.

## Non-Goals
- Uploading Apple Live Photo pairs as pairs (the picker hands over the still).
- Automatic backup or sync of the camera roll; uploads that continue after leaving the app (Q-005-03).
- Titles, descriptions, tags or watermark choices at upload.
- Zip and folder uploads, import from URL or server, taking new photos in the app.

## Functional Requirements

| ID | Requirement | Success path | Validation path | Failure path | Telemetry & traces | Source |
|----|-------------|--------------|-----------------|--------------|--------------------|--------|
| FR-005-01 | Pick files. | Upload opens the system photo picker for several photos and videos: on iOS through `FilePicker.pickMedia({ limit: 0, skipTranscoding: true })`; on Android through the app's `OriginalMedia.pick()` (NC-005-03), which asks the picker to offer "Include location" and to return original formats (Q-005-05). On Android, the app first ensures `ACCESS_MEDIA_LOCATION` (`checkPermissions` / `requestPermissions({ permissions: ["accessMediaLocation"] })`). Each picked file gives `path`, `name`, `mimeType`, `size`, `modifiedAt`. On Android the picker shows its own "Include location" switch, which must be on for the original to be readable (NFR-005-04). | Cancelling the picker → nothing happens. | Android permission denied → no picker; "Uploading needs access to photo locations, so your photos keep their GPS data. Allow it in the app's settings." Picker error → "Couldn't open your photos." | None (no analytics in the PoC). | Q-005-01, NFR-005-04 |
| FR-005-02 | Destination. | An Upload button (toolbar, cloud icon) on album pages whose `Album::head` `resource.rights.can_upload` is true uploads into that album (`album_id` = its id); on the album list when `Albums` `rights.can_upload` is true, it uploads into Unsorted (`album_id` empty). | Hidden for guests, read-only albums, and smart albums other than Unsorted; the Unsorted smart album uploads with an empty `album_id`. | — | — | Q-005-02 |
| FR-005-03 | Chunked upload. | Before the first file, `GET /api/v2/Gallery::getUploadLimits` gives `upload_chunk_size`; the chunk size is `min(upload_chunk_size, 4 MiB)`, or 1 MiB (Lychee's own fallback) when the limits can't be read. Each file is read one chunk at a time (FR-005-06) and sent as `total_chunks = ceil(size / chunk)` multipart `POST /api/v2/Photo` requests with `album_id`, `file` (the chunk, named like the file), `file_name`, `file_last_modified_time` (ms), `chunk_number` (1-based), `total_chunks`, and `uuid_name` and `extension` empty on the first chunk and echoed from the previous response afterwards. The file is done when a response has `chunk_number === total_chunks`. | Size 0 → "Empty file", not sent. | 409 `PhotoSkippedException` → "Already in the gallery" (skipped, not an error); any other 409 (e.g. `PhotoRejectedException`) → the server's `message`; 413 `QuotaExceededException` → "Your storage quota is full"; any other 413 (web server limit) → "Too large for this server"; 422 → the server's `message`; 401 → the queue stops and the account store refreshes (FR-003-06); 419 → retried once by the transport (FR-003-07); network error or no answer within 60 s for a chunk → "Upload interrupted"; any other status → "Upload failed". | — | Lychee `UploadPhotoRequest` |
| FR-005-04 | Queue and progress. | Picked files join a queue and upload one at a time. A bottom sheet lists each file with its name, a progress bar (bytes sent / size) and its state: waiting, uploading, done, skipped (with reason), failed (with reason and Retry). The sheet opens when uploading starts and can be closed; a toolbar badge shows the count left while it is closed; the queue keeps running while the app is open. Retry puts a failed file back in the queue, restarting it from its first chunk. "Clear finished" removes done and skipped files. | Picking more while uploading appends to the queue. | Leaving the app may interrupt the current chunk; the file fails with "Upload interrupted" and can be retried. | — | Q-005-03 |
| FR-005-05 | Refresh. | When the queue becomes idle with at least one file done since it started, the destination album page (or the album list for Unsorted) reloads from its first page if it is open. | — | — | — | — |
| FR-005-06 | Reading picked files. | Android: before a file uploads, `OriginalMedia.prepare({ uri })` copies the unredacted original to the app cache and returns the copy's `file://` path; `OriginalMedia.release({ path })` deletes it after the upload, whatever the result. iOS uploads the picker's temporary copy directly. Reading: iOS `fetch(convertFileSrc(path))` with `Range: bytes=start-end` per chunk (Capacitor's iOS file handler seeks and returns exactly that slice); Android one `fetch(convertFileSrc(path))` whose body stream is read until each chunk is full (Capacitor's Android handler ignores the range start). Either way only one chunk is in memory. | A chunk shorter than expected before the end → treated as an interrupted read. | `prepare` errors other than the location refusal, or read errors → "Couldn't read this file". | — | ADR-005-01 |

## Non-Functional Requirements

| ID | Requirement | Driver | Measurement | Dependencies | Source |
|----|-------------|--------|-------------|--------------|--------|
| NFR-005-01 | Memory stays bounded for large videos: one chunk (≤ 4 MiB) is read and sent at a time. | CapacitorHttp base64-encodes `FormData` files in JavaScript. | Upload a video over 500 MB on the Pixel without the app being killed. | ADR-001-01, ADR-005-01 | — |
| NFR-005-02 | Chunk planning, request fields, result mapping, file reading and the queue are pure or injected and tested in jsdom. | Testability. | Vitest. | — | NFR-003-03 |
| NFR-005-03 | The only new dependency is `@capawesome/capacitor-file-picker`, pinned to exactly `8.1.0`. | AGENTS.md. | `package.json` diff. | ADR-005-01 | Q-005-01 |
| NFR-005-04 | **GPS is requested and its absence is reported, never hidden:** the bytes uploaded are the file's bytes as the platform hands them over (no transcoding, no re-encoding by the app). Android asks for the original with location (`ACCESS_MEDIA_LOCATION`, the picker's "Include location" request, `MediaStore.setRequireOriginal()`); iOS picks with `skipTranscoding`. On Android each copy is checked before upload: photos with `android.media.ExifInterface` (HEIF from API 28), videos with `MediaMetadataRetriever.METADATA_KEY_LOCATION`; no location, or exactly 0,0 (Android's redaction), counts as missing. A file with missing location **still uploads** and its row shows "Uploaded without GPS data" (Q-005-06). A location that can't be checked (unreadable metadata, HEIF before API 28) shows no notice. iOS isn't checked yet. | Owner requirement (2026-10-19, Q-005-01, Q-005-06). | Device check: a GPS-tagged photo from Android 17 keeps its location in Lychee (passed 2026-10-19); with "Include location" off it uploads with the notice; a screenshot uploads with the notice. | ADR-005-01 | Q-005-01, Q-005-06 |
| NFR-005-05 | Each chunk request finishes or fails within 60 s. | Slow uplinks with 4 MiB chunks. | Fake-timer test. | `withTimeout()` | — |

## UI / Interaction Mock-ups

```
 Album page with Upload               Upload sheet                        Android, location permission denied
┌──────────────────────────────┐    ┌──────────────────────────────┐    ┌──────────────────────────────┐
│ ‹      Holidays        ☁ (3) │    │ Uploading to Holidays     ✕  │    │ ‹      Holidays        ☁     │
│ ┌────┐┌────┐┌────┐           │    │ IMG_1042.HEIC                │    │                              │
│ │ ▢  ││ ▢  ││ ▢  │           │    │ ███████████░░░░░░  64%       │    │ Uploading needs access to    │
│ └────┘└────┘└────┘           │    │ VID_0007.MOV                 │    │ photo locations, so your     │
│ …                            │    │ waiting                      │    │ photos keep their GPS data.  │
│                              │    │ IMG_1040.HEIC   ✓ done       │    │ Allow it in the app's        │
│                              │    │ IMG_0999.JPG    already in   │    │ settings.                    │
│                              │    │                 the gallery  │    │ [            OK            ] │
│                              │    │ IMG_0998.JPG    ✗ Upload     │    └──────────────────────────────┘
│                              │    │   interrupted      [Retry]   │
│                              │    │ [      Clear finished      ] │
└──────────────────────────────┘    └──────────────────────────────┘
 ☁ (3): Upload button with the number of files left while the sheet is closed.
```

## Branch & Scenario Matrix

| Scenario ID | Description / Expected outcome |
|-------------|--------------------------------|
| S-005-01 | Pick three photos in an album → each uploads in chunks, shows done; the album reloads with them. |
| S-005-02 | A video larger than the chunk size → several chunks, one photo in Lychee. |
| S-005-03 | A photo already in the gallery → "Already in the gallery", skipped. |
| S-005-04 | Server rejects a file (413 or 422) → that file fails with the message; the queue continues. |
| S-005-05 | Network drops mid-file → "Upload interrupted"; Retry uploads it again from the start. |
| S-005-06 | Session ended (401) → the queue stops; sign-in handoff. |
| S-005-07 | Guest, read-only album, or a smart album other than Unsorted → no Upload button. |
| S-005-08 | Album list Upload → files land in Unsorted. |
| S-005-09 | Android with the location permission denied → message, no picker, nothing uploaded. |
| S-005-10 | Photo with GPS from Android and from iOS → location shown in Lychee; checksum equals the original (NFR-005-04). |
| S-005-11 | HEIC from iOS → uploaded as HEIC, not JPEG. |
| S-005-12 | Empty file → "Empty file", not sent. |
| S-005-13 | Android with "Include location" off in the picker → the file uploads; its row shows "Uploaded without GPS data"; the app doesn't crash. |
| S-005-14 | Photo without any GPS (e.g. a screenshot) or a video without location → uploads with the notice. |

## Test Strategy
- **Units (Vitest):** chunk planning; per-chunk request fields incl. the `uuid_name`/`extension` echo; result mapping (partial and final 2xx, 409, 413, 422, 401, other, network, 60 s timeout); upload limits parsing; both file readers (range reads; stream reads across uneven body pieces, short reads); upload permission gate; queue model (order, progress, retry, clear, idle callback, stop on 401).
- **Lychee API contract:** `UploadMetaResource` and `UploadConfig` fixtures written from the PHP classes; error bodies for 409/413/422.
- **Native:** Pixel 11 Pro and iPhone: several photos, a large video, a duplicate, airplane mode mid-upload, permission denied (Android), and NFR-005-04 with a GPS-tagged photo on each platform.

## Interface & Contract Catalogue

### Domain Objects
| ID | Description | Modules |
|----|-------------|---------|
| DO-005-01 | `PickedFile`: `{ path, name, mimeType, size, modifiedAt }`. | `src/services/picker.ts` |
| DO-005-02 | `UploadResult`: `done` (with `withoutLocation: true` when NFR-005-04's check found no location), `skipped` (409 `PhotoSkippedException`), `quota` (413 `QuotaExceededException`), `too_large` (other 413), `rejected` (other 409 or 422, with the server's message), `empty`, `interrupted`, `unreadable`, `unauthenticated`, `failed`. | `src/services/upload.ts` |
| DO-005-03 | Queue entry: `{ id, file, state: waiting \| uploading \| done \| skipped \| failed, sent, result }`. | `src/stores/uploadQueue.ts` |

### API Routes / Services
| ID | Transport | Description | Notes |
|----|-----------|-------------|-------|
| API-005-01 | `GET /api/v2/Gallery::getUploadLimits` | `UploadConfig`: `upload_chunk_size` (bytes), `upload_processing_limit`, `can_watermark_optout`, … | |
| API-005-02 | `POST /api/v2/Photo` (multipart, no JSON content type) | Fields per FR-005-03; response `UploadMetaResource { file_name, extension, uuid_name, stage, chunk_number, total_chunks, expected_id, title, description }`; `stage` `uploading` until the last chunk, then `processing`/`done`/`skipped`/`error`. | `content_type:multipart`; `AlbumPolicy::CAN_UPLOAD` |
| API-005-03 | `Album::head` `resource.rights.can_upload`; `Albums` `rights.can_upload` | Upload rights (FR-005-02). | |

### Native Capabilities
| ID | Plugin / permission | Behaviour |
|----|---------------------|-----------|
| NC-005-01 | `@capawesome/capacitor-file-picker` `8.1.0` `pickMedia` | Native photo pickers; iOS `PHPickerViewController` with `skipTranscoding` copies the original to a temporary file; Android's photo picker returns `content://` URIs. |
| NC-005-02 | Android `ACCESS_MEDIA_LOCATION` (manifest + runtime) | Unredacted GPS in picked photos (NFR-005-04). |
| NC-005-03 | App-local Capacitor plugin `OriginalMedia` (`android/app/src/main/java/com/mlapaglia/lycheemobile/OriginalMediaPlugin.java`) | `pick()` → `{ files }`: launches `MediaStore.ACTION_PICK_IMAGES` with `EXTRA_PICK_IMAGES_MAX` (the platform limit), image and video types, `EXTRA_ACCEPT_ORIGINAL_MEDIA_FORMAT` and the undocumented `android.provider.extra.REQUEST_LOCATION_METADATA_ACCESS` (found in the picker's code, Q-005-05); returns each URI with `name`, `mimeType`, `size`, `modifiedAt` (date taken) read from the picker's columns; rejects with `CANCELLED` or `UNAVAILABLE` (no system photo picker). `prepare({ uri })` → `{ path }`: copies `MediaStore.setRequireOriginal(uri)` to `cacheDir/uploads/`; returns `{ path, location: "present" | "missing" | "unknown" }`; when MediaStore refuses the original (`UnsupportedOperationException`/`SecurityException`, "Include location" off) it copies the URI without `requireOriginal` and reports `missing`; other failures reject with `UNREADABLE`. `release({ path })` deletes a copy in that folder. Leftover copies are deleted when the plugin loads. |

### UI States
| ID | State | Trigger / Expected outcome |
|----|-------|---------------------------|
| UI-005-01 | Upload button | Toolbar cloud icon, badge with files left while uploading. |
| UI-005-02 | Upload sheet | Per-file rows with progress and results; Retry; Clear finished. |
| UI-005-03 | Permission message | Android permission denied (FR-005-01). |

## Telemetry & Observability
None in the proof of concept.

## Documentation Deliverables
- Roadmap row 005; knowledge map: picker, upload service, file readers, queue, sheet.
- ADR-005-01 (file picker, GPS preservation, reading strategy).
