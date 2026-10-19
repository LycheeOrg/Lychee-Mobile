# Feature 001 – Server Connection

| Field | Value |
|-------|-------|
| Status | Ready |
| Last updated | 2026-10-19 |
| Owners | mlapaglia |
| Linked plan | [plan.md](plan.md) |
| Linked tasks | [tasks.md](tasks.md) |
| Roadmap entry | #001 |

> Guardrail: This specification is the single normative source of truth for the feature. Track high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), encode resolved answers directly in the Requirements/NFR/Behaviour/UI/Telemetry sections below (no per-feature `## Clarifications` sections), and use ADRs under `docs/specs/6-decisions/` for architecturally significant clarifications (referencing their IDs from the relevant spec sections).

## Overview
Before anything else, the app needs to know which Lychee server to talk to and whether it can reach it. Today the home page stores whatever address the user types (normalised by `normalizeServerUrl()`), without contacting the server. This feature checks the address against the Lychee API, reports clearly why a server cannot be used, remembers a working server, and re-checks it when the app starts. It introduces the app's first network code (`src/services/`) and the transport every later feature uses: native HTTP with the native cookie store (ADR-001-01). Affected layers: `src/views/HomePage.vue`, new services and a server store, `capacitor.config.ts`, and the Android/iOS network security settings for local plain-http servers (ADR-001-02).

## Goals
- A user can enter their server address and learn within seconds whether it is a usable Lychee server, and if not, why (invalid address, unreachable, not Lychee, blocked plain http, TLS error).
- A working server is remembered across launches and re-checked at every launch.
- The transport chosen here (ADR-001-01) is the one login (Feature 002) and browsing build on.

## Non-Goals
- Login and accounts (Feature 002).
- Browsing albums or photos (Feature 003).
- Server discovery on the local network (mDNS/Bonjour).
- Several servers: one server at a time; connecting to another replaces it (Q-001-05).
- Running server calls in a desktop browser (`npx vp dev`): native HTTP only exists on the device, emulator or simulator (ADR-001-01).

## Functional Requirements

| ID | Requirement | Success path | Validation path | Failure path | Telemetry & traces | Source |
|----|-------------|--------------|-----------------|--------------|--------------------|--------|
| FR-001-01 | Check a server address. | `checkServer(input)` normalises the address, then (1) `GET {url}/` to obtain the session and `XSRF-TOKEN` cookies, (2) `GET {url}/api/v2/Version` with `Accept`/`Content-Type: application/json` and `X-XSRF-TOKEN`, and returns `ok` with the version (or `null` when the server hides it). | Invalid address → `invalid_address`, no request. Plain http only for local-network hosts (`localhost`, `*.local`, 127/8, 10/8, 172.16/12, 192.168/16), else `insecure_http`, no request. A server is Lychee when the answer is 200 JSON with boolean `is_new_release_available` and `is_git_update_available` (`version` a string or `null`); any version is accepted. | No answer within 10 s for the whole check, or a network error → `unreachable`; non-200 or unexpected JSON → `not_lychee`; certificate error → `tls_error`. | None (no analytics in the PoC). | Roadmap 001, Q-001-02, Q-001-03 |
| FR-001-02 | Save the server. | Connect runs FR-001-01; on `ok` the normalised URL and version are stored (`@capacitor/preferences` keys `server_url`, `server_version`), replacing any previous server, and the screen shows "Connected to Lychee <version>" ("Connected to Lychee" when hidden). | The address is saved only after a successful check. | Each failure kind shows its own message under the field; the stored server is unchanged. | — | Q-001-04, Q-001-05 |
| FR-001-03 | Re-check at launch. | When a server is stored, the app checks it at startup; success is silent and refreshes the stored version. | — | Any failure → banner at the top: the failure message for the stored host, with Retry; the stored server is kept. Retry re-runs the check. | — | Q-001-04 |
| FR-001-04 | Transport. | `CapacitorHttp` is enabled, so `fetch` uses the native HTTP stack and the native cookie store; `src/services/lycheeHttp.ts` adds the JSON headers and reads `XSRF-TOKEN` through `CapacitorCookies.getCookies({ url })`. | — | — | — | Q-001-01, ADR-001-01 |

## Non-Functional Requirements

| ID | Requirement | Driver | Measurement | Dependencies | Source |
|----|-------------|--------|-------------|--------------|--------|
| NFR-001-01 | A check finishes (success or failure) within 10 s. | Users must not stare at a spinner on a dead address. | Unit test with a never-resolving `fetch` and fake timers. | `AbortController` | — |
| NFR-001-02 | No credentials or personal data are sent in this feature; the only request is `GET /api/v2/Version`. | Privacy; login is Feature 002. | Code review; service tests assert the request. | — | — |
| NFR-001-03 | Plain http only to local-network hosts. The app enforces it before any request (`isLocalNetworkHost()`). iOS adds `NSAllowsLocalNetworking`; Android's network security config cannot express IP ranges, so it permits cleartext for the app and relies on the app check (ADR-001-02). | Users' credentials later cross this connection. | Unit tests on the host classifier; device check against a LAN server. | `AndroidManifest.xml`, `Info.plist` | Q-001-02, ADR-001-02 |
| NFR-001-04 | The check logic is a pure, testable service (`src/services/`) returning a result record; the view only maps results to messages. | AGENTS.md straight-line increments; testability in jsdom. | Vitest coverage of every result kind. | — | AGENTS.md |

## UI / Interaction Mock-ups

