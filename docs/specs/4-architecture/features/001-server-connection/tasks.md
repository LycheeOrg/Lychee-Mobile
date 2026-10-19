# Feature 001 Tasks – Server Connection

_Status: Complete_  
_Last updated: 2026-10-19_

> Keep this checklist aligned with the feature plan increments. Stage tests before implementation, record verification commands beside each task, and prefer bite-sized entries (≤90 minutes).
> **Mark tasks `[x]` immediately** after each one passes verification—do not batch completions. Update the roadmap status when all tasks are done.

## Checklist

### I1 – Local-network host rule
- [x] T-001-01 – Failing `src/utils/networkPolicy.test.ts`, then `isLocalNetworkHost()` (NFR-001-03, S-001-06, S-001-07).  
  _Verification commands:_ `npx vp test src/utils/networkPolicy.test.ts`, `npx vp check`, `npx vp run typecheck`  
  _Notes:_ boundaries 172.15/172.32 public, 10.x, 192.168.x, 127.x, `localhost`, `*.local`, public names and IPs.

### I2 – Lychee HTTP helper
- [x] T-001-02 – Record fixtures from Lychee 7.11.1 (`src/services/__fixtures__/lychee-7.11.1/`): Version 200, 406, 419 (API-001-01).  
  _Verification commands:_ files reviewed  
- [x] T-001-03 – Failing `src/services/lycheeHttp.test.ts` (FR-001-04).  
  _Intent:_ first call loads `{url}/`; API calls send `Accept`/`Content-Type: application/json` and the URL-decoded `X-XSRF-TOKEN` from the cookie reader for that URL; no XSRF header when the cookie is missing.  
  _Verification commands:_ `npx vp test src/services/lycheeHttp.test.ts` (red)  
- [x] T-001-04 – Implement `src/services/lycheeHttp.ts` (FR-001-04).  
  _Verification commands:_ `npx vp test src/services/lycheeHttp.test.ts`, `npx vp check`, `npx vp run typecheck`  

### I3 – Server check
- [x] T-001-05 – Failing `src/services/server.test.ts` (FR-001-01, NFR-001-01/02, S-001-01 … 08).  
  _Intent:_ ok with/without version; invalid address and public http without any request; local http checked; unreachable (network error and 10 s timeout); not Lychee (404, HTML, other JSON, 406, 419); TLS error.  
  _Verification commands:_ `npx vp test src/services/server.test.ts` (red)  
- [x] T-001-06 – Implement `src/services/server.ts` (FR-001-01).  
  _Verification commands:_ `npx vp test src/services/server.test.ts`, `npx vp check`, `npx vp run typecheck`  

### I4 – Server store
- [x] T-001-07 – Failing `src/stores/server.test.ts` (FR-001-02, FR-001-03, S-001-09, S-001-10).  
  _Verification commands:_ `npx vp test src/stores/server.test.ts` (red)  
- [x] T-001-08 – Implement `src/stores/server.ts` (FR-001-02, FR-001-03).  
  _Verification commands:_ `npx vp test`, `npx vp check`, `npx vp run typecheck`  

### I5 – UI and native wiring
- [x] T-001-09 – HomePage states and launch banner (UI-001-01 … 04).  
  _Verification commands:_ `npx vp check`, `npx vp run typecheck`, `npx vp run build`  
- [x] T-001-10 – `capacitor.config.ts` CapacitorHttp; Android `usesCleartextTraffic`; iOS `NSAllowsLocalNetworking`; `npx cap sync` (FR-001-04, NFR-001-03).  
  _Verification commands:_ `npx cap sync`, `cd android && ./gradlew assembleDebug`  

### I6 – Device checks
- [x] T-001-11 – Pixel 11 Pro: `lapaglia.pics` connects with its version; typo, public http and unreachable host show their messages; relaunch re-checks (S-001-01 … 10). iOS simulator, including a LAN http server (ADR-001-02 risk).  
  _Verification commands:_ `npm run android:live`, `npm run ios`  
  _Progress (2026-10-19, Pixel 11 Pro, live reload):_ ✅ S-001-01 `https://lapaglia.pics` → "Connected to Lychee 7.11.1"; ✅ S-001-06 `http://192.168.1.164:4879` (LAN, plain http) → connected; ✅ S-001-09 relaunch with a saved server, no banner; ✅ S-001-03 invalid address and ✅ S-001-04 unreachable messages; ✅ S-001-10 airplane-mode banner + Retry. Not run on the device (unit-tested only): S-001-05 not Lychee, S-001-07 public http, S-001-08 certificate. iOS simulator (iPhone 18 Pro, iOS 27.1, Xcode 27.1; driven headless with `simctl` because this Xcode has no Simulator.app): ✅ launch check against `http://192.168.1.164:4879` succeeds (stored version filled in), so `NSAllowsLocalNetworking` allows plain http to a raw private IP; ✅ `https://lapaglia.pics` succeeds; ✅ unreachable `http://192.168.1.250:4879` shows the banner with Retry.  

### I7 – Docs
- [x] T-001-12 – Knowledge map, roadmap, drift gate report in plan.md.  

## Notes / TODOs
- Server calls only work on a device/emulator/simulator (ADR-001-01); unit tests inject `fetch` and the cookie reader.
