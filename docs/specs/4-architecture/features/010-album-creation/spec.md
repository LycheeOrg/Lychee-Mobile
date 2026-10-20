# Feature 010 – Album Creation

| Field | Value |
|-------|-------|
| Status | Complete |
| Last updated | 2026-10-20 |
| Owners | mlapaglia |
| Linked plan | [plan.md](plan.md) |
| Linked tasks | [tasks.md](tasks.md) |
| Roadmap entry | #010 |

> Guardrail: This specification is the single normative source of truth for the feature. Track high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), encode resolved answers directly in the Requirements/NFR/Behaviour/UI/Telemetry sections below (no per-feature `## Clarifications` sections), and use ADRs under `docs/specs/6-decisions/` for architecturally significant clarifications (referencing their IDs from the relevant spec sections).

> **Amended by Feature 011 (2026-10-20):** the "+" menu also offers Take photo, wherever Upload photos is (FR-011-01).

## Overview
The toolbar's Upload button (Feature 005) becomes a "+" button, as in Lychee's web UI, opening a small menu with **Upload photos** and **Create album**. Create album asks for a title and calls `POST /api/v2/Album` with the current album as parent (or none on the album list), then opens the new album (Q-010-02). Each item follows the server's rights, so the app never offers what the server would refuse.

## Goals
- One "+" entry point for adding content, like the web UI.
- Create albums at the top level and inside albums the user may edit.

## Non-Goals
- Tag albums, person albums, imports (link, Dropbox, server), taking a photo in the app.
- Renaming, moving or deleting albums.

## Functional Requirements

| ID | Requirement | Success path | Validation path | Failure path | Telemetry & traces | Source |
|----|-------------|--------------|-----------------|--------------|--------------------|--------|
| FR-010-01 | The "+" menu. | The album list and album pages show a "+" button (`add`) in the toolbar in place of the Upload button; it keeps the upload badge (files left while the sheet is closed, FR-005-04). Tapping it opens a menu under the button (Q-010-01) with **Upload photos** (cloud icon) and **Create album** (folder icon). | Each item shows only where allowed (FR-010-02); the "+" shows only when at least one does. | — | — | Owner 2026-10-20; Lychee `AlbumHeader.vue`, `AlbumsHeader.vue` |
| FR-010-02 | Rights. | **Upload photos** as today: `uploadTargetFor()` (album `can_upload`, Unsorted from the album list, FR-005-02). **Create album**: on the album list when `Albums` `rights.can_edit` is true (top level); on a regular album's page when `Album::head` `resource.rights.can_edit` is true (inside it) (Q-010-03). | Smart, tag and person albums never offer Create album (the server only takes real albums as parents). | The server still checks (`AlbumPolicy::CAN_EDIT` on the parent); a 403 is reported (FR-010-03). | — | Lychee `AddAlbumRequest` |
| FR-010-03 | Create. | Create album opens an alert with a **Title** field and Cancel / **Create**; Create sends `POST /api/v2/Album` `{ title, parent_id }` (`parent_id` null on the album list); the response is the new album's ID. Then the app opens the new album (Q-010-02), and the page it came from reloads its albums when shown again. | Title trimmed; empty → "Enter a title." and the alert stays open; longer than 100 characters → "Album titles can be at most 100 characters." and the alert stays open. On a failure the alert opens again with the typed title and the message. | 409 (the server's album lock timed out, nothing created) → retried up to 5 times, then "The server is busy. Try again."; 401 → silent sign-in once (FR-009-03), then retry; still 401 → sign-in handoff; 403 → "You can't create albums here."; 422 → the server's message; network error or no answer in 10 s → "Couldn't reach the server."; other → "Couldn't create the album." | — | Lychee `AlbumCreateDialog.vue`, `TitleRule` |

## Non-Functional Requirements

| ID | Requirement | Driver | Measurement | Dependencies | Source |
|----|-------------|--------|-------------|--------------|--------|
| NFR-010-01 | Rights gating, title validation, request and result mapping are pure or injected and tested in jsdom. | NFR-003-03. | Vitest. | — | — |
| NFR-010-02 | No new dependency or native change. | AGENTS.md. | `package.json` diff. | — | — |

## UI / Interaction Mock-ups

