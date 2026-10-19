# Feature 006 Tasks – Stored Credentials

_Status: Complete_  
_Last updated: 2026-10-19_

> Keep this checklist aligned with the feature plan increments. Stage tests before implementation, record verification commands beside each task, and prefer bite-sized entries (≤90 minutes).
> **Mark tasks `[x]` immediately** after each one passes verification—do not batch completions. Update the roadmap status when all tasks are done.

## Checklist

### I0 – Dependency and config
- [x] T-006-00 – Install `@aparajita/capacitor-secure-storage@8.0.1` pinned exactly (owner approval 2026-10-19); `loggingBehavior: "none"`; `npx cap sync` (NC-006-01, NFR-006-01, 03).  
  _Verification commands:_ `npm ls @aparajita/capacitor-secure-storage`, `git diff package.json package-lock.json`, `npx cap sync`  

### I1 – Credentials service
- [x] T-006-01 – Failing `src/services/credentials.test.ts`: save with sync off and `afterFirstUnlockThisDeviceOnly`; load only for the matching server; malformed or unreadable → deleted and `null`; forget; save failure → `false` (FR-006-01, 04, 05, NFR-006-03).  
  _Verification commands:_ `npx vp test src/services/credentials.test.ts` (red)  
- [x] T-006-02 – Implement `src/services/credentials.ts`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I2 – Sign-in and reauthentication
- [x] T-006-03 – Failing tests: `signIn` sends no `remember_me`; account store stores on sign-in, forgets on sign-out and reset; `reauthenticate()` (no credentials, success, single flight, 60 s guard, wrong password → forget + `passwordRejected`, throttle/offline keep); session launch reauthenticates when signed out (FR-006-01 … 04, NFR-006-01, 02, S-006-01 … 08).  
  _Verification commands:_ `npx vp test src/services/auth.test.ts src/stores/account.test.ts src/stores/session.test.ts` (red)  
- [x] T-006-04 – Implement in `auth.ts`, `account.ts`, `session.ts`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I3 – Retry after silent login
- [x] T-006-05 – Failing tests: album list and album page retry once when `onUnauthenticated()` resolves true and show sign-in when false; upload queue re-queues the file once after a successful silent login (FR-006-02, S-006-02, 09).  
  _Verification commands:_ `npx vp test src/stores` (red)  
- [x] T-006-06 – Implement in `galleryContext.ts`, `albumList.ts`, `albumPage.ts`, `uploadQueue.ts`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I4 – UI
- [x] T-006-07 – Sign-in page prefill and "Your password changed or was reset. Sign in again."; open the sign-in page on rejection (FR-006-03).  
  _Verification commands:_ `npx vp check`, `npx vp run typecheck`, `npx vp run build`  

### I5 – Device checks
- [x] T-006-08 – Pixel: S-006-01 … 09 (session ended by signing out in the web UI); logcat shows no credentials.  
  _Verification commands:_ `npx cap run android --target 67240DLKX002B4`  
  _Notes:_ 2026-10-19 the owner ran the app manually on the Pixel and reported it working; which of S-006-01 … 09 were exercised wasn't itemised.  
- [x] T-006-09 – iPhone through Xcode: S-006-01 … 04, 07.  
  _Verification commands:_ `npm run build && npx cap sync ios && npm run open:ios`, Run  
  _Notes:_ 2026-10-19 the owner ran the app manually on the iPhone and reported it working.  

### I6 – Docs and drift gate
- [x] T-006-12 – Knowledge map, roadmap, drift gate report in plan.md.  
  _Verification commands:_ `npx vp check`, `npx vp run typecheck`, `npx vp test`, `npx vp run build`  

## Notes / TODOs
- Lint checkpoint: `npx vp check` (never `--fix` on the whole tree) after each new helper.
