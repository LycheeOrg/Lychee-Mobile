# Feature 009 Tasks – Usability Fixes

_Status: In progress_  
_Last updated: 2026-10-20_

> Keep this checklist aligned with the feature plan increments. Stage tests before implementation, record verification commands beside each task, and prefer bite-sized entries (≤90 minutes).
> **Mark tasks `[x]` immediately** after each one passes verification—do not batch completions. Update the roadmap status when all tasks are done.

## Checklist
- [x] T-009-01 – Failing `backButton.test.ts`, then `rootBackHandler` and its registration in `App.vue` (FR-009-01, S-009-01 … 03).  
  _Verification commands:_ `npx vp test src/utils/backButton.test.ts`, `npx vp check`, `npx vp run typecheck`  
- [x] T-009-02 – Failing `PhotoViewer.test.ts` case, then white overlay buttons (FR-009-02, S-009-04).  
  _Verification commands:_ `npx vp test src/components/PhotoViewer.test.ts`, `npx vp run build`, `npx cap sync`, `./gradlew assembleDebug`  
- [x] T-009-03 – Stored credentials first (FR-009-03), after Q-009-01.
- [x] T-009-04 – Combined Settings (FR-009-04), after Q-009-02.
- [x] T-009-05 – Original file names (FR-009-05), after Q-009-03.
- [ ] T-009-06 – (Owner, 2026-10-20, Android: white ✕ and ⓘ, camera file names, and the cold start straight to the album list with the stored login (S-009-05, S-009-14) confirmed. Open: back closing the app, the Settings Save variants, the iPhone.) Device checks on the Pixel and the iPhone (S-009-01 … 04 and the scenarios of T-009-03 … 05).
- [x] T-009-07 – Knowledge map, amended features' specs, roadmap, drift gate.
