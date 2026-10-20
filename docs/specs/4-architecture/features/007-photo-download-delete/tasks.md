# Feature 007 Tasks – Photo Download and Delete

_Status: Testing_  
_Last updated: 2026-10-20_

> Keep this checklist aligned with the feature plan increments. Stage tests before implementation, record verification commands beside each task, and prefer bite-sized entries (≤90 minutes).
> **Mark tasks `[x]` immediately** after each one passes verification—do not batch completions. Update the roadmap status when all tasks are done.

## Checklist

### I0 – Dependencies and native config
- [x] T-007-00 – Install `@capacitor/file-transfer@2.0.6`, `@capacitor-community/media@9.1.0`, `@capacitor/filesystem@8.1.5` pinned exactly (owner approval 2026-10-20); `NSPhotoLibraryAddUsageDescription` in `ios/App/App/Info.plist`; `WRITE_EXTERNAL_STORAGE` with `android:maxSdkVersion="28"` in `AndroidManifest.xml`; `npx cap sync` (NFR-007-03, NC-007-01 … 03, 05, 06).  
  _Verification commands:_ `npm ls @capacitor/file-transfer @capacitor-community/media @capacitor/filesystem`, `git diff package.json package-lock.json`, `npx cap sync`, `cd android && ./gradlew assembleDebug`  
  _Notes:_ record the native hand edits in the plan's Intent Log.

### I1 – Parsers and rights
- [x] T-007-01 – Fixtures: `album-head` variants with `can_delete` / `can_download` true and false (regular album, Unsorted, Recent, tag album); photos with `type` `image/heic` and `video/quicktime`; `DELETE Photo` 403 and 422 bodies, written from Lychee's PHP classes.  
  _Verification commands:_ fields checked against `AlbumRightsResource`, `PhotoResource`, Lychee's exception handler  
  _Notes:_ like Feature 005's rights tests, the `album-head` and photo variants are built inline in the tests from the recorded fixtures; the 403 body is the existing `error-403-album.json` (`UnauthorizedException`); new file `error-422-delete.json` (`DeletePhotosRequest` rule `photo_ids` required).  
- [x] T-007-02 – Failing tests: `parseAlbumHead` → `canDownload`, `canDelete` (false when missing); `parsePhotoTile` → `mimeType`; `photoActionsFor({ kind, id, canDownload, canDelete })` → Download/Delete per album kind (regular, Unsorted, other smart, tag, person, guest) (FR-007-02, FR-007-06, S-007-03, 04).  
  _Verification commands:_ `npx vp test src/services/galleryParsers.test.ts src/stores/photoRights.test.ts` (red)  
- [x] T-007-03 – Implement the parser fields, `photoActionsFor()` in `src/stores/photoRights.ts`, and `canDownload`/`canDelete` in the `albumPage` state.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I2 – Delete service
- [x] T-007-04 – Failing tests: `lycheeHttp.delete()` (JSON body, JSON headers, `X-XSRF-TOKEN`, 419 restart and retry once), `apiUrl()`, `cookieHeader()`; `Gallery.deletePhotos()` (body `{ photo_ids, from_id }` incl. `"unsorted"`; 204 → `ok`; 401 → `unauthenticated`; 403 → `forbidden`; 422/500 → `failed`; network → `unreachable`; 30 s → `timeout`) (FR-007-03, API-007-01, S-007-05 … 09).  
  _Verification commands:_ `npx vp test src/services/lycheeHttp.test.ts src/services/gallery.test.ts` (red)  
- [x] T-007-05 – Implement `delete()`, `apiUrl()`, `cookieHeader()` in `src/services/lycheeHttp.ts`.  
  _Verification commands:_ `npx vp test src/services/lycheeHttp.test.ts`, `npx vp check`, `npx vp run typecheck`  
- [x] T-007-06 – Implement `Gallery.deletePhotos()` in `src/services/gallery.ts` with `withTimeout()`, and `Gallery.downloadRequest()` (the `Zip` URL and `Cookie` header, FR-007-04).  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I3 – Selection and local removal
- [x] T-007-07 – Failing tests: `createPhotoSelection()` (enter empty or with an id, toggle, count, `clear()` leaves the mode); `albumPage.deleteSelected(ctx)` (ok drops the photos and lowers `photoTotal`; 401 recovery; sign-in; forbidden/failed/unreachable keep the selection; timeout reloads; next page recomputed and duplicates dropped, S-007-19); `load()` clears the selection (FR-007-01, FR-007-03, S-007-01, 02, 05 … 09, 15, 19).  
  _Verification commands:_ `npx vp test src/stores/photoSelection.test.ts src/stores/albumPage.test.ts` (red)  
- [x] T-007-08 – Implement `src/stores/photoSelection.ts` and `removePhotos()`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I4 – Download helpers
- [x] T-007-09 – Failing tests: (the `Zip` URL and cookie header moved to `Gallery.downloadRequest()`, T-007-06); `downloadFileOf(photo)` → `{ ext, name, mimeType, save: "photo" | "video" }` or `null` per FR-007-06 (original URL extension with a query string, MIME fallback when the URL is missing, RAW photo with a JPEG original, video kind, unknown); `safeFileName(title, id)`; `transferFailure(error)` mapping `httpStatus` 401/403/404, connection errors and timeouts (FR-007-04, FR-007-06, S-007-18).  
  _Verification commands:_ `npx vp test src/services/download.test.ts` (red)  
