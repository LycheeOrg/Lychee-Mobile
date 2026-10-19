# Feature 002 – Login

| Field | Value |
|-------|-------|
| Status | Ready |
| Last updated | 2026-10-19 |
| Owners | mlapaglia |
| Linked plan | [plan.md](plan.md) |
| Linked tasks | [tasks.md](tasks.md) |
| Roadmap entry | #002 |

> Guardrail: This specification is the single normative source of truth for the feature. Track high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), encode resolved answers directly in the Requirements/NFR/Behaviour/UI/Telemetry sections below (no per-feature `## Clarifications` sections), and use ADRs under `docs/specs/6-decisions/` for architecturally significant clarifications (referencing their IDs from the relevant spec sections).

## Overview
Once a server is connected (Feature 001), the user can sign in with their Lychee account so later features can show private albums and upload. This feature adds the sign-in call, keeps the user signed in across launches through Lychee's own session and remember cookies (ADR-002-01), shows who is signed in, and signs out. Signing in is optional: a guest sees what the server shows guests. It reuses Feature 001's transport: native HTTP with the native cookie store and the `XSRF-TOKEN` header (ADR-001-01). Affected layers: `src/services/lycheeHttp.ts` (POST, clearing cookies), a new auth service and account store, a sign-in page (`/login`), `HomePage.vue`, `App.vue`, the router.

## Goals
- A user can sign in with the username and password they use on the web (LDAP included), and learns clearly why it failed.
- The app stays signed in across launches without storing a password or token.
- The user can see who is signed in, sign out, or continue as a guest.

## Non-Goals
- Browsing albums or photos (Feature 003).
- OAuth and passkey sign-in (Q-002-02): OAuth ends in the browser with no way back to the app, passkeys need per-server associated domains.
- Lychee API tokens (ADR-002-01).
- Creating accounts, changing passwords.
- Several accounts or servers at once (Feature 001 keeps one server).
- Prompting for sign-in when a later request finds the session expired (Feature 003 handles 401s from its own calls).

## Functional Requirements

| ID | Requirement | Success path | Validation path | Failure path | Telemetry & traces | Source |
|----|-------------|--------------|-----------------|--------------|--------------------|--------|
| FR-002-01 | Sign in. | `signIn(server, username, password)` sends `POST /api/v2/Auth::login` with `{ username, password, remember_me: true }`, then `GET /api/v2/Auth::user`, and returns the account `{ id, username }`. The account store becomes signed in and the app returns to the home page. | Empty username or password → Sign in disabled, no request. | 401 → "Wrong username or password."; 429 → "Too many sign-in attempts. Try again later."; network error or no answer within 10 s → "Can't reach this server. Check the address and your network."; any other status, or `Auth::user` still without an `id` → "Sign-in failed. Try again." On every failure the password field is cleared and the username kept. | None (no analytics in the PoC). | Roadmap 002, Q-002-01 |
| FR-002-02 | Stay signed in. | The app stores no credentials. Lychee's session cookie (120 min) and remember cookie (28 days since the last sign-in, `remember_me`) live in the native cookie store, which keeps them across launches; Lychee restores the session from the remember cookie. | — | Cookies gone or expired → the account reads as signed out (FR-002-03). | — | Q-002-01, ADR-002-01 |
| FR-002-03 | Know the account. | After a successful launch check (FR-001-03), and after its Retry succeeds, `GET /api/v2/Auth::user`: an integer `id` with a `username` → signed in as that user; `id: null` → signed out. | — | Request fails → account state `unknown`; the home page shows no account line until the next successful check. | — | Q-002-03 |
| FR-002-04 | Sign out. | Sign out sends `POST /api/v2/Auth::logout`, then clears that server's cookies from the native cookie store (`CapacitorCookies.clearCookies({ url })`); the account becomes signed out. | — | Logout request fails or times out → cookies are cleared and the account is signed out anyway. | — | — |
| FR-002-05 | Connect leads to sign-in. | After a successful Connect (FR-001-02): if the URL differs from the previous server the account resets to `unknown`; then FR-002-03 runs, and when it reads signed out the sign-in page opens. Already signed in to that server → stay on the home page. | — | Account check fails → stay on the home page, no account line. | — | Q-002-03, Q-002-04 |
| FR-002-06 | Sign-in page. | `/login`: server host as subtitle, username and password fields, Sign in, and Continue as guest (back to the home page, signed out). A back button returns to the home page. | Opening `/login` without a stored server → home page. | — | — | Q-002-03, Q-002-04 |
| FR-002-07 | Other sign-in methods. | The sign-in page reads `GET /api/v2/Auth::config`; when `oauthProviders` is not empty or `u2f_enabled` is true it shows "This server also offers <OAuth / passkey> sign-in. The app supports only username and password for now." | — | Request fails → no note. | — | Q-002-02 |
| FR-002-08 | Account line on the home page. | Under Connect, when a server is stored and the account is known: "Signed in as <username>" with Sign out, or "Not signed in" with Sign in (opens `/login`). | — | Account `unknown` → no line. | — | Q-002-04 |