```
 Empty / editing                    Checking                         Connected
┌──────────────────────────┐       ┌──────────────────────────┐     ┌──────────────────────────┐
│ Lychee                   │       │ Lychee                   │     │ Lychee                   │
├──────────────────────────┤       ├──────────────────────────┤     ├──────────────────────────┤
│ Connect to your Lychee   │       │ Server address           │     │ Server address           │
│ server.                  │       │ photos.example.com       │     │ https://photos.example.com│
│ Server address           │       │                          │     │ ✓ Connected to Lychee 7.4│
│ [photos.example.com    ] │       │ [ ◌ Checking…          ] │     │ [        Connect       ] │
│ [        Connect       ] │       │                          │     │                          │
└──────────────────────────┘       └──────────────────────────┘     └──────────────────────────┘

 Failure (message under the field)          Launch, server down (Q-001-04)
┌──────────────────────────────────┐       ┌──────────────────────────────────┐
│ Server address                   │       │ ⚠ Can't reach photos.example.com │
│ [photos.exmaple.com            ] │       │                        [ Retry ] │
│ ✗ Can't reach this server. Check │       │ Lychee                           │
│   the address and your network.  │       │ …                                │
│ [            Connect           ] │       └──────────────────────────────────┘
└──────────────────────────────────┘
 Messages: invalid address · can't reach · not a Lychee server ·
           plain http only for local network addresses · certificate problem
```

## Branch & Scenario Matrix

| Scenario ID | Description / Expected outcome |
|-------------|--------------------------------|
| S-001-01 | Valid https Lychee server → connected, version shown, address stored. |
| S-001-02 | Lychee with `hide_version_number` → connected without a version. |
| S-001-03 | Empty or malformed address → invalid-address message, no request. |
| S-001-04 | Host does not answer within 10 s → unreachable message, nothing stored. |
| S-001-05 | Host answers but is not Lychee (404, HTML, other JSON) → not-Lychee message. |
| S-001-06 | Plain http to a local-network host (e.g. `http://192.168.1.10:8000`, `http://nas.local`) → checked normally. |
| S-001-07 | Plain http to a public host → `insecure_http` message, no request. |
| S-001-08 | Self-signed or expired certificate → certificate message. |
| S-001-09 | Launch with a saved, reachable server → no banner, version refreshed. |
| S-001-10 | Launch with a saved, unreachable server → banner with Retry; Retry succeeds when it is back. |

## Test Strategy
- **Units (Vitest):** `isLocalNetworkHost()`; `lychee` HTTP helper (headers, XSRF from the cookie reader); `checkServer()` with injected `fetch`/cookie reader for every result kind (S-001-01 … 08), the 10 s timeout with fake timers.
- **Store (Vitest):** `useServerConnection()` stores only on success, replaces the previous server, launch check and Retry (S-001-09/10). The view only maps store state to Ionic components and messages.
- **Lychee API contract:** recorded responses from a real Lychee 7.11.1 as fixtures: `/api/v2/Version` 200, the 406 without JSON content type, the 419 without CSRF.
- **Native:** manual check on the Pixel 11 Pro and an iOS simulator against a local Lychee over http and a public one over https.

## Interface & Contract Catalogue

### Domain Objects
| ID | Description | Modules |
|----|-------------|---------|
| DO-001-01 | `ServerCheckResult`: `{ kind: "ok", url, version: string \| null }` or `{ kind: "invalid_address" \| "insecure_http" \| "unreachable" \| "not_lychee" \| "tls_error" }`. | `src/services/server.ts` |
| DO-001-02 | Stored server: `server_url` (normalised URL) and `server_version` (string, empty when hidden) in `@capacitor/preferences`. | `src/stores/server.ts` |

### API Routes / Services
| ID | Transport | Description | Notes |
|----|-----------|-------------|-------|
| API-001-00 | Lychee web `GET {server}/` (consumed) | Sets the session and `XSRF-TOKEN` cookies every `api/v2` call needs (Q-001-01). | Laravel session + CSRF middleware |
| API-001-01 | Lychee REST `GET /api/v2/Version` (consumed) | `{ version: string\|null, is_new_release_available: bool, is_git_update_available: bool }`; no login, but requires `Content-Type: application/json` (else 406) and the session cookie + `X-XSRF-TOKEN` header (else 419), or an `Authorization` API token. | LycheeOrg/Lychee `VersionController`, `Root\VersionResource`, `ContentType`, `VerifyCsrfToken`, `SessionOrTokenGuard` |

### Native Capabilities
| ID | Plugin / permission | Behaviour |
|----|---------------------|-----------|
| NC-001-01 | `CapacitorHttp`, `CapacitorCookies` (in `@capacitor/core`) | Native HTTP behind `fetch`; native cookie store read for `XSRF-TOKEN` (ADR-001-01). |
| NC-001-02 | Android `android:usesCleartextTraffic="true"`; iOS `NSAppTransportSecurity` → `NSAllowsLocalNetworking` | Plain http for local-network servers, gated by the app (ADR-001-02). |

### UI States
| ID | State | Trigger / Expected outcome |
|----|-------|---------------------------|
| UI-001-01 | Checking | Connect tapped; button shows a spinner, field read-only. |
| UI-001-02 | Connected | Check succeeded; version line under the field. |
| UI-001-03 | Failed | Check failed; message under the field. |
| UI-001-04 | Launch banner | Saved server fails its launch check; message + Retry. |

## Telemetry & Observability
None in the proof of concept.

## Documentation Deliverables
- Roadmap row 001; knowledge map: `src/services/server.ts`, the transport and the network security settings.
- ADR-001-01 (transport) and ADR-001-02 (plain-http policy).
