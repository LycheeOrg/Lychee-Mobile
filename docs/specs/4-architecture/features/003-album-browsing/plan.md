# Feature Plan 003 – Album Browsing

_Linked specification:_ [spec.md](spec.md)  
_Linked tasks:_ [tasks.md](tasks.md)  
_Status:_ Complete  
_Last updated:_ 2026-10-19

> Guardrail: Keep this plan traceable back to the governing spec. Reference FR/NFR/Scenario IDs from `spec.md` where relevant, log any new high- or medium-impact questions in the feature's [open-questions.md](open-questions.md), and assume clarifications are resolved only when the spec's normative sections and, where applicable, ADRs under `docs/specs/6-decisions/` have been updated.

## Vision & Success Criteria
The app opens on the user's albums and lets them walk down through sub-albums into scrolling photo grids. Success: on the Pixel 11 Pro and the iOS simulator or an iPhone, `lapaglia.pics` (signed in) and the LAN server show their albums and thumbnails, a large smart album scrolls smoothly, and every failure branch is covered by Vitest.

## Scope Alignment
- **In scope:** FR-003-01 … 09, NFR-003-01 … 05; settings page move; `android.allowMixedContent`.
- **Out of scope:** spec Non-Goals (viewer, upload, search, v3, virtualisation).

## Dependencies & Interfaces
- No new dependency (NFR-003-04). Ionic components: `IonRefresher`, `IonInfiniteScroll`, `IonImg` not used (plain `<img>`, ADR-003-02).
- Lychee 7.1.0+ v2 API (API-003-01 … 06); fixtures written from Lychee 7.11.1 resource classes.
- ADR-001-01, ADR-001-02, ADR-002-01, ADR-003-01, ADR-003-02; Feature 001 `serverStore`, Feature 002 `accountStore`, `session`, `LoginPage`.

## Assumptions & Risks
- **Assumptions:** default Lychee image URLs need no cookie (verified in source, ADR-003-02).
- **Risks / Mitigations:**
  - _Fixtures not recorded from a live server_ (guests see no albums on either test server) → fixtures follow the PHP resource classes field by field; parsers ignore unknown fields and default optional ones; device checks against real servers confirm.
  - _Grid performance without virtualisation_ → NFR-003-02 check on the Pixel with the largest smart album; reopen Q-003-03 if it fails.
  - _iOS http images from a LAN server_ → `NSAllowsLocalNetworking` covers WKWebView loads; checked on the device (S-003-11).

## Implementation Drift Gate
After T-003-16: map FR/NFR/S IDs to tests, rerun the quality gate, record findings below.

## Increment Map
1. **I1 – Transport** (FR-003-07): failing `lycheeHttp` tests for the 419 retry and query strings → implementation.
2. **I2 – Fixtures and parsers** (NFR-003-03, DO-003-01 … 07): fixtures; failing `galleryParsers.test.ts` → `src/services/galleryParsers.ts`.
3. **I3 – Gallery service** (FR-003-01 … 05, 09, NFR-003-01): failing `gallery.test.ts` (error mapping, paging calls, unlocks, version rule) → `src/services/gallery.ts`, `src/utils/version.ts`.
4. **I4 – Models** (FR-003-01, 02, 05, 06, 09, NFR-003-05): failing `albumList.test.ts`, `albumPage.test.ts` → `src/stores/albumList.ts`, `src/stores/albumPage.ts`.
5. **I5 – Navigation** (FR-003-08): `HomePage.vue` → `SettingsPage.vue` at `/settings`, `/albums` start route, Connect and Login destinations; failing `session.test.ts` additions first.
6. **I6 – UI** (FR-003-01 … 05, 09, UI-003-01 … 06): messages (test first), album tile, photo grid, password prompt, `AlbumsPage.vue`, `AlbumPage.vue`, `android.allowMixedContent`.
7. **I7 – Device checks** (S-003-01 … 18, NFR-003-02).
8. **I8 – Docs and drift gate.**

_Commands for every increment:_ `npx vp test <file>`, `npx vp check`, `npx vp run typecheck`; I5–I7 also `npx vp run build`, `npx cap sync`.

## Scenario Tracking

| Scenario ID | Increment / Task reference | Notes |
|-------------|---------------------------|-------|
| S-003-01 … 04 | I3, I4 / T-003-06 … T-003-09; I7 | |
| S-003-05 … 08 | I3, I4 / T-003-06 … T-003-09 | 401 handoff to the account store |
| S-003-09 | I1 / T-003-01, T-003-02 | |
| S-003-10, 11 | I6 / T-003-13; I7 | image errors are UI-only |
| S-003-12 | I3 / T-003-06 | version rule |
| S-003-13, 14 | I3, I4 / T-003-06 … T-003-09; I7 | |
| S-003-15, 16 | I4 / T-003-08, T-003-09; I7 | |
| S-003-17, 18 | I5 / T-003-10, T-003-11; I7 | |

## Analysis Gate

