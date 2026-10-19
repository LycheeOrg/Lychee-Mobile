# Feature Plan 002 – Login

_Linked specification:_ [spec.md](spec.md)  
_Linked tasks:_ [tasks.md](tasks.md)  
_Status:_ Complete  
_Last updated:_ 2026-10-19

> Guardrail: Keep this plan traceable back to the governing spec. Reference FR/NFR/Scenario IDs from `spec.md` where relevant, log any new high- or medium-impact questions in the feature's [open-questions.md](open-questions.md), and assume clarifications are resolved only when the spec's normative sections and, where applicable, ADRs under `docs/specs/6-decisions/` have been updated.

## Vision & Success Criteria
After connecting, a user signs in once with their Lychee username and password and stays signed in across launches, or continues as a guest. Success: on the Pixel 11 Pro and the iOS simulator, signing in to `lapaglia.pics` survives killing and relaunching the app, sign-out sticks, a wrong password shows its message, and every result kind is covered by Vitest.

## Scope Alignment
- **In scope:** FR-002-01 … 08, NFR-002-01 … 05; sign-in page, account line, launch account check.
- **Out of scope:** spec Non-Goals (OAuth, passkeys, API tokens, browsing, expired-session prompts during browsing).

## Dependencies & Interfaces
- `@capacitor/core` (CapacitorHttp, CapacitorCookies): installed; no new dependency (NFR-002-05).
- Lychee 7.x API-002-01 … 04; fixtures from Lychee 7.11.1.
- ADR-001-01, ADR-001-02, ADR-002-01; Feature 001's `lycheeHttp`, `serverStore`.

## Assumptions & Risks
- **Assumptions:** the native cookie stores persist cookies with an expiry across app kills (Android flushes on every set; iOS `HTTPCookieStorage`).
- **Risks / Mitigations:**
  - _Cookie persistence differs on a device_ → kill-and-relaunch check on both platforms (T-002-10, T-002-11).
  - _No test account on the recorded server_ → signed-in `Auth::user` fixture built from `UserResource`; the owner signs in with their own account on the devices.
  - _Login throttle (10 per hour)_ → no 429 recorded from the live server; tests use the status only.

## Implementation Drift Gate
After T-002-12: map FR/NFR/S IDs to tests, rerun the quality gate, record findings below.

## Increment Map
1. **I1 – Transport additions** (FR-002-01, FR-002-04, NFR-002-02): fixtures; failing tests for `lycheeHttp.post()` and `clearCookies`, and a shared timeout helper extracted from `checkServer()` → implementation; Feature 001 tests stay green.
2. **I2 – Auth service** (FR-002-01, 03, 04, 07, S-002-01 … 05, 11): failing `auth.test.ts` → `src/services/auth.ts`.
3. **I3 – Account store and launch** (FR-002-02, 03, 05, NFR-002-01, S-002-06 … 10): failing `stores/account.test.ts` → `src/stores/account.ts`, launch sequence.
4. **I4 – UI** (FR-002-05, 06, 08, UI-002-01 … 05): `LoginPage.vue`, `/login` route, account line, launch wiring in `App.vue`.
5. **I5 – Device checks** (S-002-01, 02, 06 … 10).
6. **I6 – Docs and drift gate.**

_Commands for every increment:_ `npx vp test <file>`, `npx vp check`, `npx vp run typecheck`; I4–I5 also `npx vp run build`, `npx cap sync`.

## Scenario Tracking

| Scenario ID | Increment / Task reference | Notes |
|-------------|---------------------------|-------|
| S-002-01 … 05 | I2 / T-002-04, T-002-05; I5 / T-002-10, T-002-11 | |
| S-002-06, 07 | I3 / T-002-06; I5 / T-002-10, T-002-11 | kill and relaunch on devices |
| S-002-08 | I2, I3 / T-002-04, T-002-06; I5 | offline sign-out unit-tested |
| S-002-09, 10 | I3 / T-002-06; I5 / T-002-10, T-002-11 | |
| S-002-11 | I2 / T-002-04; I4 | |
| S-002-12 | I2 / T-002-04 | same call as local accounts |

## Analysis Gate

