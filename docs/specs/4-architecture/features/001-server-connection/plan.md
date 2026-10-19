# Feature Plan 001 – Server Connection

_Linked specification:_ [spec.md](spec.md)  
_Linked tasks:_ [tasks.md](tasks.md)  
_Status:_ Implemented  
_Last updated:_ 2026-10-19

> Guardrail: Keep this plan traceable back to the governing spec. Reference FR/NFR/Scenario IDs from `spec.md` where relevant, log any new high- or medium-impact questions in the feature's [open-questions.md](open-questions.md), and assume clarifications are resolved only when the spec's normative sections and, where applicable, ADRs under `docs/specs/6-decisions/` have been updated.

## Vision & Success Criteria
A user types their Lychee address once, learns within 10 s whether it works and why not, and the app remembers it and re-checks it at launch. Success: on the Pixel 11 Pro, `https://lapaglia.pics` (Lychee 7.11.1) connects and shows its version; a typo, a public http address and an unreachable host each show their own message; every result kind is covered by Vitest.

## Scope Alignment
- **In scope:** FR-001-01 … 04, NFR-001-01 … 04; CapacitorHttp; Android/iOS plain-http settings; launch check and banner.
- **Out of scope:** spec Non-Goals (login, browsing, discovery, several servers, server calls in a desktop browser).

## Dependencies & Interfaces
- `@capacitor/core` (CapacitorHttp, CapacitorCookies), `@capacitor/preferences`: already installed; no new dependency.
- Lychee 7.x API (API-001-00, API-001-01); fixtures recorded from Lychee 7.11.1.
- ADR-001-01, ADR-001-02.

## Assumptions & Risks
- **Assumptions:** Lychee sets the `XSRF-TOKEN` cookie on `GET {server}/` (verified on 7.11.1).
- **Risks / Mitigations:**
  - _TLS errors are reported as plain error messages by the native stack_ → classify by message (`certificate|ssl|tls|trust`, case-insensitive); unknown errors fall back to `unreachable`.
  - _`NSAllowsLocalNetworking` and raw IP addresses_ → verify on the iOS simulator against a LAN http server (T-001-11).
  - _Android cleartext is app-enforced only_ (ADR-001-02) → boundary unit tests on `isLocalNetworkHost()`.

## Implementation Drift Gate
After T-001-12: map FR/NFR/S IDs to tests, rerun the quality gate, record findings below.

## Increment Map
1. **I1 – Local-network host rule** (NFR-001-03, S-001-06/07): failing `networkPolicy.test.ts` → `src/utils/networkPolicy.ts`.
2. **I2 – Lychee HTTP helper** (FR-001-04, API-001-00/01): record fixtures; failing `lycheeHttp.test.ts` (session bootstrap, JSON headers, decoded XSRF header, cookie reader per server URL) → `src/services/lycheeHttp.ts`.
3. **I3 – Server check** (FR-001-01, NFR-001-01/02, S-001-01 … 08): failing `server.test.ts` for every result kind and the 10 s timeout → `src/services/server.ts`.
4. **I4 – Server store** (FR-001-02/03, S-001-09/10): failing `stores/server.test.ts` (stores on success only, replaces the previous server, launch check, Retry) → `src/stores/server.ts`.
5. **I5 – UI and native wiring** (FR-001-02/03/04, UI-001-01 … 04): HomePage states, launch banner; `capacitor.config.ts` CapacitorHttp; `AndroidManifest.xml` cleartext; `Info.plist` ATS; `npx cap sync`.
6. **I6 – Device checks** (S-001-01 … 10): Pixel 11 Pro via live reload against `lapaglia.pics` and failure cases; iOS simulator incl. a LAN http server.
7. **I7 – Docs and drift gate.**

_Commands for every increment:_ `npx vp test <file>`, `npx vp check`, `npx vp run typecheck`; I5–I6 also `npx vp run build`, `npx cap sync`, `cd android && ./gradlew assembleDebug`.

## Scenario Tracking

| Scenario ID | Increment / Task reference | Notes |
|-------------|---------------------------|-------|
| S-001-01, 02 | I3 / T-001-05, T-001-06; I6 / T-001-11 | fixtures with and without version |
| S-001-03 | I3 / T-001-05 | no request |
| S-001-04 | I3 / T-001-05 | fake timers |
| S-001-05 | I3 / T-001-05 | 404, HTML, other JSON, 406/419 |
| S-001-06, 07 | I1 / T-001-01; I3 / T-001-05 | |
| S-001-08 | I3 / T-001-05 | error message classification |
| S-001-09, 10 | I4 / T-001-07; I6 / T-001-11 | |

