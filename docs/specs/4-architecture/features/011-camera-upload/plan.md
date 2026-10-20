# Feature Plan 011 – Camera Upload

_Linked specification:_ [spec.md](spec.md)  
_Linked tasks:_ [tasks.md](tasks.md)  
_Status:_ Complete  
_Last updated:_ 2026-10-20

> Guardrail: Keep this plan traceable back to the governing spec. Reference FR/NFR/Scenario IDs from `spec.md` where relevant, log any new high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), and assume clarifications are resolved only when the spec's normative sections and, where applicable, ADRs under `docs/specs/6-decisions/` have been updated.

## Vision & Success Criteria
Take a photo from the "+" menu with the phone's camera; it reaches Lychee with camera information and GPS, and is never lost on the way. Success: S-011-01 … 12 on the Pixel and an iPhone, metadata checked in the info panel.

## Scope Alignment
- **In scope:** FR-011-01 … 06, NFR-011-01 … 03.
- **Out of scope:** spec Non-Goals; background uploads (Feature 012).

## Dependencies & Interfaces
- No new dependency. Native hand edits: Android `file_paths.xml` (`files-path` `captures/`), `OriginalMediaPlugin` (`capture`, `deleteCapture`, `hasCamera`); iOS `OriginalCameraPlugin.swift`, `MainViewController.swift`, `Main.storyboard` custom class, `project.pbxproj` entries, `Info.plist` usage strings (ADR-011-01). Approved through Q-011-01 Option A.
- Modules: `uploadQueue` (new `onSettled` hook), `addMenu`/`AddButton` (Take photo), `App.vue` (resume pending photos), `UploadSheet` (Delete photo), `@capacitor/app` `resume` event, `@capacitor/preferences`.

## Assumptions & Risks
- **Assumptions:** Android camera apps honour `EXTRA_OUTPUT` with a `FileProvider` URI (standard); `UIImagePickerController.mediaMetadata` has TIFF/EXIF for camera captures.
- **Risks / Mitigations:**
  - _Android kills the app while the camera is open_ → the target file name comes from JavaScript in the call options, so a restored call still knows its file; device check.
  - _iOS project edits break the build_ → `xcodebuild` for the simulator after the change; device check by the owner.
  - _Location fix slow on iOS_ → at most 10 s, then upload without GPS (notice).

## Increment Map
1. **I1 – Pending photos** (FR-011-04, 06): failing tests → queue `onSettled`, `createPendingCaptures()` (persist, settle, resume, discard).
2. **I2 – Take photo in JS** (FR-011-01, 02): failing tests → `takePhoto()` service, `cameraAvailable()`, "+" item, App.vue resume wiring, UploadSheet Delete photo.
3. **I3 – Android native** (NC-011-01): `capture`, `deleteCapture`, `hasCamera`, `file_paths.xml`; `./gradlew assembleDebug`.
4. **I4 – iOS native** (NC-011-02): plugin, registration, storyboard, project entries, usage strings; simulator `xcodebuild`.
5. **I5 – Device checks, docs, drift gate.**

## Analysis Gate
Run 2026-10-20 by the agent: spec complete with Q-011-01 … 04 folded in; ADR-011-01 written; mock-up present; every FR maps to tasks; tests precede code for the JavaScript parts, native parts verified by builds and devices; new permissions approved through Q-011-01/02. Cleared.

