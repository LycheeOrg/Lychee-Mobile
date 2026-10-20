# Feature Plan 010 – Album Creation

_Linked specification:_ [spec.md](spec.md)  
_Linked tasks:_ [tasks.md](tasks.md)  
_Status:_ Complete  
_Last updated:_ 2026-10-20

> Guardrail: Keep this plan traceable back to the governing spec. Reference FR/NFR/Scenario IDs from `spec.md` where relevant, log any new high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), and assume clarifications are resolved only when the spec's normative sections and, where applicable, ADRs under `docs/specs/6-decisions/` have been updated.

## Vision & Success Criteria
A "+" in the toolbar adds content: upload photos or create an album, at the top level or inside an album, wherever the server allows. Success: on the Pixel and an iPhone, S-010-01 … 10 behave as specified.

## Scope Alignment
- **In scope:** FR-010-01 … 03, NFR-010-01, 02.
- **Out of scope:** spec Non-Goals.

## Dependencies & Interfaces
- No new dependency, no native change. Lychee `POST Album`, `Albums.rights.can_edit`, `Album::head.resource.rights.can_edit`.
- Modules: `galleryParsers`, `gallery` (`createAlbum`), `uploadQueue` (`uploadTargetFor`), `UploadButton` logic moved into `AddButton`, `AlbumsPage`, `AlbumPage`, `galleryContext` (401 recovery).

## Assumptions & Risks
- An `IonPopover` with `trigger` works inside the toolbar on both platforms; Ionic alert inputs work for the title.
- 409 retries are immediate, as the web client's are; the server serialises album creation.

## Increment Map
1. **I1 – Rights** (FR-010-02, DO-010-02): failing parser tests → `canEdit` on root and head; failing `addMenuFor`/`addMenuForRoot` tests → implementation.
2. **I2 – Create** (FR-010-03, API-010-01, DO-010-03): failing `Gallery.createAlbum` tests (body, ID, 409 retries, 401, 403, 422, network, timeout), `createAlbumIn` (401 recovery), `titleProblem`, messages → implementation.
3. **I3 – UI** (FR-010-01, 03; UI-010-01 … 03): failing `AddButton` component tests → `AddButton.vue` (popover, upload, create alert), wiring in both pages, reload of the origin page.
4. **I4 – Device checks, docs, drift gate.**

_Commands:_ `npx vp test <file>`, `npx vp check`, `npx vp run typecheck`; I3 also `npx vp run build`, `npx cap sync`.

## Analysis Gate
Run 2026-10-20 by the agent: spec complete with Q-010-01 … 03 folded in (no ADR needed: no dependency, permission or cross-cutting change); mock-up present; every FR maps to tasks; tests precede code; failure branches listed (S-010-04 … 09). Cleared.

## Intent Log
- 2026-10-20: owner asked for a "+" with Upload photos and Create album, as in the web UI. The agent read Lychee v7.11.1 (and 7.1.0) `AddAlbumRequest` (`CAN_EDIT` on the parent, title 1–100), `AlbumController::createAlbum` (returns the ID), `AlbumPolicy::canEdit`, `RootAlbumRightsResource`, the web `AlbumHeader`/`AlbumsHeader` add menus and `AlbumCreateDialog` (opens the new album; 409 retried up to 5 times). Owner chose A for Q-010-01 … 03.
- 2026-10-20: T-010-01 … 03 done test-first (647 Vitest tests; Android build green). `canEdit` on root and head; `addMenu.ts` holds the rules, `createAlbumIn` and the title loop `promptForAlbum` (dialog injected); `Gallery.createAlbum` retries 409 up to 5 times; `AddButton.vue` replaces `UploadButton.vue` in both pages; a page that created an album reloads when shown again. `src/components/UploadButton.vue` is unused (deleted later with the owner's approval).
- 2026-10-20: owner device report: the album was created but the app said "Couldn't create the album." Cause: `createAlbum` returns the ID as a bare string, which Laravel sends as plain text; the app only accepted a JSON string, and the tests' fake server sent JSON. Confirmed in Lychee's `AlbumCreateTest` (`getOriginalContent()`). Fix test-first: read the body as text, accept plain text or JSON with an ID-shaped value. Lesson: fixtures must come from what the server sends, not from the PHP return type.
- 2026-10-20: owner approved deleting `src/components/UploadButton.vue` (deleted with `git rm`) and reported all device checks passed; feature closed.

## Drift Gate Report

Run 2026-10-20 by the agent; device checks completed by the owner the same day.

**Preconditions:** all tasks `[x]` (T-010-01 … 05). `npx vp check`, `npx vp run typecheck`, `npx vp test` (45 files, 649 tests), `npx vp run build`, `npx cap sync`, `./gradlew assembleDebug` green. No dependency or native change.

| Requirement | Code | Evidence |
|-------------|------|----------|
| FR-010-01 | `AddButton.vue` (popover, upload badge), both pages | `AddButton.test.ts` (2); owner on devices |
| FR-010-02 | `canEdit` on root and head, `addMenuForRoot`, `addMenuFor`, `hasItems` | `galleryParsers.test.ts`, `addMenu.test.ts`, `albumList.test.ts`, `albumPage.test.ts` |
| FR-010-03 | `Gallery.createAlbum` (plain-text or JSON ID, 409 retries), `createAlbumIn`, `promptForAlbum`, `albumMessages`, origin page reload | `gallery.test.ts` (13), `addMenu.test.ts` (title, 401, dialog loop), `albumMessages.test.ts`; owner on devices |
| NFR-010-01 | pure helpers, injected dialog | Vitest |
| NFR-010-02 | no dependency | `package.json` unchanged |

**Divergences:** the create response is plain text, not the JSON string the spec first said (fixed and spec corrected); the title dialog reopens on problems instead of a disabled Create button; `UploadButton.vue` deleted.

**Lessons:** read how the server's own tests consume a response before writing fixtures; a test double that agrees with a wrong assumption hides the bug.
