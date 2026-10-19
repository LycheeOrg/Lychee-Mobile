# Feature 005 Tasks – Photo Upload

_Status: Complete_  
_Last updated: 2026-10-19_

> Keep this checklist aligned with the feature plan increments. Stage tests before implementation, record verification commands beside each task, and prefer bite-sized entries (≤90 minutes).
> **Mark tasks `[x]` immediately** after each one passes verification—do not batch completions. Update the roadmap status when all tasks are done.

## Checklist

### I0 – Dependency and permission
- [x] T-005-00 – Install `@capawesome/capacitor-file-picker@8.1.0` pinned exactly (owner approval 2026-10-19); add `ACCESS_MEDIA_LOCATION` to `AndroidManifest.xml`; `npx cap sync` (NC-005-01, 02).  
  _Verification commands:_ `npm ls @capawesome/capacitor-file-picker`, `git diff package.json package-lock.json`, `npx cap sync`  

### I1 – Transport
- [x] T-005-01 – Failing `lycheeHttp.test.ts` cases for `postForm()`: multipart body, `Accept` and `X-XSRF-TOKEN` but no `Content-Type`, 419 retry (API-005-02).  
  _Verification commands:_ `npx vp test src/services/lycheeHttp.test.ts` (red)  
- [x] T-005-02 – Implement `postForm()`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I2 – Upload service
- [x] T-005-03 – Fixtures `upload-limits.json`, `upload-meta-partial.json`, `upload-meta-final.json`, error bodies 409/413/422 written from Lychee's PHP classes.  
  _Verification commands:_ fields checked against `UploadConfig`, `UploadMetaResource`  
- [x] T-005-04 – Failing `src/services/upload.test.ts`: chunk size and count; fields per chunk incl. `uuid_name`/`extension` echo and empty `album_id`; final detection; 409/413/422/401/other/network/60 s timeout; empty file; progress callback (FR-005-03, NFR-005-05, S-005-02 … 06, 12).  
  _Verification commands:_ `npx vp test src/services/upload.test.ts` (red)  
- [x] T-005-05 – Implement `src/services/upload.ts`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I3 – File readers and picker
- [x] T-005-06 – Failing `src/services/fileChunks.test.ts` (range reader: exact ranges, short read; stream reader: uneven pieces regrouped, end, short stream) and `src/services/picker.test.ts` (Android permission granted / prompted / denied; iOS no permission; cancel; result mapping) (FR-005-01, 06, NFR-005-01, S-005-09).  
  _Verification commands:_ `npx vp test src/services/fileChunks.test.ts src/services/picker.test.ts` (red)  
- [x] T-005-07 – Implement `src/services/fileChunks.ts`, `src/services/picker.ts`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I4 – Queue and rights
- [x] T-005-08 – Failing `src/stores/uploadQueue.test.ts` (order, progress, results, retry from start, clear finished, idle callback after a done file, stop on 401, append while running) and parser tests for `canUpload` on `RootAlbums` and `AlbumHead` (FR-005-02, 04, 05).  
  _Verification commands:_ `npx vp test src/stores/uploadQueue.test.ts src/services/galleryParsers.test.ts` (red)  
- [x] T-005-09 – Implement `src/stores/uploadQueue.ts` and the rights fields.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I5 – UI
- [x] T-005-10 – Messages (test first), `UploadButton.vue`, `UploadSheet.vue`, wiring in `AlbumPage.vue` and `AlbumsPage.vue`, reload on idle (FR-005-01, 02, 04, 05, UI-005-01 … 03).  
  _Verification commands:_ `npx vp check`, `npx vp run typecheck`, `npx vp run build`, `npx cap sync`  

### I5b – Android original copy (Q-005-04)
- [x] T-005-15 – Failing `src/services/originalMedia.test.ts`: iOS passes the path through without native calls; Android prepares, runs, and releases (also after a failed upload); `LOCATION_NOT_INCLUDED` → `location_not_included`; other errors → `unreadable`; release errors ignored. Message test for `location_not_included` (FR-005-06, S-005-13).  
  _Verification commands:_ `npx vp test src/services/originalMedia.test.ts src/utils/uploadMessages.test.ts` (red)  
- [x] T-005-16 – `OriginalMediaPlugin.java` registered in `MainActivity`, `src/services/originalMedia.ts`, wiring in the queue's uploader; remove the JS `requireOriginal()` (NC-005-03).  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`, `npx vp run build`, `cd android && ./gradlew assembleDebug`  

### I5c – Android picker with location request (Q-005-05)
- [x] T-005-17 – Failing `picker.test.ts` cases: Android picks through the native `pick()` (not the plugin), iOS through the plugin; native cancel and errors map like the plugin's (FR-005-01).  
  _Verification commands:_ `npx vp test src/services/picker.test.ts` (red)  
- [x] T-005-18 – `OriginalMediaPlugin.pick()` with `@ActivityCallback`, `OriginalMedia` typing, picker wiring (NC-005-03).  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`, `npx vp run build`, `cd android && ./gradlew assembleDebug`  

### I5d – Location check and notice (Q-005-06)
- [x] T-005-19 – Failing tests: `withOriginal` marks `done` as `withoutLocation` when `prepare` reports `missing`, not for `present`/`unknown` or non-`done` results; `entryStatus` shows "Uploaded without GPS data"; the `location_not_included` result and message are removed (NFR-005-04, S-005-13, 14).  
  _Verification commands:_ `npx vp test src/services/originalMedia.test.ts src/utils/uploadMessages.test.ts` (red)  
- [x] T-005-20 – `OriginalMediaPlugin.prepare`: fallback copy without `requireOriginal`, location check (`ExifInterface`, `MediaMetadataRetriever`), `location` in the result; JS wiring; sheet warning colour.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`, `npx vp run build`, `cd android && ./gradlew assembleDebug`  

### I6 – Device checks
- [x] T-005-11 – Pixel 11 Pro: S-005-01 … 09, 12; NFR-005-01 (video > 500 MB); NFR-005-04 (GPS photo shows its location in Lychee, checksum equals the original).  
  _Verification commands:_ `npx cap run android --target 67240DLKX002B4`  
  _Notes:_ 2026-10-19 after four fixes (Q-005-04 … 06), the owner reported GPS kept on upload and the rest of the checklist complete (several photos, large video, duplicate, airplane mode with Retry, Unsorted, permission denied, the without-GPS notice).  
- [x] T-005-12 – iPhone through Xcode: S-005-01, 02, 10, 11 (NFR-005-04 gate on iOS).  
  _Verification commands:_ `npm run build && npx cap sync ios && npm run open:ios`, Run  
  _Notes:_ 2026-10-19 owner reported GPS kept on upload from the iPhone and the checklist complete.  

### I7 – Docs and drift gate
- [x] T-005-13 – Knowledge map, roadmap, drift gate report in plan.md.  
  _Verification commands:_ `npx vp check`, `npx vp run typecheck`, `npx vp test`, `npx vp run build`  

## Notes / TODOs
- 2026-10-19: T-005-11 NFR-005-04 passed on the Pixel 11 Pro (Android 17) after Q-005-05; the rest of T-005-11 (video, duplicate, airplane mode, Unsorted, permission denied) still to run.
- 2026-10-19: T-005-11 first run failed NFR-005-04 (GPS stripped on Android). Fixed with `requireOriginal()` (4 tests first); T-005-11 re-run pending.
- Lint checkpoint: `npx vp check` (never `--fix` on the whole tree) after each new helper.
