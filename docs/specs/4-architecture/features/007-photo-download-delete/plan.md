# Feature Plan 007 – Photo Download and Delete

_Linked specification:_ [spec.md](spec.md)  
_Linked tasks:_ [tasks.md](tasks.md)  
_Status:_ In progress  
_Last updated:_ 2026-10-20

> Guardrail: Keep this plan traceable back to the governing spec. Reference FR/NFR/Scenario IDs from `spec.md` where relevant, log any new high- or medium-impact questions in the feature's [open-questions.md](open-questions.md), and assume clarifications are resolved only when the spec's normative sections and, where applicable, ADRs under `docs/specs/6-decisions/` have been updated.

## Vision & Success Criteria
In an album's grid the user selects photos and either saves them to the phone's photo library or deletes them from Lychee. Success: on the Pixel 11 Pro and an iPhone, a JPEG, a HEIC and a large video download into Photos / Google Photos with the original checksum and GPS; a private album downloads with the session cookie; Android downloads stay after uninstalling the app; deleting in a regular album and in Unsorted removes the photos, and Delete never shows where it would do nothing.

## Scope Alignment
- **In scope:** FR-007-01 … 06, NFR-007-01 … 06.
- **Out of scope:** spec Non-Goals (viewer actions, album downloads, zip, variant choice, Live Photo pairs, delete in smart, tag and person albums other than Unsorted, named iOS album, other edits, select all, background downloads, undo).

