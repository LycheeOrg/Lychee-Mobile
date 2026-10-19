# Feature 002 Tasks – Login

_Status: Complete_  
_Last updated: 2026-10-19_

> Keep this checklist aligned with the feature plan increments. Stage tests before implementation, record verification commands beside each task, and prefer bite-sized entries (≤90 minutes).
> **Mark tasks `[x]` immediately** after each one passes verification—do not batch completions. Update the roadmap status when all tasks are done.

## Checklist

### I1 – Transport additions
- [x] T-002-01 – Fixtures from Lychee 7.11.1 in `src/services/__fixtures__/lychee-7.11.1/`: `auth-user-guest.json`, `auth-config.json`, `error-401-login.json`; `auth-user.json` built from `UserResource` (API-002-01 … 04).  
  _Verification commands:_ files reviewed  
- [x] T-002-02 – Failing tests: `lycheeHttp.post()` sends a JSON body with the JSON headers and `X-XSRF-TOKEN`; `clearCookies()` clears the server's cookies; `withTimeout()` resolves with the work, or with a timeout marker after the limit and aborts the signal (FR-002-01, FR-002-04, NFR-002-02).  
  _Verification commands:_ `npx vp test src/services/lycheeHttp.test.ts src/services/timeout.test.ts` (red)  
- [x] T-002-03 – Implement `post()`, `clearCookies()`, `src/services/timeout.ts`; `checkServer()` uses `withTimeout()`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I2 – Auth service
- [x] T-002-04 – Failing `src/services/auth.test.ts` (FR-002-01, 03, 04, 07, S-002-01 … 05, 08, 11, 12).  
  _Intent:_ sign-in ok; 401, 429, other status, network error, 10 s timeout; `Auth::user` without id after login → failed; account read signed in / guest / failure; sign-out clears cookies on success, failure and timeout; `Auth::config` methods and failure.  
  _Verification commands:_ `npx vp test src/services/auth.test.ts` (red)  
- [x] T-002-05 – Implement `src/services/auth.ts`.  
  _Verification commands:_ `npx vp test src/services/auth.test.ts`, `npx vp check`, `npx vp run typecheck`  

### I3 – Account store and launch
- [x] T-002-06 – Failing `src/stores/account.test.ts` and `src/stores/session.test.ts` (FR-002-02, 03, 05, NFR-002-01, S-002-06 … 10).  
  _Intent:_ account store: refresh → signed in / signed out / unknown; sign-in success and failure kinds, `signingIn` flag; sign-out; reset; other methods; no password anywhere in state. Session: `connect()` resets the account on a new URL and says whether to open sign-in; `launch()` reads the account only after a successful server check.  
  _Verification commands:_ `npx vp test src/stores` (red)  
- [x] T-002-07 – Implement `src/stores/account.ts` and `src/stores/session.ts`.  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I4 – UI
- [x] T-002-08 – Messages: failing `src/utils/accountMessages.test.ts`, then `signInFailureMessage()`, `otherMethodsNote()` (FR-002-01, FR-002-07).  
  _Verification commands:_ `npx vp test src/utils/accountMessages.test.ts`  
- [x] T-002-09 – `LoginPage.vue` and `/login` route; HomePage account line and Connect → sign-in; `App.vue` and Retry use the launch sequence (FR-002-05, 06, 08, UI-002-01 … 05).  
  _Verification commands:_ `npx vp check`, `npx vp run typecheck`, `npx vp run build`, `npx cap sync`  

### I5 – Device checks
- [x] T-002-10 – Pixel 11 Pro (live reload): S-002-01, 02, 06, 07 (sign out in the web UI, relaunch), 08, 09, 10 against `lapaglia.pics` and the LAN server.  
  _Verification commands:_ `npx cap run android --target 67240DLKX002B4`  
  _Notes:_ 2026-10-19 owner ran the checklist on the Pixel 11 Pro (wrong password, sign in, kill and relaunch, sign out, guest, signed out in the web UI, server change) and reported it working.  
- [x] T-002-11 – iOS simulator through Xcode: S-002-01, 06, 08, 10.  
  _Verification commands:_ `npm run build && npx cap sync ios && npm run open:ios`, Run  
  _Notes:_ 2026-10-19 owner ran it on an iPhone through Xcode and reported it working.  

### I6 – Docs and drift gate
- [x] T-002-12 – Knowledge map, roadmap, drift gate report in plan.md.  
  _Verification commands:_ `npx vp check`, `npx vp run typecheck`, `npx vp test`, `npx vp run build`  

## Notes / TODOs
- Lint checkpoint: `npx vp check` (never `--fix` on the whole tree) after each new helper.