> Since Feature 003 (FR-003-08), the "home page" in FR-002-05, FR-002-06 and FR-002-08 is the settings page (`/settings`); a successful Connect that doesn't need sign-in, and leaving the sign-in page, go to the album list (`/albums`).

> Since Feature 006 (ADR-006-01, 2026-10-19), sign-in no longer sends `remember_me`: the app stores the username and password in secure storage and logs in again when the session expires (FR-002-01, FR-002-02 and NFR-002-01 are superseded there).

## Non-Functional Requirements

| ID | Requirement | Driver | Measurement | Dependencies | Source |
|----|-------------|--------|-------------|--------------|--------|
| NFR-002-01 | The password is never stored, logged or kept in store state; the sign-in page clears its field after every attempt. | Account safety. | Store test: no password in state; page clears the field; code review for logging. | — | Q-002-01, ADR-002-01 |
| NFR-002-02 | Each auth request (sign in, account check, sign out) finishes within 10 s. | Same as NFR-001-01. | Unit tests with fake timers and a request that never answers. | `AbortController` | NFR-001-01 |
| NFR-002-03 | Credentials only travel to https servers or local-network http servers. | ADR-001-02 blocks other servers at connect time. | Covered by Feature 001; no new check. | ADR-001-02 | — |
| NFR-002-04 | Logic in services and stores with injected I/O; pages only map state (as NFR-001-04). | Testability. | Vitest in jsdom. | — | NFR-001-04 |
| NFR-002-05 | No new dependency. | AGENTS.md. | `package.json` unchanged. | `@capacitor/core` | ADR-002-01 |

## UI / Interaction Mock-ups

```
 Sign-in page (after Connect)       Failure                           Server offers OAuth (FR-002-07)
┌──────────────────────────────┐    ┌──────────────────────────────┐  ┌──────────────────────────────┐
│ ‹        Sign in             │    │ ‹        Sign in             │  │ ‹        Sign in             │
│          lapaglia.pics       │    │          lapaglia.pics       │  │          photos.example.com  │
│ Username                     │    │ Username                     │  │ Username                     │
│ [matt                      ] │    │ [matt                      ] │  │ [                          ] │
│ Password                     │    │ Password                     │  │ Password                     │
│ [••••••••                  ] │    │ [                          ] │  │ [                          ] │
│ [          Sign in         ] │    │ ✗ Wrong username or password.│  │ [          Sign in         ] │
│      Continue as guest       │    │ [          Sign in         ] │  │      Continue as guest       │
└──────────────────────────────┘    │      Continue as guest       │  │ This server also offers OAuth│
                                    └──────────────────────────────┘  │ sign-in. The app supports    │
                                                                      │ only username and password   │
 Home page, account line (FR-002-08)                                  │ for now.                     │
┌──────────────────────────────┐    ┌──────────────────────────────┐  └──────────────────────────────┘
│ …                            │    │ …                            │
│ ✓ Connected to Lychee 7.11.1 │    │ ✓ Connected to Lychee 7.11.1 │
│ [          Connect         ] │    │ [          Connect         ] │
│ Signed in as matt [Sign out] │    │ Not signed in     [Sign in]  │
└──────────────────────────────┘    └──────────────────────────────┘
```

## Branch & Scenario Matrix

