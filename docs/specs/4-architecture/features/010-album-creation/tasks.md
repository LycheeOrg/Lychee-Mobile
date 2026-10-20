# Feature 010 Tasks – Album Creation

_Status: Complete_  
_Last updated: 2026-10-20_

> Keep this checklist aligned with the feature plan increments. Stage tests before implementation, record verification commands beside each task, and prefer bite-sized entries (≤90 minutes).
> **Mark tasks `[x]` immediately** after each one passes verification—do not batch completions. Update the roadmap status when all tasks are done.

## Checklist
- [x] T-010-01 – Failing tests, then `canEdit` on `RootAlbums` and `AlbumHead`, `addMenuForRoot()` and `addMenuFor()` (FR-010-02, S-010-01, 04 … 06).  
  _Verification commands:_ `npx vp test src/services/galleryParsers.test.ts src/stores/addMenu.test.ts`, `npx vp check`, `npx vp run typecheck`  
- [x] T-010-02 – Failing tests, then `Gallery.createAlbum()`, `createAlbumIn()`, `titleProblem()` and messages (FR-010-03, S-010-02, 03, 07 … 09).  
  _Verification commands:_ `npx vp test src/services/gallery.test.ts src/stores/addMenu.test.ts src/utils/albumMessages.test.ts`, `npx vp check`, `npx vp run typecheck`  
- [x] T-010-03 – Failing `AddButton.test.ts`, then `AddButton.vue` (popover, upload as before, create alert), wiring in `AlbumsPage`/`AlbumPage`, origin page reload (FR-010-01, 03, S-010-01, 10).  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`, `npx vp run build`, `npx cap sync`  
- [x] T-010-04 – Device checks on the Pixel and the iPhone (S-010-01 … 10). (Owner, 2026-10-20: creating reported "Couldn't create the album." though it was created → fixed, plain-text ID; then all checks reported passed.)
- [x] T-010-05 – Knowledge map, Feature 005 note, roadmap, drift gate.
