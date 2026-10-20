# Feature Plan 012 – Background Uploads

_Linked specification:_ [spec.md](spec.md)  
_Linked tasks:_ [tasks.md](tasks.md)  
_Status:_ Complete  
_Last updated:_ 2026-10-20

> Guardrail: Keep this plan traceable back to the governing spec. Reference FR/NFR/Scenario IDs from `spec.md` where relevant, log any new high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), and assume clarifications are resolved only when the spec's normative sections and, where applicable, ADRs under `docs/specs/6-decisions/` have been updated.

## Vision & Success Criteria
Uploads keep going while the user is in other apps, a progress ring shows them on every page, and closing the app loses nothing. Success: S-012-01 … 07 on the Pixel and an iPhone.

## Scope Alignment
- **In scope:** FR-012-01 … 04, NFR-012-01 … 03.
- **Out of scope:** spec Non-Goals; a native iOS background uploader.

## Dependencies & Interfaces
- No new dependency. Native hand edits (ADR-012-01): Android `UploadKeepAlivePlugin`, `UploadService`, manifest service and permissions, registration in `MainActivity`; `OriginalMediaPlugin.pick()` persistable access and `releaseAccess`; iOS `UploadKeepAlivePlugin.swift`, registration in `MainViewController`, project entries. Approved through Q-012-01/02.
- Modules: `uploadQueue` (run tracking), `pendingCaptures` (cleanup kinds), `AddButton` (persist picked files, badge removed), new `UploadRing.vue`, pages' toolbars, `@capacitor/filesystem` (iOS copies), `@capacitor/app`.

## Assumptions & Risks
- **Assumptions:** photo-picker URIs accept `takePersistableUriPermission`; the WebView keeps running while the foreground service holds the process.
- **Risks / Mitigations:** Android killing the service on low memory → pending list resumes on next start; iOS expiry mid-chunk → interrupted file retried on return.

## Increment Map
1. **I1 – Ring** (FR-012-01, 02): failing tests → queue run tracking, `ringState()`, `UploadRing.vue`, toolbars, badge removed.
2. **I2 – Nothing lost** (FR-012-04): failing tests → cleanup kinds in the pending list, `persistPicked()`; Android persistable access and `releaseAccess`; UploadSheet Remove.
3. **I3 – Keep alive** (FR-012-03): failing tests → keep-alive runner; Android plugin and service; iOS plugin; builds.
4. **I4 – Device checks, docs, drift gate.**

## Analysis Gate
Run 2026-10-20 by the agent: spec complete with Q-012-01/02 folded in; ADR-012-01 written; mock-up present; every FR maps to tasks; tests precede the JavaScript code, native parts verified by builds and devices; new Android permissions approved through Q-012-01. Cleared.

## Intent Log
- 2026-10-20: owner asked for background uploads and a progress ring in the title bar. The agent read Capacitor's Android pause handling (`KeepRunning` true, so JavaScript keeps running) and summarised platform limits (Android freezer and foreground services, iOS suspension). Owner chose A for Q-012-01/02.
- 2026-10-20: T-012-01 … 03 done (707 Vitest tests). JavaScript test-first: queue `runIds`, `ringState()`, `UploadRing.vue` on every toolbar (the "+" badge and the sheet's auto-open removed, FR-005-04 amended), pending list with cleanup kinds and `pendingFiles.ts`, keep-alive runner. Native hand edits (ADR-012-01): Android `UploadKeepAlivePlugin`, `UploadService`, manifest service and three permissions, `MainActivity` registration, `pick()` persistable access and `releaseAccess`; iOS `UploadKeepAlivePlugin.swift`, registration, project entries. `./gradlew assembleDebug` and the iOS simulator `xcodebuild` green.
- 2026-10-20: owner reported the feature working well on devices; feature closed.

## Drift Gate Report

Run 2026-10-20 by the agent; device checks reported by the owner the same day.

**Preconditions:** all tasks `[x]` (T-012-01 … 05). `npx vp check`, `npx vp run typecheck`, `npx vp test` (51 files, 707 tests), `npx vp run build`, `npx cap sync`, `./gradlew assembleDebug`, iOS simulator `xcodebuild` green. No new dependency.

| Requirement | Code | Evidence |
|-------------|------|----------|
| FR-012-01 | `uploadQueue.runIds`, `ringState()`, `UploadRing.vue` on every toolbar; badge and sheet auto-open removed | `uploadRing.test.ts` (6), `UploadRing.test.ts` (4), `uploadQueue.test.ts` (2 new); owner on devices |
| FR-012-02 | upload sheet from the ring | `UploadRing.test.ts` |
| FR-012-03 | `keepAliveRunner`; Android `UploadKeepAlivePlugin` + `UploadService` (`dataSync`); iOS `UploadKeepAlivePlugin` (`beginBackgroundTask`) | `keepAlive.test.ts` (5); owner on devices |
| FR-012-04 | pending cleanup kinds, `persistPicked()`, `releasePending()`, Android persistable access, Remove | `pendingFiles.test.ts` (8), `pendingCaptures.test.ts`; owner on devices |
| NFR-012-01 | one TypeScript uploader | code review |
| NFR-012-02 | pure/injected | Vitest |
| NFR-012-03 | no dependency | `package.json` and Gradle unchanged |

**Divergences:** the upload sheet no longer opens by itself (FR-005-04 amended), read from the owner's description of the ring.

**Lessons:** reading the framework's lifecycle code (Capacitor's `KeepRunning`) showed that a small keep-alive was enough on Android, avoiding a second uploader.
