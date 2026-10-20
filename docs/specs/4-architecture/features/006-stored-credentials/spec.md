# Feature 006 – Stored Credentials

| Field | Value |
|-------|-------|
| Status | Ready |
| Last updated | 2026-10-19 |
| Owners | mlapaglia |
| Linked plan | [plan.md](plan.md) |
| Linked tasks | [tasks.md](tasks.md) |
| Roadmap entry | #006 |

> Guardrail: This specification is the single normative source of truth for the feature. Track high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), encode resolved answers directly in the Requirements/NFR/Behaviour/UI/Telemetry sections below (no per-feature `## Clarifications` sections), and use ADRs under `docs/specs/6-decisions/` for architecturally significant clarifications (referencing their IDs from the relevant spec sections).

> **Amended by Feature 009 (2026-10-20):** launch also logs in when the account can't be read, the 60 s cooldown (NFR-006-02) is removed, and a rejected password opens Settings instead of the Sign in page (FR-009-03).

## Overview
Owner request (2026-10-19): "let's change this so the username/password are stored securely, and they are used to log in and get a fresh cookie, don't use 'remember me' at all". The app signs in without `remember_me`, keeps the username and password in the platform's secure storage (`@aparajita/capacitor-secure-storage`: iOS Keychain, Android Keystore-encrypted storage; ADR-006-01), and logs in again silently whenever Lychee's 2-hour session is gone: at launch and on the first 401 of a gallery or upload call, which is then sent again once. A rejected password forgets the credentials and opens the sign-in page. Supersedes ADR-002-01.

## Goals
- Stay signed in indefinitely without the remember cookie, as long as the password is valid.
- Keep the credentials only in secure storage, never in plain storage, logs or app state.

## Non-Goals
- Several accounts or servers; biometric unlock (Q-006-04).
- Migrating existing remember-cookie sessions: they keep working until the cookie expires; the next sign-in stores the credentials.
- Silent re-login for calls outside the gallery and upload paths (the account check at launch is covered).

## Functional Requirements

