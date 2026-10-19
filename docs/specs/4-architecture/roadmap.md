# Development Roadmap

High-level planning document for Lychee-Mobile features.

## Active Features

| Feature ID | Name | Status | Priority | Assignee | Started | Updated | Progress |
|------------|------|--------|----------|----------|---------|---------|----------|

## Backlog

Candidate features for the proof of concept (each starts with a spec under `features/<NNN>-<feature-name>/`):

| Feature ID | Name | Notes |
|------------|------|-------|
| 003 | Album browsing | Root albums, sub-albums and photos through the v3 struct-of-arrays endpoints; virtualised grid. |
| 004 | Photo viewer | Full-screen viewer with swipe, pinch zoom, live/motion photo playback. |
| 005 | Photo upload | Pick from the device library and upload into an album. |

## Completed Features

| Feature ID | Name | Completed | Notes |
|------------|------|-----------|-------|
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