Run 2026-10-19 by the agent.
1. Specification completeness — ✅ FR/NFR complete; Q-002-01 … 04 folded in; ASCII mock-ups present.
2. Open questions review — ✅ none open; ADR-002-01 written.
3. Plan alignment — ✅ plan links spec and tasks; success criteria match.
4. Tasks coverage — ✅ every FR has tasks; tests precede code; failure branches listed (S-002-02 … 05, 07, 08).
5. Working-agreement compliance — ✅ no new dependency; injected I/O (NFR-002-04); ADR-001-01, ADR-001-02 reviewed.
6. Tooling readiness — ✅ commands above; Pixel 11 Pro with live reload; iOS through Xcode (Device Hub, see Feature 001 backlog).

**Outcome:** cleared for implementation.

## Exit Criteria
- All tasks `[x]`; quality gate green; device checks recorded.
- Knowledge map and roadmap updated; drift gate recorded.

## Follow-ups / Backlog
- Feature 003: on a 401 from a gallery call, mark the account signed out and offer the sign-in page.

## Intent Log
- 2026-10-19: owner asked to start Feature 002. The agent read Lychee's `AuthController`, `LoginRequest`, `SessionOrTokenGuard`, `AuthConfig`, session/remember lifetimes, and probed `lapaglia.pics` (7.11.1): `Auth::config` `{oauthProviders: [], u2f_enabled: false}`, guest `Auth::user` with `id: null`, a wrong login → 401 with `X-RateLimit-Limit: 10` (two deliberate wrong attempts in total). Owner chose Option A for Q-002-01 … 04. Implemented test-first: `lycheeHttp.post()`/`clearCookies()`, `withTimeout()` extracted from `checkServer()` (Feature 001 tests unchanged and green), auth service, account store, session sequencing, messages, `LoginPage.vue`, home page account line. 126 Vitest tests. Installed on the Pixel 11 Pro with `npx cap run android`; the owner ran the device checklist on the Pixel and on an iPhone through Xcode and reported both working.

## Drift Gate Report

Run 2026-10-19 by the agent; owner confirmed the device checks the same day.

**Preconditions:** 12/12 tasks `[x]`; `npx vp check`, `npx vp run typecheck`, `npx vp test` (11 files, 126 tests), `npx vp run build` green; Android debug build installed on the Pixel 11 Pro; iOS run from Xcode by the owner.

| Requirement | Code | Evidence |
|-------------|------|----------|
| FR-002-01 | `services/auth.ts` `signIn()`, `stores/account.ts`, `LoginPage.vue` | `auth.test.ts` (7 sign-in cases), `account.test.ts`; devices |
| FR-002-02 | no app storage; `remember_me: true` | `auth.test.ts` request body; kill and relaunch on both devices |
| FR-002-03 | `readAccount()`, `session.launch()` | `auth.test.ts`, `account.test.ts`, `session.test.ts`; signed out in the web UI on the Pixel |
| FR-002-04 | `signOut()`, `lycheeHttp.clearCookies()` | `auth.test.ts` (success, network error, timeout), `lycheeHttp.test.ts`; devices |
| FR-002-05 | `session.connect()`, `HomePage.vue` | `session.test.ts` (5); server change on the Pixel |
| FR-002-06 | `LoginPage.vue`, `/login` route | devices (guest) |
| FR-002-07 | `readOtherMethods()`, `otherMethodsNote()` | `auth.test.ts`, `accountMessages.test.ts`; no OAuth/passkey server on hand |
| FR-002-08 | `HomePage.vue` account line | devices |
| NFR-002-01 | password only in the request and the page field, cleared after each attempt | `account.test.ts` state check; code review |
| NFR-002-02 | `withTimeout()` / `AUTH_TIMEOUT_MS` | `timeout.test.ts`, timeout cases in `auth.test.ts` |
| NFR-002-03 | ADR-001-02 at connect time | Feature 001 tests |
| NFR-002-04 | injected deps in services and stores | all logic tested in jsdom |
| NFR-002-05 | `package.json` unchanged | diff |

**Not exercised on a device** (unit-tested only): S-002-03 (throttle), S-002-05 (unexpected response), S-002-11 (OAuth/passkey note), S-002-12 (LDAP).

**Divergences:** the launch and Connect sequencing lives in `src/stores/session.ts` (tasks updated); the plan named only the account store. No behavioural drift.

**Lessons:**
- Each auth call starts its own `lycheeHttp` client, so it loads `{server}/` first. That costs one extra request but avoids a stale XSRF token after the 120-minute session expires; Feature 003 should decide whether a shared client retries once on 419 instead.
- Recording fixtures from a live server is limited by the login throttle: two deliberate wrong attempts, no 429 recorded.
