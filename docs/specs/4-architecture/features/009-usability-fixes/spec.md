# Feature 009 – Usability Fixes

| Field | Value |
|-------|-------|
| Status | Complete |
| Last updated | 2026-10-20 |
| Owners | mlapaglia |
| Linked plan | [plan.md](plan.md) |
| Linked tasks | [tasks.md](tasks.md) |
| Roadmap entry | #009 |

> Guardrail: This specification is the single normative source of truth for the feature. Track high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), encode resolved answers directly in the Requirements/NFR/Behaviour/UI/Telemetry sections below (no per-feature `## Clarifications` sections), and use ADRs under `docs/specs/6-decisions/` for architecturally significant clarifications (referencing their IDs from the relevant spec sections).

## Overview
Five fixes the owner found using the app (2026-10-20), each amending an earlier feature: Android back on the album list leaves the app (Feature 003); the viewer's buttons are readable on black (Feature 004/008); stored credentials are used before any sign-in screen (Feature 006); the server address, username and password share the Settings page (Features 001, 002); uploads keep the photo's original file name where the platform allows (Feature 005).

## Goals
- Each fix behaves as the owner described; the amended features' behaviour stays otherwise unchanged.

## Non-Goals
- Other navigation, theming or account changes.

## Functional Requirements

| ID | Requirement | Success path | Validation path | Failure path | Telemetry & traces | Source |
|----|-------------|--------------|-----------------|--------------|--------------------|--------|
| FR-009-01 | Back on the album list closes the app (Android). | With the album list (`/albums`) showing, Android back closes the app (`App.exitApp()`), whatever pages came before it (Settings, Sign in). Elsewhere back keeps working as before. | Open overlays (sheets, alerts, the viewer) still take back first (Ionic overlay priority 100 > 10). | — | — | Owner 2026-10-20; amends FR-003-08 |
| FR-009-02 | Readable viewer buttons. | Close and Info in the viewer overlay are white icons (`--color: #fff`) with a soft shadow, on both themes. Title and counter stay white. | — | — | — | Owner 2026-10-20; amends Feature 004 overlay, FR-008-01. Cause: `color="light"` is dark grey in Ionic's dark palette. |
| FR-009-03 | Stored credentials before any sign-in screen. | Launch: the first page that waits for the launch (`session.whenLaunched()`) starts it if `App.vue` hasn't yet, so no page sees the server unloaded (it used to open Settings on every start, S-009-14). After reading the account, when it isn't signed in (signed out, or the read failed), the app signs in with the stored credentials. Browsing, uploads, downloads and the info panel: a 401 gets a silent sign-in and the call once more, every time; the 60 s cooldown of NFR-006-02 is removed (single flight stays; each load or file retries at most once) (Q-009-01). Settings → Save uses them too (FR-009-04). | No stored credentials → nothing is tried; the album list's sign-in message and its **Sign in** button open Settings. | The server rejects the stored password → credentials forgotten (FR-006-03), Settings opens with "Your password changed or was reset. Sign in again." and the username filled in. | — | Owner 2026-10-20; Q-009-01; amends FR-006-02, FR-006-03, NFR-006-02 |
| FR-009-04 | Server and account on one Settings page. | Settings shows Server address, Username, Password and one **Save** button (Q-009-02). Username starts as the signed-in user, else the rejected or stored username; the password field always starts empty, with the placeholder "Leave blank to keep the existing password" when credentials are stored for the saved server. Save: checks the server (FR-001-02; a different server resets the account and forgets credentials, FR-006-04); then with a username and a typed password signs in (FR-002-01); with a username and a blank password uses the stored credentials when they are for that username (already signed in as them → nothing to do; else a silent sign-in); with both fields empty signs out if signed in and continues as a guest. Success opens the album list as root. "Signed in as … / Sign out" and the OAuth/passkey note (FR-002-07) stay on Settings. The Sign in page and `/login` are removed. | Username with a blank password and no matching stored credentials → "Enter the password". | Server check failure → its message (FR-001-02), nothing else changes; sign-in failure → its message (FR-002-01) under the fields, still on Settings. | The password is cleared from the field after every Save (NFR-002-01). | Owner 2026-10-20; Q-009-02; amends FR-001-02, FR-002-01, FR-002-05, FR-002-06 |
| FR-009-05 | Original file names on upload. | Android: before the first pick the app asks once for photo and video read access (`READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO` on Android 13+, `READ_EXTERNAL_STORAGE` on 12 and older), remembered in Preferences (`media_names_asked`). With access, `OriginalMedia.pick()` replaces each picker name (`<id>.<ext>`) by MediaStore's `DISPLAY_NAME` for the same ID, and the upload sends it as `file_name` (Q-009-03, ADR-009-01). iOS: unchanged, the picker's suggested name (to confirm on the iPhone). | Refused, limited to selected photos, or an ID MediaStore doesn't know (cloud-only items) → the picker's name; uploads are never blocked. | — | — | Owner 2026-10-20; Q-009-03; amends FR-005-01, FR-005-03 |

