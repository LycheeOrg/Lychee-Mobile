# Feature Plan 005 – Photo Upload

_Linked specification:_ [spec.md](spec.md)  
_Linked tasks:_ [tasks.md](tasks.md)  
_Status:_ Complete  
_Last updated:_ 2026-10-19

> Guardrail: Keep this plan traceable back to the governing spec. Reference FR/NFR/Scenario IDs from `spec.md` where relevant, log any new high- or medium-impact questions in the feature's [open-questions.md](open-questions.md), and assume clarifications are resolved only when the spec's normative sections and, where applicable, ADRs under `docs/specs/6-decisions/` have been updated.

## Vision & Success Criteria
A user uploads photos and videos from the phone into the album they're viewing, unchanged, with GPS intact. Success: on the Pixel 11 Pro and an iPhone, several photos and a large video upload into an album, a GPS-tagged photo shows its location in Lychee with the original's checksum, duplicates are reported, and an interrupted upload can be retried.

## Scope Alignment
- **In scope:** FR-005-01 … 06, NFR-005-01 … 05.
- **Out of scope:** spec Non-Goals (live photo pairs, background uploads, sync, metadata editing, zip/folder/URL imports).

## Dependencies & Interfaces
- **New dependency:** `@capawesome/capacitor-file-picker` `8.1.0`, pinned exactly. **Approved by the owner on 2026-10-19** by choosing Q-005-01 Option B ("use B"), with the requirement that GPS data is never removed before upload. 8.1.1 was published that morning, so the six-week-old 8.1.0 is used. Rationale in ADR-005-01.
- Android permission `ACCESS_MEDIA_LOCATION` (manifest + runtime).
- Lychee `Gallery::getUploadLimits`, `POST /api/v2/Photo` (API-005-01, 02); Feature 003 rights and reload paths.

## Assumptions & Risks
- **Assumptions:** the plugin's iOS picker with `skipTranscoding` hands over the original file including location; Android's photo picker returns unredacted files once `ACCESS_MEDIA_LOCATION` is granted.
- **Risks / Mitigations:**
  - _iOS strips location despite `skipTranscoding`_ → S-005-10 on the iPhone is the gate; if it fails, stop and revisit ADR-005-01 with the owner (e.g. `PHAsset` access).
  - _Android permission granted silently or not offered_ → device check S-005-09/10.
  - _Capacitor's Android `Range` handling is wrong_ (verified in source) → stream reader on Android (FR-005-06).
  - _iOS temporary copies pile up_ → note for the device check; the plugin manages its cache folder.

## Implementation Drift Gate
After T-005-13: map FR/NFR/S IDs to tests, rerun the quality gate, record findings below.

## Increment Map
1. **I0 – Dependency and permission:** install pinned, manifest permission, `cap sync`.
2. **I1 – Transport:** failing `lycheeHttp` test for multipart `postForm()` (no JSON content type) → implementation.
3. **I2 – Upload service** (FR-005-03, NFR-005-05): fixtures; failing `upload.test.ts` → `src/services/upload.ts`.
4. **I3 – File readers and picker** (FR-005-01, 06, NFR-005-01, 04): failing `fileChunks.test.ts`, `picker.test.ts` → `src/services/fileChunks.ts`, `src/services/picker.ts`.
5. **I4 – Queue** (FR-005-04, 05): failing `uploadQueue.test.ts` → `src/stores/uploadQueue.ts`; rights in the parsers.
6. **I5 – UI** (FR-005-02, 04, UI-005-01 … 03): Upload button, sheet, messages.
7. **I6 – Device checks** (S-005-01 … 12, NFR-005-01, 04).
8. **I7 – Docs and drift gate.**

_Commands for every increment:_ `npx vp test <file>`, `npx vp check`, `npx vp run typecheck`; I0 and I5–I6 also `npx vp run build`, `npx cap sync`.

## Scenario Tracking

| Scenario ID | Increment / Task reference | Notes |
|-------------|---------------------------|-------|
| S-005-01, 02, 08 | I2–I5; I6 | |
| S-005-03 … 06, 12 | I2 / T-005-04; I4 / T-005-08 | |
| S-005-07 | I4 (rights parsing) / T-005-08; I5 | |
| S-005-09 | I3 / T-005-06; I6 | |
| S-005-10, 11 | I6 / T-005-11, T-005-12 | the NFR-005-04 gate |

## Analysis Gate

Run 2026-10-19 by the agent.
1. Specification completeness — ✅ FR/NFR complete; Q-005-01 … 03 folded in; the owner's GPS requirement is NFR-005-04; ASCII mock-ups present.
2. Open questions review — ✅ none open; ADR-005-01 written.
3. Plan alignment — ✅ plan links spec and tasks; success criteria match.
4. Tasks coverage — ✅ every FR has tasks; tests precede code; failure branches listed (S-005-03 … 06, 09, 12).
5. Working-agreement compliance — ✅ dependency approved and recorded above; ADR-001-01, ADR-003-01 reviewed.
6. Tooling readiness — ✅ commands above; Pixel 11 Pro; iPhone through Xcode.

**Outcome:** cleared for implementation.

## Exit Criteria
- All tasks `[x]`; quality gate green; device checks recorded including NFR-005-04 on both platforms.
- Knowledge map and roadmap updated; drift gate recorded.

