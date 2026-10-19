# ADR-002-01: Stay signed in through Lychee's session cookies

- **Status:** Superseded by ADR-006-01 (2026-10-19)
- **Date:** 2026-10-19
- **Related features/specs:** Feature 002 (docs/specs/4-architecture/features/002-login/spec.md)
- **Related open questions:** Q-002-01

## Context

The app must keep a user signed in across launches. Lychee 7.x offers two ways to authenticate API calls:
- A Laravel session: `POST /api/v2/Auth::login` with `remember_me: true` sets a session cookie (120 minutes) and a remember cookie (28 days), from which Lychee restores the session silently.
- An API token in the `Authorization` header. Lychee keeps one token per user (`Profile::resetToken`), so creating one for the app replaces any token another tool already uses.

Feature 001 already sends every request through the native HTTP stack and its cookie store (ADR-001-01). Keeping a secret in app code would need a Keychain/Keystore plugin, a new dependency.

## Decision

- Sign in with `remember_me: true` and keep only Lychee's cookies in the native cookie store. The app stores no password and no token.
- Sign-out calls `Auth::logout` (which also rotates the remember token on the server) and then clears that server's cookies with `CapacitorCookies.clearCookies({ url })`, whether or not the call succeeded.
- The account is read from `GET /api/v2/Auth::user` after each successful launch check; nothing about it is persisted by the app.

## Consequences

### Positive
- No new dependency, and no secret handled by app code.
- Signing out on the server, or changing the password, ends the app's session as it does the web UI's.
- API tokens stay free for the user's other tools.

### Negative
- Depends on the OS cookie stores keeping cookies when the app is killed. Android's `CapacitorCookieManager` flushes the WebView cookie store on every cookie set; iOS keeps cookies that have an expiry in `HTTPCookieStorage`. Checked on the devices in Feature 002's device tasks.
- A user who doesn't open the app for 28 days signs in again (Lychee's `REMEMBER_LIFETIME`).

## Alternatives Considered

- **API token in Keychain/Keystore:** stateless and long-lived, but replaces the user's existing token and adds a dependency.
- **Password in Keychain/Keystore with silent re-login:** never prompts, but keeps the password on the device, adds a dependency, and each re-login counts against Lychee's 10-per-hour login throttle.

## Security / Privacy Impact

The password lives only in the sign-in field and the single request body; it is cleared after every attempt and never stored or logged (NFR-002-01). Credentials only reach https servers or local-network http servers (ADR-001-02).

## Operational Impact

None.

## Links

- Related ADRs: ADR-001-01, ADR-001-02