## Analysis Gate

Run 2026-10-19 by the agent.
1. Specification completeness — ✅ FR/NFR complete; Q-001-01 … 05 folded in; ASCII mock-up present.
2. Open questions review — ✅ none open; ADR-001-01 and ADR-001-02 written.
3. Plan alignment — ✅ plan links spec and tasks; success criteria match.
4. Tasks coverage — ✅ every FR has tasks; tests precede code; failure branches listed (S-001-03 … 08, 10).
5. Working-agreement compliance — ✅ no new dependency; pure helpers and injected I/O (NFR-001-04); ADR-0001 … 0003 reviewed.
6. Tooling readiness — ✅ commands above; device available (Pixel 11 Pro, live reload).

**Outcome:** cleared for implementation.

## Exit Criteria
- All tasks `[x]`; quality gate green; Android debug build and iOS simulator build green in CI.
- Knowledge map and roadmap updated; drift gate recorded.

## Follow-ups / Backlog
- Feature 002: consider Lychee API tokens, and propose per-device tokens upstream (one token per user today).

## Intent Log
- 2026-10-19: owner asked to start roadmap feature 001. The Lychee contract was verified against `lapaglia.pics` (7.11.1): 406 without a JSON content type, 419 without CSRF, 200 with the session cookie + `X-XSRF-TOKEN` after `GET /`. Owner chose Option A for Q-001-01 … 05. Implemented test-first (67 Vitest tests). Device check on the Pixel 11 Pro via live reload: `https://lapaglia.pics` and `http://192.168.1.164:4879` (LAN, plain http through `usesCleartextTraffic` + `isLocalNetworkHost()`) both connect to Lychee 7.11.1 with the native HTTP + XSRF flow; launch check silent. Found and fixed while testing: the live-reload script assumed `cap run --live-reload` exits after deploying (it stays in the foreground), and stopping `npx vp dev` orphaned Vite on port 5173 (now its own process group).

## Drift Gate Report

Run 2026-10-19 by the agent (owner acknowledgement pending).

**Preconditions:** 12/12 tasks `[x]`; `npx vp check`, `npx vp run typecheck`, `npx vp test` (6 files, 67 tests), `npx vp run build` green; Android debug build and iOS simulator build produced locally.

| Requirement | Code | Evidence |
|-------------|------|----------|
| FR-001-01 | `src/services/server.ts`, `src/utils/networkPolicy.ts`, `src/utils/serverUrl.ts` | `server.test.ts` (18), `networkPolicy.test.ts` (22); Pixel + iOS simulator |
| FR-001-02 | `src/stores/server.ts`, `src/views/HomePage.vue` | `stores/server.test.ts`; Pixel |
| FR-001-03 | `src/stores/server.ts`, `src/App.vue`, `HomePage.vue` banner | `stores/server.test.ts`; Pixel (airplane mode), iOS simulator (unreachable LAN host) |
| FR-001-04 | `src/services/lycheeHttp.ts`, `capacitor.config.ts` | `lycheeHttp.test.ts` (6); real Lychee 7.11.1 on both platforms |
| NFR-001-01 | `CHECK_TIMEOUT_MS` raced against the request | timeout tests incl. a request ignoring the abort signal |
| NFR-001-02 | only `GET /` and `GET /api/v2/Version` | `lycheeHttp`/`server` request assertions |
| NFR-001-03 | `isLocalNetworkHost()`, `usesCleartextTraffic`, `NSAllowsLocalNetworking` | boundary tests; LAN `http://192.168.1.164:4879` on Pixel and iOS 27.1 simulator |
| NFR-001-04 | services/store with injected I/O; view maps state only | all logic tested in jsdom |

**Not exercised on a device** (unit-tested only): S-001-05 not Lychee, S-001-07 public http, S-001-08 certificate error; the TLS message classification relies on the native error text (risk noted above).

**Divergences:** NFR-001-03 and ADR-001-02 record that Android cannot scope cleartext to IP ranges (OS-level allowance, app-level rule), found while implementing; low impact, documented. No other drift.

**Lessons:**
- Lychee's `api/v2` needs a JSON content type and CSRF even for public GETs; probing a real server early saved a wrong design.
- `cap run --live-reload` stays in the foreground; `npx vp dev` must run in its own process group or Vite outlives the script.
- This Xcode 27.1 install has no Simulator.app, so `cap run ios` cannot deploy; the simulator was driven headless with `simctl` (boot, install, launch, preferences through `defaults` on the container plist, screenshots).