## Follow-ups / Backlog
- `OriginalMedia.pick()`: keep the call alive across activity recreation (Capacitor warned it couldn't save the call).
- Background uploads (Q-005-03 Option B).
- Live Photo pairs (still + video).

## Intent Log
- 2026-10-19: owner asked to start Feature 005 after merging 004. The agent read Lychee's upload route, `PhotoController::upload`, `UploadPhotoRequest`, `UploadConfig`, `FileStatus` and the web `UploadingLine.vue`, and Capacitor's `native-bridge.js` FormData handling and Android file chooser. Owner chose Q-005-01 Option B with a hard requirement that GPS is never removed, and Option A for Q-005-02/03. The agent then read the plugin's 8.1.0 native source (iOS `PHPicker` + `skipTranscoding`; Android photo picker + `ACCESS_MEDIA_LOCATION`) and Capacitor's local file handlers (iOS `Range` seeks; Android `Range` returns from byte 0), which shaped NFR-005-04, FR-005-06 and ADR-005-01.
- 2026-10-19: device check on the Pixel (Android 17, API 37): GPS missing after upload although `ACCESS_MEDIA_LOCATION` was granted (`dumpsys package` confirmed). Cause: MediaStore also needs `requireOriginal=1` on the URI, which the plugin doesn't add. Fix test-first: `requireOriginal()` in `picker.ts` appends it to picked `content://media/…` paths; Capacitor's `AndroidProtocolHandler.openContentUrl` keeps the query. Spec NFR-005-04/FR-005-01 and ADR-005-01 updated.
- 2026-10-19: re-test crashed the app: `UnsupportedOperationException: Require original is only supported for Picker URIs when location sharing is explicitly granted by the user`, thrown inside Capacitor's `WebViewLocalServer` (catches only `SecurityException`). The agent read the Android 17 SDK (no picker location API) and the device's `PhotopickerGoogle.apk` strings ("Include location" switch), logged Q-005-04; owner chose Option A: an app-local native `OriginalMedia` plugin. The JS `requireOriginal()` helper and its tests are removed (superseded by the native copy).
- 2026-10-19: third device run: no crash, the file failed with the Include location message; the log showed MediaStore refusing because the picker never offered location sharing. Strings in the picker's dex show the undocumented extra `android.provider.extra.REQUEST_LOCATION_METADATA_ACCESS` and `ACCEPT_ORIGINAL_MEDIA_FORMAT`; logged Q-005-05.
- 2026-10-19: owner chose Q-005-05 Option A; `OriginalMedia.pick()` added test-first on the JS side. Fourth device run on the Pixel (Android 17): the picker asked about location, and the uploaded photo kept its GPS in Lychee (NFR-005-04 passes on Android 17). Capacitor logged `Couldn't save last OriginalMedia's Plugin pick call` (the pick isn't restored if Android kills the app while the picker is open; backlog). Owner asked about older Android versions → Q-005-06; owner chose their own option: check GPS, upload anyway, show a notice. The agent applied it to the "Include location" off case too (fallback copy) and removed the `location_not_included` result.
- 2026-10-19: owner reported GPS uploads working on Android and iOS and the rest of the device checklist complete. The owner committed the feature as `fa8e9cd` with a commit message belonging to another change (not yet pushed).

## Drift Gate Report

Run 2026-10-19 by the agent; owner confirmed the device checks the same day.

**Preconditions:** all tasks `[x]` (T-005-00 … 20); `npx vp check`, `npx vp run typecheck`, `npx vp test` (27 files, 357 tests), `npx vp run build`, `./gradlew assembleDebug` green; `package.json` adds only `@capawesome/capacitor-file-picker` `8.1.0` (approved).

| Requirement | Code | Evidence |
|-------------|------|----------|
| FR-005-01 | `picker.ts` (iOS plugin, Android `OriginalMedia.pick()`), permission gate | `picker.test.ts` (10); devices |
| FR-005-02 | `uploadTargetFor()`, `canUpload` parsing, `UploadButton.vue` | `uploadQueue.test.ts`, parser and model tests; Unsorted on devices |
| FR-005-03 | `upload.ts` | `upload.test.ts` (19): fields, echo, final, 409/413/422/401/500/network/timeout, empty, short read |
| FR-005-04 | `uploadQueue.ts`, `UploadSheet.vue` | `uploadQueue.test.ts` (13); devices incl. Retry after airplane mode |
| FR-005-05 | `finishedRuns`/`lastDoneAlbums` watches in the pages | `uploadQueue.test.ts`; devices |
| FR-005-06 | `fileChunks.ts`, `originalMedia.ts`, `OriginalMediaPlugin.prepare/release` | `fileChunks.test.ts` (6), `originalMedia.test.ts` (8); large video on devices |
| NFR-005-01 | 4 MiB chunks, one in memory | large video uploaded on the Pixel |
| NFR-005-02 | services and queue with injected I/O | Vitest |
| NFR-005-03 | `package.json` | diff |
| NFR-005-04 | `pick()` location request, `setRequireOriginal`, location check, notice | GPS kept on Android 17 and iOS; notice for screenshots and "Include location" off |
| NFR-005-05 | `CHUNK_TIMEOUT_MS` | fake-timer test |

**Not verified:** Android versions other than 17 (Q-005-06: uploads report missing GPS instead of blocking); the location check on iOS (not implemented); the native Java code has no automated tests.

**Divergences:** substantial, all recorded through Q-005-04 … 06 and ADR-005-01: the "permission is enough" assumption was wrong on Android 17; Android picking moved from the plugin to the app's own `OriginalMediaPlugin` (`pick`, `prepare`, `release`); the owner relaxed NFR-005-04 from "never upload without GPS" to "never hide missing GPS". The plugin remains for iOS picking and the Android permission check.

**Lessons:**
- Reading library source isn't enough for platform privacy behaviour; Android's photo picker and MediaStore are Mainline modules whose rules (location switch, undocumented extra) only showed up on the device and in the picker's own code.
- A native exception inside Capacitor's local file server crashes the app; anything that can be refused must be tried in a plugin that catches it.
- Capacitor's Android `Range` handling ignores the start offset; streaming was needed.
