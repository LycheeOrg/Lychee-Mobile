# Feature 008 Tasks – Photo Info Panel

_Status: Complete_  
_Last updated: 2026-10-20_

> Keep this checklist aligned with the feature plan increments. Stage tests before implementation, record verification commands beside each task, and prefer bite-sized entries (≤90 minutes).
> **Mark tasks `[x]` immediately** after each one passes verification—do not batch completions. Update the roadmap status when all tasks are done.

## Checklist

### I1 – Fixtures and parsers
- [x] T-008-01 – Fixtures: full EXIF and GPS on the first photo of `album-photos.json` (from Lychee's `PreformattedPhotoData`/`PreComputedPhotoData`, values as in the owner's screenshot); `is_exif_disabled` in `gallery-init.json`; new `photo-albums.json` (`PhotoAlbumResource[]`) and `map-provider.json` (`MapProviderData`).  
  _Verification commands:_ fields checked against the PHP classes  
- [x] T-008-02 – Failing parser tests, then `PhotoTile.details` (all of DO-008-01, empty values for missing fields, 7.1.x-shaped photo, description to text with hostile HTML), `GallerySettings.exifDisabled`, `AlbumHead.mapAllowed` (FR-008-02 … 05, 07, NFR-008-02, 03, S-008-03, 07, 10, 12).  
  _Verification commands:_ `npx vp test src/services/galleryParsers.test.ts src/services/photoDetails.test.ts` (red, then green), `npx vp check`, `npx vp run typecheck`  

### I2 – Services and helpers
- [x] T-008-03 – Failing tests: `Gallery.photoAlbums()` (200, empty, 404 → `unsupported`, 401, 500, network, timeout); `Gallery.mapProvider()` (parsed, cached, failure → `null`); `loadPhotoAlbums()` (401 recovery once); `mapTiles()` (centre tile and offsets, `{s}` and whitespace, edges); `mapsUrl()` per platform; `cameraLine()` (FR-008-04 … 06, S-008-05, 06, 08, 09, 11).  
  _Verification commands:_ `npx vp test src/services/gallery.test.ts src/utils/photoInfo.test.ts src/stores/photoAlbums.test.ts` (red)  
- [x] T-008-04 – Implement them.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I3 – Panel
- [x] T-008-05 – Failing component tests for `PhotoInfoPanel.vue`: sections present and absent per data; video header; `*` on modified dates; albums loading, list, empty, failed, unsupported; map only when allowed and coordinates exist; tapping the map opens the maps URL (FR-008-02 … 06).  
  _Verification commands:_ `npx vp test src/components/PhotoInfoPanel.test.ts` (red)  
- [x] T-008-06 – Implement `PhotoInfoPanel.vue` and `StaticMap.vue`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I4 – Viewer wiring
- [x] T-008-07 – Failing component test: the viewer shows the "i" button unless EXIF is disabled; the panel gets the active photo (FR-008-01, S-008-02, 04).  
  _Verification commands:_ `npx vp test src/components/PhotoViewer.test.ts` (red)  
- [x] T-008-08 – "i" button, sheet `IonModal` (breakpoints 0, 0.5, 1; backdrop 0.75), `mapAllowed` and the gallery context from `AlbumPage`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`, `npx vp run build`, `npx cap sync`  

### I5 – Device checks
- [x] T-008-09 – (Android confirmed by the owner first: half-height sheet expands to full height, map tiles load, tapping the map opens Google Maps, details match Lychee's web panel; the iPhone and swiping with the sheet at half height reported passed, 2026-10-20.) Pixel 11 Pro and iPhone: S-008-01 … 12; tiles load in the WebView; the sheet doesn't fight the viewer's swipes.  
  _Verification commands:_ `npm run android`, `npm run ios`  

### I6 – Docs and drift gate
- [x] T-008-10 – Knowledge map, roadmap.  
  _Verification commands:_ `npx vp check`  
- [x] T-008-11 – Drift gate report in the plan.  
  _Verification commands:_ `npx vp check`, `npx vp run typecheck`, `npx vp test`, `npx vp run build`  