## Dependencies & Interfaces
- **New dependencies, pinned exactly, approved by the owner on 2026-10-20:** `@capacitor/file-transfer` `2.0.6` and `@capacitor-community/media` `9.1.0` (Q-007-01 Option B), `@capacitor/filesystem` `8.1.5` (Q-007-08 Option A). Rationale and the per-platform split in ADR-007-01. All three declare `@capacitor/core >= 8.0.0`.
- **Native hand edits** (Capacitor can't express them): iOS `Info.plist` `NSPhotoLibraryAddUsageDescription`; Android manifest `WRITE_EXTERNAL_STORAGE` with `android:maxSdkVersion="28"`; `OriginalMediaPlugin.saveToGallery()` (Q-007-07 Option A).
- Lychee `DELETE /api/v2/Photo`, `GET /api/v2/Zip`, `Album::head` rights, photo `type` (API-007-01 … 03), checked against v7.1.0 and v7.11.1.
- Existing modules: `lycheeHttp` (gains a JSON DELETE; its `readCookies` builds the download cookie), `galleryParsers`, `albumPage` store, `galleryContext.recoverSession()`, `pressAndHold.ts` (long-press, `delayMs: 500`), `PhotoGrid`, `AlbumPage`.

## Assumptions & Risks
- **Assumptions:** file-transfer's native stacks send a `Cookie` header we pass in; the media plugin's iOS `savePhoto` accepts a `file://` path (SDWebImage loads file URLs) and stores the bytes unchanged.
- **Risks / Mitigations:**
  - _Cookie header ignored or overridden_ (iOS `URLSession` merges `HTTPCookieStorage`, which CapacitorHttp shares, so it should still work there; Android unknown) → I7 device spike before the UI work; fall back to the owner if a private album fails.
  - _iOS photo bytes changed by SDWebImage_ → checksum check (NFR-007-02) in the I7 spike; if it fails, stop and revisit ADR-007-01 with the owner.
  - _Long-press fights scrolling or fires the viewer tap_ → `pressAndHold` tolerance cancels on movement; the click after a hold is swallowed; component tests for both.
  - _Delete timeout leaves an unknown state_ → reload the album (FR-007-03).
  - _MediaStore differences on API 29 vs 30+_ → Android 10 emulator in I8.
  - _Unknown MIME types_ → fallback to the URL extension, else "couldn't be saved" (FR-007-06, S-007-18).

## Implementation Drift Gate
After T-007-21: map FR/NFR/S IDs to code and tests, rerun the quality gate, record findings in a Drift Gate Report section below.

## Increment Map
1. **I0 – Dependencies and native config** (NFR-007-03, NC-007-01 … 03, 05, 06): install the three pinned packages, usage string, manifest permission, `cap sync`, Android build.
2. **I1 – Parsers and rights** (FR-007-02, FR-007-06, DO-007-02): fixtures; failing parser tests for `canDownload`, `canDelete`, `mimeType`; failing `photoActions` gating tests (album kinds × rights) → implementation.
3. **I2 – Delete service** (FR-007-03, API-007-01, DO-007-03): failing `lycheeHttp` DELETE tests; failing `deletePhotos()` tests (body, 204, 401 recovery, 403, 419, 422, other, network, 30 s) → implementation.
4. **I3 – Selection and local removal** (FR-007-01, DO-007-01): failing `photoSelection` tests (enter, toggle, count, clear); failing `albumPage.removePhotos()` tests → implementation.
5. **I4 – Download helpers** (FR-007-04, FR-007-06): failing tests for the `Zip` URL, cookie header, MIME → extension and save kind, file name sanitising, file-transfer error mapping → implementation.
6. **I5 – Download run** (FR-007-04, FR-007-05, DO-007-04): failing run tests with injected transfer, filesystem and saver (order, progress, per-file failures, retry failed, append, stop on 401 after recovery and on permission denied, cache cleanup) → implementation.
7. **I6 – Platform savers** (NC-007-02, NC-007-04): failing JS tests for the saver choice per platform and the plugin error mapping → `OriginalMediaPlugin.saveToGallery()` (Java) and bindings; Android build.
8. **I7 – Device spike** (NFR-007-02, NFR-007-06): call the run from a dev-only path on the Pixel and the iPhone with a private-album HEIC and a video; compare checksums. Gate for I8.
9. **I8 – UI** (FR-007-01 … 05, UI-007-01 … 05): messages first (tests), `PhotoGrid` selection mode and long-press (component tests), `AlbumPage` toolbars, delete alert, download bar.
10. **I9 – Device checks** (S-007-01 … 18): Pixel 11 Pro, iPhone, Android 9 and 10 emulators.
11. **I10 – Docs and drift gate:** knowledge map, roadmap, drift gate report.

_Commands for every increment:_ `npx vp test <file>`, `npx vp check`, `npx vp run typecheck`; I0, I6 and I8–I9 also `npx vp run build`, `npx cap sync`, `cd android && ./gradlew assembleDebug`.

## Scenario Tracking

| Scenario ID | Increment / Task reference | Notes |
|-------------|---------------------------|-------|
| S-007-01, 02, 15 | I3 / T-007-07, 08; I8 / T-007-17, 18 | |
| S-007-03, 04 | I1 / T-007-02, 03 | |
| S-007-05 … 09 | I2 / T-007-04 … 06; I3 / T-007-08; I8 | |
| S-007-10, 11, 16 | I7 / T-007-15; I9 / T-007-20 | NFR-007-01, 02, 06 |
| S-007-12, 13 | I5 / T-007-11, 12 | |
| S-007-14, 17 | I6 / T-007-13, 14; I9 | Android 9 emulator; uninstall on the Pixel |
| S-007-18 | I4 / T-007-09, 10 | |

## Analysis Gate

Run 2026-10-20 by the agent.
1. Specification completeness — ✅ goals, FR-007-01 … 06 and NFR-007-01 … 06 complete; Q-007-01 … 08 folded into the normative sections; phone mock-ups present, tablet noted.
2. Open questions review — ✅ none open; ADR-007-01 written for Q-007-01, 02, 07, 08 and linked from the spec and the log.
3. Plan alignment — ✅ plan links spec and tasks; dependencies and success criteria match NFR-007-03 and the scenarios.
4. Tasks coverage — ✅ every FR maps to tasks (FR-007-01: T-007-07, 17, 18; FR-007-02: T-007-02, 03; FR-007-03: T-007-04 … 06, 08, 18; FR-007-04: T-007-09 … 12, 18; FR-007-05: T-007-11 … 14; FR-007-06: T-007-02, 09, 10); tests precede code in every increment; failure branches listed.
5. Working-agreement compliance — ✅ dependencies approved and recorded above; native hand edits listed; pure helpers for gating, mapping and naming; ADR-001-01, ADR-005-01, ADR-006-01 reviewed (transport, `OriginalMediaPlugin`, bridge logging off).
6. Tooling readiness — ✅ commands above; Pixel 11 Pro, iPhone through Xcode, Android 9/10 emulators.

**Outcome:** cleared for implementation.

## Exit Criteria
- All tasks `[x]`; quality gate green (`npx vp check`, `npx vp run typecheck`, `npx vp test`, `npx vp run build`, `./gradlew assembleDebug`, CI iOS build).
- Device checks recorded, including NFR-007-02 checksums and NFR-007-06 private albums on both platforms, and S-007-17 on the Pixel.
- Knowledge map and roadmap updated; drift gate recorded.

## Follow-ups / Backlog
- Download and Delete in the photo viewer (Q-007-06 Option B, a later feature).
- Live Photo pairs on iOS (Q-007-05 Option B).
- A size choice for downloads on mobile data (Q-007-02 Option C).

## Intent Log
- 2026-10-20: owner asked for download and delete from the grid. The agent read Lychee v7.11.1 (and v7.1.0 for the minimum) `DeletePhotosRequest`, `Actions\Photo\Delete`, `PhotosToBeDeletedDTO`, `PhotoPolicy::canDeleteById`/`canDownload`, `AlbumPolicy::canDelete`, `ZipRequest`, `BaseArchive::do()`, `AlbumRightsResource`, and the web UI's photo context menu. Finding: delete with `from_id` = a smart album other than Unsorted is a silent no-op for photos in real albums. Logged Q-007-01 … 06.
- 2026-10-20: owner chose Q-007-01 Option B and Q-007-03 Option A. The agent unpacked `@capacitor/file-transfer` 2.0.6, `@capacitor-community/media` 9.1.0 and `@capacitor/filesystem` 8.1.5 in the session scratchpad and read their definitions and native code: file-transfer needs a full path and returns no headers; the media plugin saves Android files into `Android/media/<package>/`. Logged Q-007-07, 08.
- 2026-10-20: owner chose Option A for Q-007-02, 04 … 08. Spec set to Ready, ADR-007-01 written, plan and tasks drafted, analysis gate passed.
- 2026-10-20: T-007-00 on branch `feat/007-photo-download-delete`: `npm install --save-exact` of the three approved packages; the lockfile also adds `@capacitor/synapse` (Ionic's helper required by file-transfer and filesystem). Native hand edits: `NSPhotoLibraryAddUsageDescription` in `ios/App/App/Info.plist`; `WRITE_EXTERNAL_STORAGE` with `maxSdkVersion="28"` in `AndroidManifest.xml`. `npx cap sync` regenerated `CapApp-SPM/Package.swift`, `capacitor.settings.gradle`, `capacitor.build.gradle`. `./gradlew assembleDebug` green; the merged manifest has no other new permissions.
- 2026-10-20: T-007-01 … 14 done test-first (485 Vitest tests). Design notes: delete and the download request live on the `Gallery` facade (`deletePhotos`, `downloadRequest`) over new `lycheeHttp.delete/apiUrl/cookieHeader`; selection is owned by the album page store, which clears it on every load. Found while testing: page-number paging would skip photos after a delete, so the next page is recomputed and duplicates dropped (FR-007-03, S-007-19). Found in Lychee's code: converted RAW photos keep the camera MIME in `type` while `ORIGINAL` is a JPEG, so FR-007-06 takes the extension from the original URL first.
- 2026-10-20: sequencing change: no phone is attached to the agent's machine and the spike needs the owner's server and devices, so T-007-15 (device spike) runs through the real UI as the first step of I9 instead of a dev-only trigger; I8 (UI) goes first. If the spike fails, only the transport changes.
- 2026-10-20: I8 done: `photoActionMessages`, `PhotoGrid` selection (first component tests in the repo; pointer events dispatched directly because test-utils can't set `clientX` on jsdom events), `DownloadBar`, `AlbumPage` wiring (Select, Cancel, footer, confirmation, Android back via `useBackButton(15)`, alerts only from the visible page). Self-review fix: no empty `Cookie` header for guests. Gate: `npx vp check`, `npx vp run typecheck`, `npx vp test` (36 files, 506 tests), `npx vp run build`, `npx cap sync`, `./gradlew assembleDebug`, iOS simulator `xcodebuild` (CI flags) all green. Remaining: T-007-15, 19, 20 on the owner's devices and emulators, then T-007-21 (drift gate).
