# Feature 003 Tasks – Album Browsing

_Status: Complete_  
_Last updated: 2026-10-19_

> Keep this checklist aligned with the feature plan increments. Stage tests before implementation, record verification commands beside each task, and prefer bite-sized entries (≤90 minutes).
> **Mark tasks `[x]` immediately** after each one passes verification—do not batch completions. Update the roadmap status when all tasks are done.

## Checklist

### I1 – Transport
- [x] T-003-01 – Failing `lycheeHttp.test.ts` cases: a 419 restarts the session and retries once; a second 419 is returned; query parameters are appended (FR-003-07, S-003-09).  
  _Verification commands:_ `npx vp test src/services/lycheeHttp.test.ts` (red)  
- [x] T-003-02 – Implement the retry and query support in `src/services/lycheeHttp.ts`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I2 – Fixtures and parsers
- [x] T-003-03 – Fixtures in `src/services/__fixtures__/lychee-7.11.1/`: `albums.json`, `album-head.json`, `album-head-smart.json`, `album-albums.json`, `album-photos.json`, `gallery-init.json`, error bodies for 404, `PasswordRequiredException`, `GalleryPasswordRequiredException`, 403 (API-003-01 … 06).  
  _Verification commands:_ fields checked against the PHP resource classes  
- [x] T-003-04 – Failing `src/services/galleryParsers.test.ts` (NFR-003-03, DO-003-01 … 07).  
  _Intent:_ sections in display order, empty sections dropped; tile thumb/2x/null, counts, lock, NSFW; photo kinds video/live/raw/photo and missing thumbs; head kinds and `hasSubAlbums`, NSFW warning; pages; `Gallery::Init` flags; malformed payloads → `undefined`.  
  _Verification commands:_ `npx vp test src/services/galleryParsers.test.ts` (red)  
- [x] T-003-05 – Implement `src/services/galleryParsers.ts`.  
  _Verification commands:_ `npx vp test src/services/galleryParsers.test.ts`, `npx vp check`, `npx vp run typecheck`  

### I3 – Gallery service
- [x] T-003-06 – Failing `src/services/gallery.test.ts` and `src/utils/version.test.ts` (FR-003-01 … 05, NFR-003-01, S-003-05, 07, 08, 12 … 14).  
  _Intent:_ request paths and parameters; failure mapping 404/401/403/`PasswordRequiredException`/`GalleryPasswordRequiredException`/other/network/timeout/unparseable; unlock results 2xx/403/429/network; `meetsMinimumVersion()` incl. null and pre-release strings.  
  _Verification commands:_ `npx vp test src/services/gallery.test.ts src/utils/version.test.ts` (red)  
- [x] T-003-07 – Implement `src/services/gallery.ts`, `src/utils/version.ts`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I4 – Models
- [x] T-003-08 – Failing `src/stores/albumList.test.ts`, `src/stores/albumPage.test.ts` (FR-003-01, 02, 05, 06, 09, NFR-003-05, S-003-01 … 08, 13 … 16).  
  _Intent:_ list: load, version gate, failures, gallery unlock, NSFW hide/reveal and blur, sign-in handoff, reload key. Page: head then sub-album pages then photo pages, end, later-page failure and retry, refresh, album unlock, NSFW warning remembered per album, sign-in handoff; no password in state.  
  _Verification commands:_ `npx vp test src/stores` (red)  
- [x] T-003-09 – Implement `src/stores/albumList.ts`, `src/stores/albumPage.ts`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I5 – Navigation
- [x] T-003-10 – Failing `session.test.ts` cases: `connect()` returns `albums` instead of `stay` (FR-003-08, S-003-17).  
  _Verification commands:_ `npx vp test src/stores/session.test.ts` (red)  
- [x] T-003-11 – `SettingsPage.vue` (from `HomePage.vue`) at `/settings`, `/albums` start route, Connect and Login destinations (FR-003-08, S-003-17, 18).  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`, `npx vp run build`  

### I6 – UI
- [x] T-003-12 – Failing `src/utils/galleryMessages.test.ts`, then `galleryMessages.ts` (FR-003-01, 02, 04 … 06, 09).  
  _Verification commands:_ `npx vp test src/utils/galleryMessages.test.ts`  
- [x] T-003-13 – Components `AlbumTileGrid.vue`, `PhotoGrid.vue`, `PasswordPrompt.vue`, `GalleryMessage.vue`; pages `AlbumsPage.vue`, `AlbumPage.vue`; routes; `android.allowMixedContent` (FR-003-01 … 05, 09, UI-003-01 … 06, S-003-10).  
  _Verification commands:_ `npx vp check`, `npx vp run typecheck`, `npx vp run build`, `npx cap sync`  

### I7 – Device checks
- [x] T-003-14 – Pixel 11 Pro: S-003-01 … 08, 10, 11, 15 … 18 against `lapaglia.pics` (signed in) and the LAN server; NFR-003-02 with the largest smart album.  
  _Verification commands:_ `npx cap run android --target 67240DLKX002B4`  
  _Notes:_ 2026-10-19 owner ran the checklist (albums signed in on `lapaglia.pics`, sub-albums and paging, fast scroll in a large smart album, LAN http thumbnails, refresh and Back, airplane mode, sign-out reload) and reported everything passing, including smooth scrolling (NFR-003-02).  
- [x] T-003-15 – iOS through Xcode: S-003-01, 03, 11, 17.  
  _Verification commands:_ `npm run build && npx cap sync ios && npm run open:ios`, Run  
  _Notes:_ 2026-10-19 owner ran it on an iPhone and reported everything passing, including http thumbnails from the LAN server.  

### I8 – Docs and drift gate
- [x] T-003-16 – Knowledge map, roadmap, drift gate report in plan.md.  
  _Verification commands:_ `npx vp check`, `npx vp run typecheck`, `npx vp test`, `npx vp run build`  

## Notes / TODOs
- Lint checkpoint: `npx vp check` (never `--fix` on the whole tree) after each new helper.
- S-003-13 and S-003-14 need a locked album or gallery on a test server; if none is available they stay unit-tested only.
