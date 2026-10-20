# Feature 012 – Background Uploads

| Field | Value |
|-------|-------|
| Status | Complete |
| Last updated | 2026-10-20 |
| Owners | mlapaglia |
| Linked plan | [plan.md](plan.md) |
| Linked tasks | [tasks.md](tasks.md) |
| Roadmap entry | #012 |

> Guardrail: This specification is the single normative source of truth for the feature. Track high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), encode resolved answers directly in the Requirements/NFR/Behaviour/UI/Telemetry sections below (no per-feature `## Clarifications` sections), and use ADRs under `docs/specs/6-decisions/` for architecturally significant clarifications (referencing their IDs from the relevant spec sections).

## Overview
Uploads keep going when the user switches to another app, and the toolbar shows a progress ring while anything is uploading; tapping it opens the upload sheet (Feature 005) with every file's progress. Today the upload queue runs in the app's JavaScript and stops when the operating system suspends the app (Q-005-03 Option A). The queue keeps running in the app's JavaScript; a small native "keep alive" plugin holds the app up while it runs: an Android foreground service with a progress notification, iOS background time (≈30 s) after which the queue pauses (Q-012-01, ADR-012-01). Every queued file stays pending until Lychee accepted it, so closing the app loses nothing (Q-012-02).

## Goals
- Uploads continue while the user is in another app.
- A visible progress ring in the toolbar of every page while uploads run; tapping it shows the upload sheet.
- Uploads that couldn't finish aren't lost.

## Non-Goals
- Automatic backup of new camera photos (a later feature).
- Wi-Fi-only or battery rules for uploads.
- Changing Lychee's upload protocol (FR-005-03 stays as is).

## Functional Requirements

