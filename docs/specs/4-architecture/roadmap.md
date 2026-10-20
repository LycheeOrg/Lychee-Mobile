# Development Roadmap

High-level planning document for Lychee-Mobile features.

## Active Features

| Feature ID | Name | Status | Priority | Assignee | Started | Updated | Progress |
|------------|------|--------|----------|----------|---------|---------|----------|

## Backlog

Candidate features for the proof of concept (each starts with a spec under `features/<NNN>-<feature-name>/`):

| Feature ID | Name | Notes |
|------------|------|-------|

## Completed Features

| Feature ID | Name | Completed | Notes |
|------------|------|-----------|-------|
| 010 | Album creation | 2026-10-20 | Toolbar "+" (dropdown) with Upload photos and Create album, as in the web UI; Create album where the server allows it (`can_edit`), top level or inside regular albums, opens the new album; `POST Album` with the plain-text ID and 409 retries. 649 Vitest tests; owner confirmed on devices. See `features/010-album-creation/`. |
| 009 | Usability fixes | 2026-10-20 | Back on the album list closes the app; white viewer buttons; launch race fixed (the first page waiting for the launch starts it) and stored credentials tried before any sign-in screen, no 60 s cooldown; Settings holds server, username and password with one Save, Sign in page removed; Android uploads keep the camera's file name with photo access (ADR-009-01). 603 Vitest tests; owner confirmed on Android and iOS. PR #12. See `features/009-usability-fixes/`. |
| 008 | Photo info panel | 2026-10-20 | "i" button in the viewer opens a sheet (half height, draggable to full, follows swipes) with Lychee's About details: size, dates, description, tags, albums (`Photo/{id}/albums`, 7.4.0+), EXIF, location with a static map from Lychee's tile provider (ADR-008-01), license; server switches respected, server HTML shown as text. 575 Vitest tests at merge; owner confirmed on Android and iOS. PR #11. See `features/008-photo-info-panel/`. |
| 007 | Photo download and delete | 2026-10-20 | Select in the grid by long press (Android's `contextmenu` and a 500 ms timer) or Select; Download and Delete always shown, disabled without the right. Delete through `DELETE Photo` with `from_id` in regular albums and Unsorted only, with confirmation and next-page recomputation. Download of originals through `GET Zip` with `@capacitor/file-transfer` 2.0.6 and `@capacitor/filesystem` 8.1.5, saved with `@capacitor-community/media` 9.1.0 on iOS and `OriginalMedia.saveToGallery` into `Pictures/Lychee` / `Movies/Lychee` on Android (ADR-007-01). 513 Vitest tests; owner confirmed the device checks on Android and iOS. See `features/007-photo-download-delete/`. |
| 006 | Stored credentials | 2026-10-19 | Username and password stored with `@aparajita/capacitor-secure-storage` 8.0.1 (iOS Keychain this device only, Android Keystore AES-GCM); no `remember_me`; silent login at launch and on a 401 with one retry; rejected password opens sign-in prefilled; bridge logging off (ADR-006-01 supersedes ADR-002-01). 389 Vitest tests; owner ran the apps on the Pixel and an iPhone. See `features/006-stored-credentials/`. |
| 005 | Photo upload | 2026-10-19 | Upload into albums with `can_upload` and Unsorted; chunked `POST /api/v2/Photo` (≤ 4 MiB; range reads on iOS, stream on Android); foreground queue with progress sheet. Originals with GPS (ADR-005-01): iOS through `@capawesome/capacitor-file-picker` 8.1.0, Android through the app's own `OriginalMediaPlugin` (picker location request, `setRequireOriginal` copy, location check with "Uploaded without GPS data" notice). 357 Vitest tests; verified by the owner on the Pixel 11 Pro (Android 17) and an iPhone. See `features/005-photo-upload/`. |
| 004 | Photo viewer | 2026-10-19 | Full-screen modal over the album page with Swiper 14.3.0 Zoom + Virtual (ADR-004-01), medium/medium2x with the original past 1.5×, videos, press-and-hold live photos, paging into further album pages. 277 Vitest tests; verified by the owner on the Pixel 11 Pro and an iPhone. See `features/004-photo-viewer/`. |
| 003 | Album browsing | 2026-10-19 | Album list as start page, settings page, sub-albums and infinite photo grid through the v2 API (ADR-003-01), `<img>` thumbnails with Android mixed content for LAN servers (ADR-003-02), album and gallery unlock, NSFW hide/blur/warn, 419 retry. 245 Vitest tests; verified by the owner on the Pixel 11 Pro and an iPhone. See `features/003-album-browsing/`. |
| 002 | Login | 2026-10-19 | Username/password sign-in with `remember_me`; stays signed in through Lychee's cookies, no stored password or token (ADR-002-01); account line with Sign out; Continue as guest; note for OAuth/passkey servers. 126 Vitest tests; verified by the owner on the Pixel 11 Pro and an iPhone. See `features/002-login/`. |
| 001 | Server connection | 2026-10-19 | Native HTTP with the session + `XSRF-TOKEN` flow (ADR-001-01), plain http for local-network hosts only (ADR-001-02), `GET /api/v2/Version` check with a 10 s timeout, one stored server re-checked at launch. 67 Vitest tests; verified on a Pixel 11 Pro and the iOS 27.1 simulator. Closed without a CI run (GitHub Actions outage), local gate green. PR #4. See `features/001-server-connection/`. |

## Status Values

- **Planning** - Specification in progress
- **In Progress** - Active implementation
- **Testing** - Code complete, under verification
- **Blocked** - Waiting on dependencies or clarification
- **Complete** - Delivered and verified

## Priority Levels

- **High** - Needed for the proof of concept
- **Medium** - Valuable, not blocking
- **Low** - Nice to have
