# Feature Plan 006 – Stored Credentials

_Linked specification:_ [spec.md](spec.md)  
_Linked tasks:_ [tasks.md](tasks.md)  
_Status:_ Complete  
_Last updated:_ 2026-10-19

> Guardrail: Keep this plan traceable back to the governing spec. Reference FR/NFR/Scenario IDs from `spec.md` where relevant, log any new high- or medium-impact questions in the feature's [open-questions.md](open-questions.md), and assume clarifications are resolved only when the spec's normative sections and, where applicable, ADRs under `docs/specs/6-decisions/` have been updated.

## Vision & Success Criteria
The user signs in once and stays signed in until the password changes. Success: on the Pixel and an iPhone, the app keeps working after Lychee's session ends (silent login, no visible prompt), a password changed on the server leads to the sign-in page with the username filled in, and sign-out removes the stored credentials.

## Scope Alignment
- **In scope:** FR-006-01 … 05, NFR-006-01 … 03; changes to Feature 002 (no `remember_me`), 003 (retry after a silent login) and 005 (upload retry).
- **Out of scope:** spec Non-Goals.

## Dependencies & Interfaces
- **New dependency:** `@aparajita/capacitor-secure-storage` `8.0.1`, pinned exactly. **Approved by the owner on 2026-10-19** ("use option a all of them", Q-006-01 Option A). Rationale in ADR-006-01. It declares `@capacitor/app` (already used) and `@capacitor/keyboard` as dependencies; Capacitor only syncs plugins listed in the app's own `package.json`, so the keyboard plugin isn't added to the native projects.
- `capacitor.config.ts`: `loggingBehavior: "none"` (NFR-006-01).
- Feature 002 auth service and account store; Feature 003 gallery context and models; Feature 005 upload queue.

## Assumptions & Risks
- **Assumptions:** Lychee forgets the user when the session expires without a remember cookie, and answers 401 (`UnauthenticatedException`) to gallery and upload calls.
- **Risks / Mitigations:**
  - _Login loops burn the 10-per-hour throttle_ → single flight, 60 s guard, no retry after a rejected password (NFR-006-02).
  - _Android restores encrypted credentials without the Keystore key_ → unreadable → deleted (FR-006-05).
  - _Waiting 2 hours on a device to test expiry_ → sign out on the server (web UI) instead, which ends the session the same way.

## Implementation Drift Gate
After T-006-12: map FR/NFR/S IDs to tests, rerun the quality gate, record findings below.

## Increment Map
1. **I0 – Dependency and config:** install pinned, `loggingBehavior`, `npx cap sync`.
2. **I1 – Credentials service** (FR-006-01, 04, 05, NFR-006-03): failing tests → `src/services/credentials.ts`.
3. **I2 – Sign-in without remember me and reauthentication** (FR-006-01 … 04, NFR-006-01, 02): failing auth and account store tests → `auth.ts`, `account.ts`, `session.ts`.
4. **I3 – Retry after silent login** (FR-006-02): failing gallery model and upload queue tests → `galleryContext.ts`, `albumList.ts`, `albumPage.ts`, `uploadQueue.ts`.
5. **I4 – UI** (FR-006-03): sign-in page prefill and message, navigation on rejection.
6. **I5 – Device checks.**
7. **I6 – Docs and drift gate.**

_Commands for every increment:_ `npx vp test <file>`, `npx vp check`, `npx vp run typecheck`; I0 and I4–I5 also `npx vp run build`, `npx cap sync`.

## Analysis Gate

Run 2026-10-19 by the agent.
1. Specification completeness — ✅ FR/NFR complete; Q-006-01 … 04 folded in; mock-up present.
2. Open questions review — ✅ none open; ADR-006-01 written, ADR-002-01 marked superseded.
3. Plan alignment — ✅ plan links spec and tasks.
4. Tasks coverage — ✅ every FR has tasks; tests precede code; failure branches listed (S-006-04, 05, 10).
5. Working-agreement compliance — ✅ dependency approved and recorded; no other dependency.
6. Tooling readiness — ✅ commands above; Pixel and iPhone.

**Outcome:** cleared for implementation.

## Exit Criteria
- All tasks `[x]`; quality gate green; device checks recorded.
- Knowledge map and roadmap updated; drift gate recorded.

## Intent Log
- 2026-10-19: owner asked whether the app stores the password; answered no (ADR-002-01). Owner asked to store username and password securely and drop `remember_me`. The agent read two secure-storage plugins' native code and logged Q-006-01 … 04; the owner asked about doing it without a dependency (explained), then chose Option A for all four. While writing ADR-006-01 the agent noticed Capacitor's debug bridge logging would print the stored credentials and turned it off (NFR-006-01). Implemented test-first: `credentials.ts` (11 tests), `signIn` without `remember_me`, account store storage and `reauthenticate()` (single flight, 60 s cooldown, rejection handling), launch reauthentication, one retry after a silent login in the album list, album page and upload queue, sign-in page prefill and navigation on rejection. 389 Vitest tests. The iOS package lock gained `keychain-swift` 21.0.0 (the plugin's Swift package). The owner ran the apps manually on the Pixel and an iPhone and reported them working; the full automated gate (lint/format, type-check, 389 tests, build, `cap sync`, `./gradlew assembleDebug`) passed.

## Drift Gate Report

Run 2026-10-19 by the agent; owner reported the device runs the same day.

**Preconditions:** 10/10 tasks `[x]`; `npx vp check`, `npx vp run typecheck`, `npx vp test` (28 files, 389 tests), `npx vp run build`, `npx cap sync`, `./gradlew assembleDebug` green; `package.json` adds only `@aparajita/capacitor-secure-storage` `8.0.1` (approved).

| Requirement | Code | Evidence |
|-------------|------|----------|
| FR-006-01 | `auth.ts` (no `remember_me`), `account.ts` save, `credentials.ts` | `auth.test.ts`, `account.test.ts`, `credentials.test.ts` |
| FR-006-02 | `account.reauthenticate()`, `session.launch()`, `recoverSession()`, retries in `albumList.ts`, `albumPage.ts`, `uploadQueue.ts` | `account.test.ts`, `session.test.ts`, model and queue tests |
| FR-006-03 | rejection handling, `passwordRejected`, `App.vue` watch, `LoginPage.vue` | `account.test.ts` |
| FR-006-04 | forget on sign-out and reset | `account.test.ts` |
| FR-006-05 | `loadCredentials()` deletes unreadable data | `credentials.test.ts` |
| NFR-006-01 | no password in state; `loggingBehavior: "none"` | state assertions; `capacitor.config.ts` |
| NFR-006-02 | single flight, 60 s cooldown, one retry per call/file | `account.test.ts`, model and queue tests |
| NFR-006-03 | `nativeSecureStore` options; pinned version | `credentials.test.ts` (mocked plugin); `package.json` |

**Not verified on a device in detail:** the owner reported the apps working after a manual run without itemising scenarios; the expired-session paths (S-006-02/03), the rejected password (S-006-04) and unreadable storage (S-006-10) are covered by unit tests.

**Divergences:** `loggingBehavior: "none"` was added while writing the ADR (NFR-006-01), not in the original request. No other drift.

**Lessons:**
- Debug-only logging still matters once secrets pass through the bridge: Capacitor prints plugin results in debug builds.
- Testing session expiry on a device needs either the 2-hour wait or clearing the app's cookies; worth a debug helper if this area changes again.