## Non-Functional Requirements

| ID | Requirement | Driver | Measurement | Dependencies | Source |
|----|-------------|--------|-------------|--------------|--------|
| NFR-009-01 | Each fix has tests that fail without it. | Test-first. | Vitest. | — | AGENTS.md |

## UI / Interaction Mock-ups

```
 Viewer overlay (FR-009-02)               Settings (FR-009-04)
┌──────────────────────────────┐        ┌──────────────────────────────┐
│ ✕   1332.jpg     3 / 120  ⓘ  │        │ ‹          Settings          │
│ (white icons with a shadow)  │        │ Server address               │
│                              │        │ [ photos.example.com       ] │
│          (photo)             │        │ Username                     │
│                              │        │ [ mallory                  ] │
└──────────────────────────────┘        │ Password                     │
                                        │ [ Leave blank to keep the  ] │
                                        │ [ existing password        ] │
                                        │ [           Save           ] │
                                        │ Signed in as mallory  [Sign out]
                                        └──────────────────────────────┘
```

## Branch & Scenario Matrix

| Scenario ID | Description / Expected outcome |
|-------------|--------------------------------|
| S-009-01 | First launch: Settings → Connect → album list; back on the album list closes the app. |
| S-009-02 | Album list → album → back → album list → back closes the app. |
| S-009-03 | Album list with an alert open → back closes the alert, not the app. |
| S-009-04 | Viewer in dark and light theme → Close and Info clearly visible on black. |
| S-009-05 | Cold start with stored credentials and an ended session → album list, no sign-in screen. |
| S-009-06 | Cold start while the account check fails once → silent sign-in, album list. |
| S-009-07 | Two 401s within a minute while browsing → each recovered silently. |
| S-009-08 | Stored password changed on the server → Settings with the message and the username. |
| S-009-09 | Settings: change only the server address with a blank password → new server, signed in again only if the password is typed (FR-006-04). |
| S-009-10 | Settings: same server, blank password → keeps the account; typed password → signs in again. |
| S-009-11 | Settings: empty username and password → signed out, album list as a guest. |
| S-009-12 | Android upload with photo access granted → Lychee title is the camera's name (e.g. `PXL_20261020_121813123`). |
| S-009-13 | Android upload with access refused → the picker's name, upload works. |
| S-009-14 | Cold start → the album list, never Settings first. |

## Test Strategy
- **Units (Vitest):** back-button decision per route; account store without cooldown; session launch and `save()` outcomes (all FR-009-04 branches); picker asking for name access once and continuing when refused.
- **Native:** Pixel back button; viewer overlay on both platforms.

## Interface & Contract Catalogue

### Native Capabilities
| ID | Plugin / permission | Behaviour |
|----|---------------------|-----------|
| NC-009-01 | `@capacitor/app` `exitApp()` (installed) | FR-009-01. |
| NC-009-02 | Android `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` (13+), `READ_EXTERNAL_STORAGE` with `maxSdkVersion="32"`; `OriginalMedia.requestNameAccess()` | FR-009-05, ADR-009-01. |

## Telemetry & Observability
None.

## Documentation Deliverables
- Roadmap row 009; knowledge map entries for the changed modules; notes in the amended features' specs (002, 005, 006) pointing here; ADR-009-01.

## Appendix

### Why back didn't close the app
`@ionic/vue-router` answers every `ionBackButton` with `history.go(-1)` at priority 0. Because Ionic listens to Capacitor's `backButton` event, Capacitor's own "finish the activity at the root" never runs. After Settings → Connect or Sign in, those pages are still in the history, so back from the album list returns to them; with no history it does nothing.

### Why Settings opened at every start (FR-009-03)
`session.whenLaunched()` resolved at once while no launch had run, and `App.vue` started the launch in its `onMounted`, which Vue runs after the pages inside it mounted. The album list's `onIonViewWillEnter` could therefore ask first, find no saved server (not loaded yet) and replace itself with Settings; going back re-entered the album list after the launch had finished. Present since Feature 003; likely the "login screen at launch" the owner first reported.

### Where the "1332.jpg" name comes from (FR-009-05)
Uploads send `file_name` = the picked file's name. On Android it is `OpenableColumns.DISPLAY_NAME` of the photo picker's URI, which the picker reports as the media ID and extension, not the camera's file name (to be confirmed on the Pixel, S-009-12). The real name is in `MediaStore` (`DISPLAY_NAME` of the same ID), readable only with `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` (Android 13+) or `READ_EXTERNAL_STORAGE` (≤ 12).
