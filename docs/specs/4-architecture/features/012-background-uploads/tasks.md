# Feature 012 Tasks – Background Uploads

_Status: Complete_  
_Last updated: 2026-10-20_

> Keep this checklist aligned with the feature plan increments. Stage tests before implementation, record verification commands beside each task, and prefer bite-sized entries (≤90 minutes).
> **Mark tasks `[x]` immediately** after each one passes verification—do not batch completions. Update the roadmap status when all tasks are done.

## Checklist
- [x] T-012-01 – Failing tests, then queue run tracking, `ringState()`, `UploadRing.vue` on every page's toolbar, the "+" badge removed (FR-012-01, 02, S-012-01, 05, 07).  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  
- [x] T-012-02 – Failing tests, then cleanup kinds in the pending list, `persistPicked()` (Android grant, iOS copy), recording picked files, Remove in the upload sheet; Android persistable access and `releaseAccess` (FR-012-04, S-012-04).  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`, `cd android && ./gradlew assembleDebug`  
- [x] T-012-03 – Failing tests, then the keep-alive runner; Android `UploadKeepAlivePlugin` and `UploadService`; iOS `UploadKeepAlivePlugin` (FR-012-03, S-012-02, 03, 06).  
  _Verification commands:_ `npx vp test`, `npx vp run build`, `npx cap sync`, `./gradlew assembleDebug`, iOS simulator `xcodebuild`  
- [x] T-012-04 – Device checks on the Pixel and the iPhone (S-012-01 … 07). (Owner, 2026-10-20: working well.)
- [x] T-012-05 – Knowledge map, notes in Features 005 and 011, roadmap, drift gate.
