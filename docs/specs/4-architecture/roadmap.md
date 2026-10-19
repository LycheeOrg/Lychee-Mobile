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