| Scenario ID | Description / Expected outcome |
|-------------|--------------------------------|
| S-002-01 | Correct username and password → signed in, back on the home page with "Signed in as <name>". |
| S-002-02 | Wrong password (401) → "Wrong username or password.", password cleared, username kept, still signed out. |
| S-002-03 | Throttled (429) → "Too many sign-in attempts. Try again later." |
| S-002-04 | Server unreachable or silent for 10 s during sign-in → unreachable message. |
| S-002-05 | Login accepted but `Auth::user` has no id, or another status → "Sign-in failed. Try again." |
| S-002-06 | Relaunch while signed in → still signed in, no prompt. |
| S-002-07 | Session gone on the server (signed out elsewhere, remember cookie expired) → launch shows "Not signed in". |
| S-002-08 | Sign out → "Not signed in"; relaunch stays signed out. Sign out while offline → signed out locally. |
| S-002-09 | Connect to another server → account reset, then checked against the new server. |
| S-002-10 | Connect while signed out → sign-in page opens; Continue as guest → home page, "Not signed in". |
| S-002-11 | Server with OAuth providers or passkeys → note on the sign-in page. |
| S-002-12 | LDAP account → signs in through the same form. |

## Test Strategy
- **Units (Vitest):** `lycheeHttp` POST with JSON body and XSRF header, and cookie clearing; auth service: every `SignInResult` kind (S-002-01 … 05), `Auth::user` parsing, `Auth::config` parsing, sign-out clears cookies even when the request fails, 10 s timeouts with fake timers.
- **Store (Vitest):** sign-in success and failures, refresh at launch, sign-out, reset on server change, no password in state (NFR-002-01).
- **Lychee API contract:** fixtures recorded from Lychee 7.11.1: `Auth::user` for a guest, `Auth::config`, the 401 login error. The signed-in `Auth::user` fixture follows `UserResource` (no test account on the recorded server).
- **Native:** Pixel 11 Pro and iOS simulator against `lapaglia.pics` and the LAN server: sign in, kill and relaunch (S-002-06), sign out, guest (S-002-10). S-002-03 and S-002-12 are unit-tested only.

## Interface & Contract Catalogue

### Domain Objects
| ID | Description | Modules |
|----|-------------|---------|
| DO-002-01 | `Account`: `{ id: number, username: string }`. | `src/services/auth.ts` |
| DO-002-02 | `SignInResult`: `{ kind: "ok", account }` or `{ kind: "wrong_credentials" \| "throttled" \| "unreachable" \| "failed" }`. | `src/services/auth.ts` |
| DO-002-03 | Account state: `unknown`, `signed_out`, or `signed_in` with an `Account`. Not persisted. | `src/stores/account.ts` |

### API Routes / Services
| ID | Transport | Description | Notes |
|----|-----------|-------------|-------|
| API-002-01 | Lychee REST `POST /api/v2/Auth::login` (consumed) | `{ username, password, remember_me }`; empty success response; 401 `{"message":"Unknown user or invalid password","exception":"UnauthenticatedException"}`; throttled to 10 per 60 min (`X-RateLimit-*` headers, 429). LDAP users use the same call. | `AuthController::login`, `LoginRequest` |
| API-002-02 | Lychee REST `GET /api/v2/Auth::user` (consumed) | `UserResource`: `{ id, has_token, username, email, is_ldap, may_administrate, shared_albums_visibility }`; `id: null` for guests. | `AuthController::getCurrentUser` |
| API-002-03 | Lychee REST `POST /api/v2/Auth::logout` (consumed) | Ends the session and forgets the remember token. | `AuthController::logout` |
| API-002-04 | Lychee REST `GET /api/v2/Auth::config` (consumed) | `{ oauthProviders: string[], u2f_enabled: bool }`. | `Root\AuthConfig` |

### Native Capabilities
| ID | Plugin / permission | Behaviour |
|----|---------------------|-----------|
| NC-002-01 | Native cookie store (`CapacitorHttp`, `CapacitorCookies`, ADR-001-01) | Keeps the session and remember cookies across launches (Android's cookie manager flushes on every cookie set); `clearCookies({ url })` on sign-out (ADR-002-01). |

### UI States
| ID | State | Trigger / Expected outcome |
|----|-------|---------------------------|
| UI-002-01 | Sign-in idle | Sign in enabled once both fields have text. |
| UI-002-02 | Signing in | Spinner in the button, fields read-only. |
| UI-002-03 | Sign-in failed | Message under the fields; password cleared. |
| UI-002-04 | Other methods note | FR-002-07. |
| UI-002-05 | Account line | FR-002-08: signed in with Sign out, signed out with Sign in, none when unknown. |

## Telemetry & Observability
None in the proof of concept.

## Documentation Deliverables
- Roadmap row 002; knowledge map: auth service, account store, sign-in page, launch sequence.
- ADR-002-01 (sign-in persistence through Lychee's session cookies).