## Intent Log
- 2026-10-20: owner asked for Take photo in the "+" menu with the native camera, GPS and camera information. The agent read `@capacitor/camera` 8.2.6 (Android re-encode with EXIF copy; iOS no GPS) and the app's queue, FileProvider and Xcode project. Owner chose A for Q-011-01/02, their own option for Q-011-03 (keep until uploaded), and A for Q-011-04 (background uploads next, Feature 012).
- 2026-10-20: T-011-01 … 04 done (679 Vitest tests). JavaScript test-first: queue `onSettled`/`remove`, `createPendingCaptures` (serialised changes so the stored list never loses an update), camera service, "+" item, resume after launch and on `App` `resume`, Delete photo. Native hand edits (ADR-011-01): Android `capture`/`deleteCapture`/`hasCamera`, `file_paths.xml` `files-path captures/`, manifest `<queries>` for `IMAGE_CAPTURE` (package visibility; not a permission); iOS `OriginalCameraPlugin.swift`, `MainViewController.swift`, `Main.storyboard` custom class, four `project.pbxproj` entries per file, `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`. `./gradlew assembleDebug` and the iOS simulator `xcodebuild` green.
- 2026-10-20: owner device report (Pixel): the capture request opens Google Camera's reduced single-shot mode (no Night Sight, Time Lapse, Panorama) and the photo uploaded with "Uploaded without GPS data". Logged Q-011-05.
- 2026-10-20: owner chose Q-011-05 Option A with a selection screen on return. Plan: I6 – Android camera session and selection (FR-011-02, 04, 07): failing tests for `createCameraSession` and the selection store → implementation; I7 – Android native `openCamera`, `mediaSince` (thumbnails), `hasCamera` for the still-camera intent, `deleteCapture` no-op; the `ACTION_IMAGE_CAPTURE` code, `capture()`, the `captures/` `files-path` and its `<queries>` entry are replaced; I8 – `NewPhotosSheet.vue`, wiring in `App.vue` and `AddButton`.
- 2026-10-20: T-011-07 … 09 done (702 Vitest tests; Android build green). Android now opens the full camera app (`openCamera`) after saving a camera session; on launch and resume `cameraSession.collect()` (single caller wins, sessions older than 24 h dropped) asks `mediaSince` and `NewPhotosSheet` offers the items, all selected; selected ones are recorded as pending by URI and queued. Removed (replaced): `capture()`/`captureResult`, the `captures/` `files-path`, the `IMAGE_CAPTURE` `<queries>` entry (now `STILL_IMAGE_CAMERA`). The upload sheet shows Stop instead of Delete photo for gallery items. `takePhoto()` is iOS-only.
- 2026-10-20: owner device report (Pixel): returning quickly after taking a photo, New photos missed it while Google Camera was still processing. Logged Q-011-06.
- 2026-10-20: owner asked whether the full camera app could save into a chosen folder (no: only the single-shot request takes a destination), then reverted to the single-shot capture request without GPS on Android, GPS as a follow-up. Reverted test-first state: Android `capture`/`captureResult`/`deleteCapture` restored, `files-path captures/` and the `IMAGE_CAPTURE` `<queries>` entry back; `takePhoto()` covers both platforms again; removed (created in this session, never committed): `src/stores/cameraSession.ts`, `src/stores/newPhotos.ts`, `src/components/NewPhotosSheet.vue` and their tests; the upload sheet's Stop and the related messages removed. 681 Vitest tests; Android build green. Q-011-05 → C, Q-011-06 withdrawn; ADR-011-01 restored with the attempt recorded.
- 2026-10-20: owner confirmed Take photo works on Android and iOS; feature closed.

## Drift Gate Report

Run 2026-10-20 by the agent; device checks completed by the owner the same day.

**Preconditions:** all tasks `[x]` (T-011-01 … 09; T-011-07 … 09 reverted). `npx vp check`, `npx vp run typecheck`, `npx vp test` (47 files, 681 tests), `npx vp run build`, `npx cap sync`, `./gradlew assembleDebug` green; iOS simulator `xcodebuild` green after the iOS changes (untouched since). No new dependency.

| Requirement | Code | Evidence |
|-------------|------|----------|
| FR-011-01 | `AddButton.vue` Take photo, `cameraAvailable()`, `hasCamera()` on both platforms | `AddButton.test.ts`, `camera.test.ts`; owner on devices |
| FR-011-02 | `takePhoto()`; Android `capture()` (`ACTION_IMAGE_CAPTURE`, `files/captures/`); iOS `OriginalCameraPlugin` | `camera.test.ts`; owner on devices |
| FR-011-03 | Android: camera app's file untouched, no GPS (follow-up); iOS: `mediaMetadata` + `CLLocationManager` GPS via `CGImageDestination` | owner on devices |
| FR-011-04 | `pendingCaptures` (Preferences, settle on done/skipped, resume after launch and on resume), queue `onSettled` | `pendingCaptures.test.ts` (10), `uploadQueue.test.ts` (3 new) |
| FR-011-05 | no gallery copy | design |
| FR-011-06 | Delete photo in `UploadSheet`, `pendingCaptures.discard`, queue `remove` | `pendingCaptures.test.ts`, `uploadMessages.test.ts` |
| NFR-011-01 | Android byte for byte; iOS one JPEG at quality 1.0 | owner on devices |
| NFR-011-02 | injected deps | Vitest |
| NFR-011-03 | no dependency | `package.json` unchanged |

**Divergences:** Android first used the single-shot request, then (Q-011-05 A) the full camera app with a New photos selection screen; on the Pixel, photos still being processed were missed (Q-011-06), and the owner reverted to the single-shot request without Android GPS. The reverted code and files were never committed. GPS for Android camera photos is on the roadmap backlog.

**Lessons:** camera apps treat capture requests differently from their normal launch (reduced modes, no location); asynchronous camera processing makes "what was just taken" hard to find from another app, so try the simplest flow on a device before building on it.