| ID | Requirement | Success path | Validation path | Failure path | Telemetry & traces | Source |
|----|-------------|--------------|-----------------|--------------|--------------------|--------|
| FR-012-01 | Progress ring. | While the queue has waiting or uploading files, every page's toolbar (album list, album, settings) shows a circular progress indicator for the current run (bytes sent of the files added since the queue was last idle / their total bytes) next to the "+"; it replaces the badge on the "+" (FR-005-04). Tapping it opens the upload sheet. When the run ends it shows ✓ for 3 s, or a warning mark while failed files remain, which also opens the sheet. Adding files no longer opens the upload sheet by itself; the ring is the way in (amends FR-005-04). | Nothing queued and nothing failed → no ring. | — | — | Owner 2026-10-20 |
| FR-012-02 | Upload sheet. | As Feature 005 (each file's name, progress, state, Retry, Delete photo, Clear finished), reachable from the ring on any page. | — | — | — | FR-005-04, FR-011-06 |
| FR-012-03 | Background. | A keep-alive starts when a run starts and stops when it ends (Q-012-01). Android: while files are queued, a foreground service (type `dataSync`) keeps the app running, with a notification "Uploading 3 of 10" and a progress bar, updated as files finish; tapping it opens the app; it ends when the run ends. iOS: when the app goes to the background mid-upload, it asks for background time (`beginBackgroundTask`) to finish what it can (about 30 s); after that the queue pauses; the file that was cut off fails as "Upload interrupted" and is retried automatically when the app returns (pending list, FR-012-04). | Android 13+: the notification permission is asked when the first upload starts; refusing hides the notification but uploads still run. | Android stops a `dataSync` service after 6 h in 24 h (Android 15) → the queue pauses until the app is opened. | — | Owner 2026-10-20 |
| FR-012-04 | Closed app. | Every queued file is recorded as pending, as Feature 011 does for taken photos (Q-012-02): Android keeps read access to picked items (`takePersistableUriPermission` in `OriginalMedia.pick()`, released after upload), iOS moves the picker's temporary copy into `Library/pending/`. When the app starts or returns, unfinished files rejoin the queue; once Lychee accepted a file, its pending entry goes, with its cleanup: a taken photo's or iOS copy's file is deleted, an Android grant released. | — | A picked item that was deleted from the phone meanwhile fails as "Couldn't read this file"; its row offers **Remove**, which drops the pending entry (taken photos keep **Delete photo**, FR-011-06). | — | Q-011-04 |

## Non-Functional Requirements

| ID | Requirement | Driver | Measurement | Dependencies | Source |
|----|-------------|--------|-------------|--------------|--------|
| NFR-012-01 | Upload behaviour (chunks, results, GPS check) is the one of Feature 005; no second implementation (Q-012-01). | One tested pipeline. | Code review. | — | — |
| NFR-012-02 | Queue persistence and the ring's progress are pure or injected and tested in jsdom. | NFR-003-03. | Vitest. | — | — |
| NFR-012-03 | No new dependency (Q-012-01). | AGENTS.md. | `package.json`/Gradle diff. | — | — |

## UI / Interaction Mock-ups

```
 Uploading (album list)               Tap the ring → upload sheet          Android notification
┌──────────────────────────────┐    ┌──────────────────────────────┐    ┌──────────────────────────────┐
│ Lychee            ◔  +  ⚙    │    │ Uploads                   ✕  │    │ ⬆ Lychee                     │
│                              │    │ IMG_1042.HEIC                │    │ Uploading 3 of 10            │
│ Albums                       │    │ ███████████░░░░░  64%        │    │ ███████░░░░░░░░░             │
│ ┌────┐┌────┐┌────┐           │    │ VID_0007.MOV     Waiting     │    └──────────────────────────────┘
│ │    ││    ││    │           │    │ IMG_1040.HEIC   ✓ Uploaded   │
│ └────┘└────┘└────┘           │    │ [      Clear finished      ] │
└──────────────────────────────┘    └──────────────────────────────┘
 ◔ progress of the whole queue; ✓ for 3 s when done; ⚠ while failed files remain.
```

## Branch & Scenario Matrix

| Scenario ID | Description / Expected outcome |
|-------------|--------------------------------|
| S-012-01 | Pick 10 photos → ring appears and fills; tap → sheet with each file's progress. |
| S-012-02 | Android: switch to another app for several minutes → uploads finish; notification shows progress, then disappears. |
| S-012-03 | iOS: switch away mid-upload → the current file finishes if it can within ~30 s; on return the queue continues. |
| S-012-04 | Close the app (swipe away) mid-upload → reopen → unfinished files continue. |
| S-012-05 | A file fails → ring shows ⚠ until it's retried or cleared. |
| S-012-06 | Android 13+: notification permission refused → uploads still run in the background. |
| S-012-07 | Upload from the album page, go to the album list → ring still shows. |

## Test Strategy
- **Units (Vitest):** queue run tracking; ring state (progress, done, failed); pending list with cleanup kinds (capture, copy, grant) and old entries; persisting picked files per platform; keep-alive runner (start, throttled update, stop).
- **Components:** ring visible per queue state, opens the sheet.
- **Native:** Pixel and iPhone: S-012-01 … 07.

## Interface & Contract Catalogue

### Native Capabilities
| ID | Plugin / permission | Behaviour |
|----|---------------------|-----------|
| NC-012-01 | Android plugin `UploadKeepAlive` (`start`, `update`, `stop`, `requestNotifications`) with foreground service `UploadService` (`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC`, `POST_NOTIFICATIONS`; `foregroundServiceType="dataSync"`) | Started when a run starts, its notification updated with "Uploading N of M" and progress, stopped when the run ends; tapping the notification opens the app. |
| NC-012-02 | iOS plugin `UploadKeepAlive` (`start`, `update` no-op, `stop`) | `beginBackgroundTask` while a run lasts; the expiration handler ends it. Registered in `MainViewController`. |
| NC-012-03 | Android `OriginalMedia.pick()` takes persistable read access; `releaseAccess({ uri })` | FR-012-04. |

## Telemetry & Observability
None.

## Documentation Deliverables
- Roadmap row 012; knowledge map; ADR-012-01 (background execution per platform); note in Features 005 and 011.

## Appendix

### What each platform allows (read 2026-10-20)
- **Android:** Capacitor keeps the WebView's JavaScript running in the background (`KeepRunning` defaults to true; `MockCordovaWebViewImpl.handlePause` only pauses timers otherwise), so the existing queue keeps uploading as long as the process lives. Android freezes cached background apps within seconds (cached-apps freezer, Android 11+) and kills them under memory pressure, unless the app runs a foreground service with a notification. Android 14+ requires a service type (`dataSync` for uploads; limited to 6 h per 24 h on Android 15). Alternatives: WorkManager (Gradle dependency `androidx.work`) or Android 14+ user-initiated data transfer jobs, both running native code without the WebView.
- **iOS:** the WebView's JavaScript stops when the app is suspended, a few seconds after leaving it; `beginBackgroundTask` extends that to about 30 s. Uploads that continue for longer, or after the app is closed, need a background `URLSession` with upload tasks from files, so each chunk would be written to a file and sent by the system; the upload logic (chunks, `uuid_name` echo, results) would run in Swift, with the app relaunched in the background to queue the next chunk.
