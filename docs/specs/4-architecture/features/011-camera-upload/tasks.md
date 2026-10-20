# Feature 011 Tasks – Camera Upload

_Status: Complete_  
_Last updated: 2026-10-20_

> Keep this checklist aligned with the feature plan increments. Stage tests before implementation, record verification commands beside each task, and prefer bite-sized entries (≤90 minutes).
> **Mark tasks `[x]` immediately** after each one passes verification—do not batch completions. Update the roadmap status when all tasks are done.

## Checklist
- [x] T-011-01 – Failing tests, then the queue's `onSettled` hook and `createPendingCaptures()` (FR-011-04, 06, S-011-09 … 12).  
  _Verification commands:_ `npx vp test src/stores/uploadQueue.test.ts src/stores/pendingCaptures.test.ts`, `npx vp check`, `npx vp run typecheck`  
- [x] T-011-02 – Failing tests, then `takePhoto()`/`cameraAvailable()`, the "+" item, resume in `App.vue`, Delete photo in the upload sheet (FR-011-01, 02, 06).  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  
- [x] T-011-03 – Android `capture`, `deleteCapture`, `hasCamera`, `file_paths.xml` (NC-011-01).  
  _Verification commands:_ `npx vp run build`, `npx cap sync`, `cd android && ./gradlew assembleDebug`  
- [x] T-011-04 – iOS `OriginalCameraPlugin`, `MainViewController`, storyboard, project entries, usage strings (NC-011-02).  
  _Verification commands:_ `xcodebuild … -destination 'generic/platform=iOS Simulator' build`  
- [x] T-011-07 – (Reverted 2026-10-20 at the owner's request, see Q-011-05.) Failing tests, then the Android camera session (`createCameraSession`: permissions, session in Preferences, collect on resume/launch, stale) and the selection store (FR-011-02, 04, 07, S-011-13 … 16).  
  _Verification commands:_ `npx vp test src/stores/cameraSession.test.ts src/stores/newPhotos.test.ts`, `npx vp check`, `npx vp run typecheck`  
- [x] T-011-08 – (Reverted 2026-10-20 at the owner's request, see Q-011-05.) Android native `openCamera`, `mediaSince` with thumbnails, `hasCamera` for the still-camera intent, `deleteCapture` no-op; remove the capture-request code, `files-path captures/` and its `<queries>` entry (NC-011-01).  
  _Verification commands:_ `npx vp run build`, `npx cap sync`, `cd android && ./gradlew assembleDebug`  
- [x] T-011-09 – (Reverted 2026-10-20 at the owner's request, see Q-011-05.) `NewPhotosSheet.vue` (component test first), wiring in `App.vue` and `AddButton`, Stop for Android pending items in the upload sheet (FR-011-06, 07).  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`, `npx vp run build`, `npx cap sync`  
- [x] T-011-05 – Device checks on the Pixel and the iPhone (S-011-01 … 12). (Owner, 2026-10-20: confirmed on Android and iOS after the revert.)
- [x] T-011-06 – Knowledge map, Feature 010 note, roadmap, drift gate.
