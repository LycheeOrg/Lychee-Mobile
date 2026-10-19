# Feature 004 Tasks – Photo Viewer

_Status: Complete_  
_Last updated: 2026-10-19_

> Keep this checklist aligned with the feature plan increments. Stage tests before implementation, record verification commands beside each task, and prefer bite-sized entries (≤90 minutes).
> **Mark tasks `[x]` immediately** after each one passes verification—do not batch completions. Update the roadmap status when all tasks are done.

## Checklist

### I0 – Dependency
- [x] T-004-00 – Install `swiper@14.3.0` pinned exactly (owner approval 2026-10-19, ADR-004-01).  
  _Verification commands:_ `npm ls swiper`, `git diff package.json package-lock.json`  

### I1 – Data
- [x] T-004-01 – Failing tests: `parsePhotoPage` returns `variants` and `liveUrl`, `Page.total`; album page model exposes `photoTotal` (DO-004-01, 02).  
  _Verification commands:_ `npx vp test src/services/galleryParsers.test.ts src/stores/albumPage.test.ts` (red)  
- [x] T-004-02 – Implement in `galleryParsers.ts` and `albumPage.ts`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I2 – Helpers
- [x] T-004-03 – Failing `src/utils/photoVariant.test.ts`: display order by pixel ratio, fallbacks, `zoomVariant()` only with an original URL, nothing for raw files (FR-004-03, S-004-07, 08).  
  _Verification commands:_ `npx vp test src/utils/photoVariant.test.ts` (red)  
- [x] T-004-04 – Failing `src/utils/viewerSlides.test.ts`: `counterText()`, `shouldLoadMore()` threshold and end (FR-004-02, 07, S-004-02, 03).  
  _Verification commands:_ `npx vp test src/utils/viewerSlides.test.ts` (red)  
- [x] T-004-05 – Failing `src/utils/pressAndHold.test.ts`: starts after 300 ms, not before; movement over 10 px cancels; release ends; cancel ends (FR-004-06, S-004-06).  
  _Verification commands:_ `npx vp test src/utils/pressAndHold.test.ts` (red)  
- [x] T-004-06 – Implement the three helpers.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I3 – Viewer
- [x] T-004-07 – `PhotoViewer.vue` (Swiper Zoom + Virtual, image/video/live slides, overlay, paging), `PhotoGrid` tap, `AlbumPage` modal and scroll-back (FR-004-01 … 07).  
  _Verification commands:_ `npx vp check`, `npx vp run typecheck`, `npx vp run build`, `npx cap sync`  

### I4 – Device checks
- [x] T-004-08 – Pixel 11 Pro: S-004-01 … 10, NFR-004-01, 02.  
  _Verification commands:_ `npx cap run android --target 67240DLKX002B4`  
  _Notes:_ 2026-10-19 owner ran the checklist (open, swipe and close back to the photo; fast swiping past the first page of a large smart album; pinch, double tap, pan, edge hand-over and the sharper original; video pause on swipe; press and hold on a live/motion photo; overlay toggle without flashing on double tap; Android back) and reported all working.  
- [x] T-004-09 – iPhone through Xcode: S-004-01, 02, 04, 05, 06.  
  _Verification commands:_ `npm run build && npx cap sync ios && npm run open:ios`, Run  
  _Notes:_ 2026-10-19 owner ran checks 1–5 on an iPhone and reported all working.  

### I5 – Docs and drift gate
- [x] T-004-10 – Knowledge map, roadmap, drift gate report in plan.md.  
  _Verification commands:_ `npx vp check`, `npx vp run typecheck`, `npx vp test`, `npx vp run build`  

## Notes / TODOs
- T-004-07 added `src/utils/singleTap.ts` (test first, 3 cases): Swiper emits `tap` for both taps of a double tap, so the overlay toggle waits out the double-tap window (FR-004-07).
- Lint checkpoint: `npx vp check` (never `--fix` on the whole tree) after each new helper.
