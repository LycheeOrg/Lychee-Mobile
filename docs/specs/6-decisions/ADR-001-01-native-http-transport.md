# ADR-001-01: Native HTTP transport with the native cookie store

- **Status:** Accepted
- **Date:** 2026-10-19
- **Related features/specs:** Feature 001 (docs/specs/4-architecture/features/001-server-connection/spec.md), Feature 002 (login, upcoming)
- **Related open questions:** Q-001-01

## Context

The app's web content runs at `https://localhost` (Android) / `capacitor://localhost` (iOS), so every Lychee call is cross-origin. Verified against Lychee 7.11.1 and its source:
- Every `api/v2` request must send `Content-Type: application/json` (`ContentType` middleware; otherwise 406).
- Every `api/v2` request, GETs included, must pass CSRF (`VerifyCsrfToken::isReading()` is false for `api/v2`; otherwise 419): a session cookie plus `X-XSRF-TOKEN`, or an API token in `Authorization`.
- Lychee's CORS allows any origin for `api/*` but without credentials, so a WebView `fetch` cannot carry the server's cookies.

## Decision

- Enable **CapacitorHttp** (`capacitor.config.ts`): on the device, `fetch` goes through the native HTTP stack, without CORS, with the native cookie store.
- All Lychee calls go through `src/services/lycheeHttp.ts`: it first loads `{server}/` to obtain the session and `XSRF-TOKEN` cookies, then sends `api/v2` requests with `Accept` and `Content-Type: application/json` and `X-XSRF-TOKEN`, read with `CapacitorCookies.getCookies({ url })` and URL-decoded.
- The same session carries into login (Feature 002). Lychee API tokens, or per-device tokens if Lychee adds them, can replace the cookie flow later on servers that support them.

## Consequences

### Positive
- Works with every unmodified Lychee 7 server; no server change.
- No new dependency: CapacitorHttp and CapacitorCookies are part of `@capacitor/core`.
- Services use plain `fetch` and an injected cookie reader, so they are unit-testable in jsdom.

### Negative
- Server calls do not work in a desktop browser (`npx vp dev`); server work needs a device, emulator or simulator (live reload helps).
- Two requests for the first API call of a session.

## Alternatives Considered

- **Lychee API token on every call:** stateless, but the user must create a token in the web UI first, and Lychee has one token per user.
- **WebView `fetch` with a Lychee CORS change:** needs a server release; older servers never work.

## Security / Privacy Impact

Cookies live in the platform cookie store, not in JavaScript-readable storage, except `XSRF-TOKEN`, which Lychee deliberately exposes for this purpose. The first request reaches only the user-entered server.

## Operational Impact

None beyond the configuration; `npx cap sync` copies it into the native projects.

## Links

- Related ADRs: ADR-001-02, ADR-0001