```
 Album list with "+" (menu open)          Create album                           New album opened
┌──────────────────────────────┐        ┌──────────────────────────────┐       ┌──────────────────────────────┐
│ Lychee                 + ⚙   │        │                              │       │ ‹        Summer 2026         │
│                ┌───────────────┐      │  New album                   │       │                              │
│                │ ☁ Upload photos│     │  ┌────────────────────────┐  │       │   This album is empty.       │
│                │ 📁 Create album │     │  │ Title                  │  │       │                              │
│                └───────────────┘      │  └────────────────────────┘  │       │                              │
│ Albums                       │        │   [ Cancel ]   [ Create ]    │       │                              │
│ ┌────┐┌────┐┌────┐           │        └──────────────────────────────┘       └──────────────────────────────┘
└──────────────────────────────┘
 "+" carries the upload badge (files left) while the upload sheet is closed.
 Only allowed items show; no "+" when neither is allowed.
```

## Branch & Scenario Matrix

| Scenario ID | Description / Expected outcome |
|-------------|--------------------------------|
| S-010-01 | Album list, user may upload and edit → "+" with both items. |
| S-010-02 | Create album "Summer 2026" on the album list → created at the top level, opened. |
| S-010-03 | Inside an album the user may edit → Create album makes a sub-album, opened; back shows it in the parent. |
| S-010-04 | Shared album the user may upload to but not edit → "+" with Upload photos only. |
| S-010-05 | Smart, tag or person album → no Create album. |
| S-010-06 | Guest, or an album with neither right → no "+". |
| S-010-07 | Empty title or 101 characters → message, alert stays open. |
| S-010-08 | Server answers 409 twice, then the ID → created once, opened. |
| S-010-09 | 403, 422, network error → the alert opens again with the title and the message; nothing opened. |
| S-010-10 | Upload photos from the menu → same flow and badge as before (Feature 005). |

## Test Strategy
- **Units (Vitest):** `addMenuFor()` (items per album kind and rights); title validation; `Gallery.createAlbum()` (body, ID, 409 retries, 401, 403, 422, network, timeout); root `can_edit` and head `can_edit` parsing.
- **Components:** "+" menu items shown per rights; badge.
- **Lychee API contract:** `POST Album` response (plain-text ID, as Lychee's `AlbumCreateTest` reads it with `getOriginalContent()`), error bodies 403/409/422.
- **Native:** Pixel and iPhone: S-010-01 … 10.

## Interface & Contract Catalogue

### Domain Objects
| ID | Description | Modules |
|----|-------------|---------|
| DO-010-01 | `AddMenu`: `{ upload: UploadTarget \| null, createIn: { parentId: string \| null } \| null }`. | `src/stores/addMenu.ts` (proposed) |
| DO-010-02 | `RootAlbums.canEdit`, `AlbumHead.canEdit`. | `galleryParsers.ts` |
| DO-010-03 | `CreateAlbumResult`: `{ kind: "ok", id }`, `busy` (409 after retries), `unauthenticated`, `forbidden`, `invalid` (with message), `unreachable`, `failed`. | `gallery.ts` |

### API Routes / Services
| ID | Transport | Description | Notes |
|----|-----------|-------------|-------|
| API-010-01 | `POST /api/v2/Album` (JSON) | `{ title: 1–100 chars, parent_id: album ID or null }` → the new album's ID as plain text (the controller returns a bare string; a JSON string is accepted too). | `AlbumPolicy::CAN_EDIT` on the parent (root: `may_upload`); unchanged since 7.1.0. |
| API-010-02 | `Albums` `rights.can_edit`, `Album::head` `resource.rights.can_edit` | Gating (FR-010-02). | Already in the responses. |

### UI States
| ID | State | Trigger / Expected outcome |
|----|-------|---------------------------|
| UI-010-01 | "+" button with badge | FR-010-01. |
| UI-010-02 | "+" menu | FR-010-01. |
| UI-010-03 | Create album alert | FR-010-03. |

## Telemetry & Observability
None.

## Documentation Deliverables
- Roadmap row 010; knowledge map: add menu, `createAlbum`, rights; note in Feature 005's spec that Upload moved into the "+" menu.
- `src/components/UploadButton.vue` replaced by `AddButton.vue` and deleted with the owner's approval.
