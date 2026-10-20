# Feature Plan 009 – Usability Fixes

_Linked specification:_ [spec.md](spec.md)  
_Linked tasks:_ [tasks.md](tasks.md)  
_Status:_ In progress  
_Last updated:_ 2026-10-20

> Guardrail: Keep this plan traceable back to the governing spec. Reference FR/NFR/Scenario IDs from `spec.md` where relevant, log any new high- or medium-impact questions in the feature's [open-questions.md](open-questions.md), and assume clarifications are resolved only when the spec's normative sections and, where applicable, ADRs under `docs/specs/6-decisions/` have been updated.

## Vision & Success Criteria
The five issues the owner found are gone: back closes the app from the album list, viewer buttons are readable, saved credentials are used without asking, Settings holds server and account, Android uploads keep real file names.

## Scope Alignment
- **In scope:** FR-009-01 … 05.
- **Out of scope:** other UI or account changes.

## Dependencies & Interfaces
- `@capacitor/app` (installed) for `exitApp()`. FR-009-05 Option A would add Android `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` (`READ_EXTERNAL_STORAGE` ≤ 12): needs the owner's approval and an ADR.

## Assumptions & Risks
- **Risks:** the cause of FR-009-03 isn't pinned down; Q-009-01 Option A covers all known paths. The picker's numeric names (FR-009-05) to be confirmed on the Pixel.

## Increment Map
1. **I1 – Back closes the app** (FR-009-01): `rootBackHandler` test-first, registered in `App.vue` at priority 10.
2. **I2 – Readable viewer buttons** (FR-009-02): test, then white icons with a shadow.
3. **I3 – Stored credentials first** (FR-009-03): launch logs in unless signed in; cooldown removed; failures open Settings.
4. **I4 – Combined Settings** (FR-009-04): `session.save()` test-first; Settings rebuilt; `/login` unrouted.
5. **I5 – Original file names** (FR-009-05): picker asks once; `OriginalMedia.requestNameAccess()` and MediaStore name lookup; manifest permissions.
6. **I6 – Device checks, docs, drift gate.**

## Analysis Gate
I1–I2 run 2026-10-20 by the agent: spec rows complete for FR-009-01/02, no open questions affect them, tests precede code. I3–I5 run after Q-009-01 … 03 were answered (A for all): spec rows complete, ADR-009-01 written, tests precede code.

## Intent Log
- 2026-10-20: owner reported five issues. The agent read `@ionic/vue-router`'s back handling (always `history.go(-1)` at priority 0) and Capacitor's `AppPlugin` (its exit at the root is skipped while a JS back listener exists); `PhotoViewer` used `color="light"` (dark grey in Ionic's dark palette); `session.launch`/`connect`, `accountStore.reauthenticate` (60 s cooldown) and the Settings/Sign in pages; `upload.ts` sends the picked name, which Android's photo picker reports as `<id>.<ext>`. Logged Q-009-01 … 03. I1 and I2 done test-first (582 Vitest tests, Android build green).
- 2026-10-20: owner chose A for Q-009-01 … 03. Done test-first: `session.save()` and launch login when the account can't be read; account store without cooldown (the 60 s test replaced by the new rule), silent-login failures reported; Settings rebuilt with username and password, `/login` unrouted and every sign-in link pointed at Settings; picker asks once for name access, `OriginalMedia.requestNameAccess()` and MediaStore lookup by ID, manifest permissions (ADR-009-01). 601 Vitest tests; Android build green. Amendment notes added to the specs of 002, 005, 006; Play Console declaration added to the release runbook. `src/views/LoginPage.vue` is unused; deleting it waits for the owner's approval (AGENTS.md).
- 2026-10-20: owner device report (Android): white viewer buttons and camera file names work; Settings opened at every start, with the album list behind it. Cause: a launch race (`whenLaunched()` resolved before `App.vue` started the launch; pages mount first). Fix test-first: `whenLaunched()` starts the first launch, `App.vue` uses it; the old test "resolves at once when no launch ran" encoded the bug and was replaced. 603 Vitest tests. Lesson: anything pages wait on at start-up must exist before the pages mount.
- 2026-10-20: owner confirmed the cold start opens the album list with the stored login, and approved deleting `src/views/LoginPage.vue` (deleted with `git rm`).

## Drift Gate Report

Run 2026-10-20 by the agent, with the device checks partly done.

**Preconditions:** T-009-01 … 05, 07 `[x]`; T-009-06 partly confirmed (Android). `npx vp check`, `npx vp run typecheck`, `npx vp test` (42 files, 603 tests), `npx vp run build`, `npx cap sync`, `./gradlew assembleDebug` green.

| Requirement | Code | Evidence |
|-------------|------|----------|
| FR-009-01 | `rootBackHandler`, `App.vue` (priority 10) | `backButton.test.ts` (6); device check open |
| FR-009-02 | `PhotoViewer.vue` `.overlay-button` | `PhotoViewer.test.ts`; confirmed on Android |
| FR-009-03 | `session.whenLaunched()` starts the launch; launch logs in unless signed in; `accountStore.reauthenticate` without cooldown, failure reported; rejected password → `/settings` | `session.test.ts`, `account.test.ts`; cold start confirmed on Android |
| FR-009-04 | `session.save()`, `SettingsPage.vue`, `saveOutcomeMessage`, `/login` removed, sign-in links → `/settings` | `session.test.ts` (12 save cases), `accountMessages.test.ts`; Save variants on device open |
| FR-009-05 | `pickForUpload` asks once; `OriginalMedia.requestNameAccess()`, `realNameOf()`; manifest permissions | `picker.test.ts` (5 new); confirmed on Android |

**Not verified yet:** back closing the app from the album list, the Settings Save variants (S-009-09 … 11), a rejected stored password landing on Settings (S-009-08), the iPhone.

**Divergences:** the launch race (S-009-14) was found on the device and fixed beyond the planned scope; `LoginPage.vue` deleted with the owner's approval.

**Lessons:** start-up state that pages wait on must exist before they mount; the owner's first symptom (a sign-in screen at launch) was this race, not the paths the analysis found by reading.
