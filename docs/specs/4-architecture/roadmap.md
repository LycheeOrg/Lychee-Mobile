# Development Roadmap

High-level planning document for Lychee-Mobile features.

## Active Features

| Feature ID | Name | Status | Priority | Assignee | Started | Updated | Progress |
|------------|------|--------|----------|----------|---------|---------|----------|

## Backlog

Candidate features for the proof of concept (each starts with a spec under `features/<NNN>-<feature-name>/`):

| Feature ID | Name | Notes |
|------------|------|-------|
| 001 | Server connection | Validate the server address against the Lychee API, remember it, handle unreachable servers. The address field and `normalizeServerUrl()` exist as scaffolding. |
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