Run 2026-10-19 by the agent.
1. Specification completeness — ✅ FR/NFR complete; Q-003-01 … 06 folded in; ASCII mock-ups present.
2. Open questions review — ✅ none open; ADR-003-01 and ADR-003-02 written.
3. Plan alignment — ✅ plan links spec and tasks; success criteria match.
4. Tasks coverage — ✅ every FR has tasks; tests precede code; failure branches listed (S-003-05 … 10, 12 … 16).
5. Working-agreement compliance — ✅ no new dependency; injected I/O; ADR-001-01 … ADR-002-01 reviewed.
6. Tooling readiness — ✅ commands above; Pixel 11 Pro; iOS through Xcode.

**Outcome:** cleared for implementation.

## Exit Criteria
- All tasks `[x]`; quality gate green; device checks recorded including NFR-003-02.
- Knowledge map and roadmap updated; drift gate recorded.

## Follow-ups / Backlog
- Feature 004: the viewer opens from a photo tile; `Album::photos` already returns medium/original URLs.

## Intent Log
- 2026-10-19: owner asked to start Feature 003. An Explore agent mapped Lychee 7.11.1's browsing API (v2 vs v3, pagination, image URL modes, unlock flows, errors, versions); the agent probed `lapaglia.pics` and the LAN server as a guest (empty galleries, v3 off) and traced the NSFW flags in the web UI (`are_nsfw_visible` hides tiles client-side). Owner chose Option A for Q-003-01 … 06. Fixtures were written from Lychee's resource classes (neither test server shows albums to a guest); the 404 and 401 bodies were recorded from `lapaglia.pics` and `Gallery::Init` recorded with the site title and owner replaced. Implemented test-first: 419 retry and query strings in `lycheeHttp`, parsers, gallery service, version rule, list and page models, shared sensitive display (extracted while building the pages, so sub-albums follow the same rules), messages, components, pages, `HomePage.vue` moved to `SettingsPage.vue` with `git mv` (Q-003-06), `android.allowMixedContent`. 245 Vitest tests. The owner ran the device checklist on the Pixel 11 Pro and an iPhone and reported everything passing.

## Drift Gate Report

Run 2026-10-19 by the agent; owner confirmed the device checks the same day.

**Preconditions:** 16/16 tasks `[x]`; `npx vp check`, `npx vp run typecheck`, `npx vp test` (17 files, 245 tests), `npx vp run build` green; `package.json` unchanged; Android build installed on the Pixel 11 Pro; iOS run from Xcode by the owner.

| Requirement | Code | Evidence |
|-------------|------|----------|
| FR-003-01 | `albumList.ts`, `AlbumsPage.vue`, `galleryParsers.ts` | `albumList.test.ts`, `galleryParsers.test.ts`; devices |
| FR-003-02 | `albumPage.ts`, `AlbumPage.vue` | `albumPage.test.ts` (paging order, later-page retry, refresh, stale pages); devices incl. Back and refresh |
| FR-003-03 | `ThumbImage.vue`, parsers | parser tests for thumbs, 2x and missing thumbs; LAN http thumbnails on both devices |
| FR-003-04 | `meetsMinimumVersion()`, `albumList.load()` | `version.test.ts`, `albumList.test.ts` |
| FR-003-05 | `gallery.unlockAlbum/unlockGallery`, models, `PasswordPrompt.vue` | `gallery.test.ts`, model tests |
| FR-003-06 | `galleryContext.ts`, models | model tests; sign-out reload on the Pixel |
| FR-003-07 | `lycheeHttp.ts` 419 retry, `galleryFor()` | `lycheeHttp.test.ts`, `gallery.test.ts` |
| FR-003-08 | router, `session.connect()/whenLaunched()`, `SettingsPage.vue`, `LoginPage.vue` | `session.test.ts`; devices |
| FR-003-09 | `sensitive.ts`, `albumPage.ts` warning memory | `albumList.test.ts`, `albumPage.test.ts` |
| NFR-003-01 | `GALLERY_TIMEOUT_MS` | timeout test in `gallery.test.ts` |
| NFR-003-02 | plain grid, lazy images | fast scroll in a large smart album on the Pixel |
| NFR-003-03 | `galleryParsers.ts` | malformed-payload tests |
| NFR-003-04 | — | `package.json` unchanged |
| NFR-003-05 | `PasswordPrompt.vue` clears the field; models never store it | state checks in both model tests |

**Not exercised on a device** (unit-tested only): S-003-12 (old server), S-003-13 and S-003-14 (locked album and gallery), S-003-15 and S-003-16 (sensitive albums), S-003-09 (419). The owner reported everything passing, but the checklist marked locked and sensitive albums optional and whether they were available wasn't stated.

**Divergences:** the sensitive-album settings moved from the list model to a shared `src/stores/sensitive.ts` so sub-albums follow the same rules (FR-003-09 unchanged); `src/stores/galleryContext.ts` was added for the app wiring. No behavioural drift.

**Lessons:**
- Neither test server exposes albums to a guest, so contract fixtures came from the PHP resource classes; a public test album on the LAN server would let later features record real responses.
- Lychee's v3 API looked like the obvious target but is off by default; reading the feature flags before planning avoided building on it.