- [x] T-007-10 – Implement the helpers in `src/services/download.ts`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I5 – Download run
- [x] T-007-11 – Failing `src/stores/downloadRun.test.ts` with injected transfer, filesystem and saver: one at a time in selection order; progress from transfer events; cache file deleted after success and failure; `downloads/` cleared at run start; per-file failures continue; summary counts; Retry failed; Download during a run appends; 401 → `recoverSession()` once and retry, still 401 → run stops with sign-in; permission denied → run stops (FR-007-04, FR-007-05, DO-007-04, S-007-12, 13).  
  _Verification commands:_ `npx vp test src/stores/downloadRun.test.ts` (red)  
- [x] T-007-12 – Implement `src/stores/downloadRun.ts` and the native deps object (FileTransfer, Filesystem) in `src/services/downloadDevice.ts` (with mocked-plugin tests).  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I6 – Platform savers
- [x] T-007-13 – Failing tests: iOS saver calls `Media.savePhoto` / `saveVideo` with the path and no album; Android saver calls `OriginalMedia.saveToGallery({ path, name, mimeType })`; both map access-denied errors to `permission_denied` and others to `unsaveable` (NC-007-02, NC-007-04, S-007-12).  
  _Verification commands:_ `npx vp test src/services/librarySaver.test.ts` (red)  
- [x] T-007-14 – Implement `src/services/librarySaver.ts`; `OriginalMediaPlugin.saveToGallery()` in Java: API 29+ `MediaStore` insert with `RELATIVE_PATH` and `IS_PENDING`, byte copy; API 24–28 `WRITE_EXTERNAL_STORAGE` request, copy to the public folder, `MediaScannerConnection.scanFile`; `PERMISSION_DENIED`, `UNSAVEABLE` (S-007-14, 17).  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`, `npx vp run build`, `npx cap sync`, `cd android && ./gradlew assembleDebug`  

### I7 – Device spike (gate, moved to the start of I9, see plan Intent Log)
- [ ] T-007-15 – On the Pixel and the iPhone, run a download from a dev-only trigger: a GPS-tagged HEIC from a private album and a video. Confirm the cookie works (NFR-007-06), the checksum equals Lychee's `original_checksum` (NFR-007-02) and location shows in the library. If either fails, stop and raise it with the owner (ADR-007-01). Runs through the real UI (Select → Download), not a dev-only trigger.  
  _Verification commands:_ `npm run android`, `npm run ios`; checksum via `shasum` on the exported file  

### I8 – UI
- [x] T-007-16 – Messages with tests first: delete confirmation title and text, delete failures, download bar texts, summary, permission message (FR-007-03 … 05, UI-007-02, 04, 05).  
  _Verification commands:_ `npx vp test src/utils/photoActionMessages.test.ts` (red, then green)  
- [x] T-007-17 – Failing component tests, then `PhotoGrid` selection: long-press 500 ms via `createPressAndHold` selects and enters the mode; the click after a hold doesn't open the viewer; in the mode a tap toggles; check mark overlay; movement cancels the hold (FR-007-01, S-007-01, 02).  
  _Verification commands:_ `npx vp test src/components/PhotoGrid.test.ts`, `npx vp check`, `npx vp run typecheck`  
- [x] T-007-18 – `AlbumPage`: Select button and selection toolbar (Cancel, "N selected"), bottom toolbar with Download/Delete per `photoActionsFor()`, delete alert and spinner, download bar with Retry failed, Android back and pull to refresh clear the selection, timeout reload (FR-007-01 … 05, UI-007-01 … 05).  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`, `npx vp run build`, `npx cap sync`  

### I8b – Selection whatever the rights (owner, 2026-10-20)
- [x] T-007-22 – Failing `photoRights.test.ts` cases for `enabledActions()`, then `AlbumPage`: Select and long-press whenever photos show; Download and Delete always visible in selection mode, disabled without their right or with nothing selected (FR-007-01, FR-007-02, S-007-03, S-007-04).  
  _Verification commands:_ `npx vp test src/stores/photoRights.test.ts` (red, then green), `npx vp test`, `npx vp check`, `npx vp run typecheck`, `npx vp run build`, `npx cap sync`  

### I9 – Device checks
- [ ] T-007-19 – Android 9 (API 28) and Android 10 (API 29) emulators: permission prompt on 9, saving into `Pictures/Lychee` and `Movies/Lychee` on both (S-007-14).  
  _Verification commands:_ `npm run android` on each emulator  
- [ ] T-007-20 – (Long-press selection confirmed by the owner on Android, 2026-10-20; the rest open.) Pixel 11 Pro and iPhone: S-007-01 … 13, 15 … 18, including a > 500 MB video, airplane mode mid-run, a denied library permission, delete in a regular album and in Unsorted, no Delete in Recent, and uninstalling the app on the Pixel (S-007-17).  
  _Verification commands:_ `npm run android`, `npm run ios`  

### I10 – Docs and drift gate
- [x] T-007-21 – Knowledge map (selection store, photo actions, download service and run, library saver, `saveToGallery`, three plugins, `DELETE Photo` and `Zip`, new permissions); roadmap row; drift gate report in the plan.  
  _Verification commands:_ `npx vp check`, `npx vp run typecheck`, `npx vp test`, `npx vp run build`, `cd android && ./gradlew assembleDebug`  

## Notes / TODOs
- The media plugin is installed for iOS only; its Android half is compiled in but never called (ADR-007-01).
