# Development Roadmap

High-level planning document for Lychee-Mobile features.

## Active Features

| Feature ID | Name | Status | Priority | Assignee | Started | Updated | Progress |
|------------|------|--------|----------|----------|---------|---------|----------|
| 001 | Server connection | Testing | High | mlapaglia | 2026-10-19 | 2026-10-19 | 12/12 tasks. Native HTTP (CapacitorHttp) with the session + `XSRF-TOKEN` cookie flow (ADR-001-01), plain http only for local-network hosts (ADR-001-02), `GET /api/v2/Version` check with a 10 s timeout, one stored server re-checked at launch with a Retry banner. 67 Vitest tests. Verified on a Pixel 11 Pro (https `lapaglia.pics` and LAN `http://192.168.1.164:4879`, error messages, banner) and the iOS 27.1 simulator (https, LAN http to a raw IP, banner). Q-001-01 … 05 resolved Option A. See `features/001-server-connection/`. |

## Backlog

Candidate features for the proof of concept (each starts with a spec under `features/<NNN>-<feature-name>/`):

| Feature ID | Name | Notes |
|------------|------|-------|
| 002 | Login | Username/password (and the server's OAuth/passkey options later); token storage in the keychain/keystore. |
| 003 | Album browsing | Root albums, sub-albums and photos through the v3 struct-of-arrays endpoints; virtualised grid. |
| 004 | Photo viewer | Full-screen viewer with swipe, pinch zoom, live/motion photo playback. |
| 005 | Photo upload | Pick from the device library and upload into an album. |

## Completed Features

| Feature ID | Name | Completed | Notes |
|------------|------|-----------|-------|

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