| ID | Requirement | Success path | Validation path | Failure path | Telemetry & traces | Source |
|----|-------------|--------------|-----------------|--------------|--------------------|--------|
| FR-006-01 | Sign in and store. | `POST Auth::login` sends `{ username, password }` (no `remember_me`). On success the credentials are stored under one key with the server URL: `{ server, username, password }`, iCloud sync off, iOS Keychain access `afterFirstUnlockThisDeviceOnly` (Q-006-04). | — | Storing fails → signed in for this session; the user signs in again when it ends. | None (no analytics in the PoC). | Owner request, Q-006-01, Q-006-04 |
| FR-006-02 | Silent login. | `reauthenticate()` loads the credentials for the stored server and signs in (FR-006-01 without storing again). Triggers: (1) launch: after the account check (FR-002-03) reads signed out; (2) the first 401 `unauthenticated` of a gallery call (FR-003-06) or upload (FR-005-03): on success the call is sent again once. Concurrent triggers share one login. | No credentials, or credentials for another server → no login (returns "not signed in"). | See FR-006-03. Within 60 s after a successful silent login, a further 401 doesn't log in again (NFR-006-02). | — | Q-006-02 |
| FR-006-03 | Failed silent login. | — | — | 401 (wrong password) → the credentials are deleted, the account becomes signed out, the app opens the sign-in page with the username filled in and "Your password changed or was reset. Sign in again."; 429, unreachable or another failure → the credentials are kept, the call shows its usual sign-in message (FR-003-06), and the next launch or 401 tries again. | — | Q-006-03 |
| FR-006-04 | Forget credentials. | Sign out, connecting to another server (FR-002-04) and a rejected password (FR-006-03) delete the stored credentials. | — | Deletion fails → ignored; the credentials no longer match the server or are deleted at the next attempt. | — | — |
| FR-006-05 | Unreadable storage. | — | — | Reading the credentials fails (e.g. Android restored them from a backup to a new device, where the Keystore key doesn't exist) → they are deleted and treated as not stored. | — | ADR-006-01 |

## Non-Functional Requirements

| ID | Requirement | Driver | Measurement | Dependencies | Source |
|----|-------------|--------|-------------|--------------|--------|
| NFR-006-01 | The password is only in secure storage and in the login request; never in `@capacitor/preferences`, logs or store state. Capacitor's bridge logging is off (`loggingBehavior: "none"` in `capacitor.config.ts`), because in debug builds it prints every plugin result, which would include the stored credentials. | Account safety; supersedes NFR-002-01's "never stored". | Store tests (no password in state); `capacitor.config.ts`; logcat after a silent login shows no credentials. | Q-006-01 | NFR-002-01 |
| NFR-006-02 | Silent logins never loop: at most one at a time, none within 60 s of a successful one, none after a rejected password. | Lychee's 10-per-hour login throttle. | Unit tests. | — | API-002-01 |
| NFR-006-03 | The only new dependency is `@aparajita/capacitor-secure-storage`, pinned to exactly `8.0.1`, sync off, Keychain access `afterFirstUnlockThisDeviceOnly`. | AGENTS.md; Q-006-04. | `package.json` diff; credentials service tests assert the options. | ADR-006-01 | Q-006-01, Q-006-04 |

## UI / Interaction Mock-ups

```
 Password rejected during a silent login (FR-006-03)
┌──────────────────────────────┐
│ ‹        Sign in             │
│          lapaglia.pics       │
│ Your password changed or was │
│ reset. Sign in again.        │
│ Username                     │
│ [matt                      ] │
│ Password                     │
│ [                          ] │
│ [          Sign in         ] │
│      Continue as guest       │
└──────────────────────────────┘
```

## Branch & Scenario Matrix

| Scenario ID | Description / Expected outcome |
|-------------|--------------------------------|
| S-006-01 | Sign in → credentials stored; no `remember_me` sent. |
| S-006-02 | Session expired → the next gallery call gets 401, a silent login runs, the call is retried; the user sees nothing. |
| S-006-03 | Relaunch after the session expired → the account check reads guest, a silent login runs, the app shows the user signed in. |
| S-006-04 | Password changed on the server → silent login 401 → credentials deleted, sign-in page with the username and the message. |
| S-006-05 | Throttled or offline during a silent login → credentials kept; the usual message. |
| S-006-06 | Several calls get 401 at once → one silent login. |
| S-006-07 | Sign out → credentials deleted; relaunch shows signed out. |
| S-006-08 | Connect to another server → credentials deleted. |
| S-006-09 | Upload gets 401 → silent login, the file is uploaded again from the start. |
| S-006-10 | Stored credentials unreadable → deleted, treated as signed out. |

## Test Strategy
- **Units (Vitest):** credentials service (save with sync off and the Keychain access, load for the matching server only, unreadable → deleted, forget); `signIn` without `remember_me`; account store `reauthenticate()` (single flight, 60 s guard, wrong password, throttle, offline, no credentials); session launch; album list/page retry after a successful silent login; upload queue retry.
- **Native:** Pixel and iPhone: sign in, kill the app, sign out on the server (or wait for the session to expire) and use the app (S-006-02/03); change the password on the server (S-006-04).

## Interface & Contract Catalogue

### Domain Objects
| ID | Description | Modules |
|----|-------------|---------|
| DO-006-01 | Stored credentials `{ server, username, password }` under the key `lychee_credentials`. | `src/services/credentials.ts` |

### Native Capabilities
| ID | Plugin / permission | Behaviour |
|----|---------------------|-----------|
| NC-006-01 | `@aparajita/capacitor-secure-storage` `8.0.1` | iOS Keychain (`KeychainSwift`), Android AES-GCM with a Keystore key, ciphertext in SharedPreferences. |

## Telemetry & Observability
None in the proof of concept.

## Documentation Deliverables
- ADR-006-01 (supersedes ADR-002-01); Feature 002 spec note; roadmap row 006; knowledge map.
