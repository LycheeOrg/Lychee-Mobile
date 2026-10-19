# ADR-006-01: Store the credentials and log in again instead of the remember cookie

- **Status:** Accepted
- **Date:** 2026-10-19
- **Related features/specs:** Feature 006 (docs/specs/4-architecture/features/006-stored-credentials/spec.md), Feature 002
- **Related open questions:** Q-006-01 … Q-006-04
- **Supersedes:** ADR-002-01

## Context

ADR-002-01 kept users signed in through Lychee's session cookie (120 minutes) and remember cookie (28 days from sign-in), storing no credentials. The owner asked to store the username and password securely and use them to log in for a fresh session, without `remember_me`. Capacitor has no secure storage of its own. Read from the candidates (2026-10-19): `@aparajita/capacitor-secure-storage` 8.0.1 (Android AES-GCM with an Android Keystore key, ciphertext in SharedPreferences; iOS Keychain through `KeychainSwift`; per-item Keychain access and an iCloud sync switch); `capacitor-secure-storage-plugin` 0.13.0 (Android RSA PKCS#1 v1.5); or app-local native code on both platforms. The owner chose the first.

## Decision

- Sign in without `remember_me`; after a successful sign-in, store `{ server, username, password }` with `@aparajita/capacitor-secure-storage` pinned to exactly `8.0.1`, sync off, Keychain access `afterFirstUnlockThisDeviceOnly` (no iCloud, not restored to another device).
- Log in again silently on demand: at launch when the session reads as guest, and on the first 401 of a gallery or upload call, which is then retried once. One login at a time; none within 60 s of a successful one; none after a rejected password.
- A rejected password deletes the credentials and opens the sign-in page with the username; throttling or network failures keep them.
- Sign out and changing server delete them; unreadable credentials (e.g. Android data restored without its Keystore key) are deleted.

## Consequences

### Positive
- Users stay signed in for as long as their password is valid, not 28 days.
- No dependency on the server's `REMEMBER_LIFETIME`.

### Negative
- The password is stored on the device: anyone with the unlocked phone can use the app as the user, and a compromised device exposes it (it was Option C's drawback in Q-002-01).
- A new dependency with native code (and a transitive Swift package and an unused `@capacitor/keyboard` dependency); updates need review and approval.
- Each expired session costs one login against Lychee's 10-per-hour throttle.
- A password changed on the server signs the app out at the next expiry.

## Alternatives Considered

- **Keep ADR-002-01 (remember cookie):** nothing stored, but signed out every 28 days.
- **App-local native code:** no dependency, but our own security code in Java and Swift.
- **Biometric prompt or opt-in switch (Q-006-04 B/C):** more protection or choice, more prompts or controls.

## Security / Privacy Impact

The password moves from "never stored" to the platform's secure storage. It never enters `@capacitor/preferences`, logs or app state. Capacitor's bridge logs plugin results in debug builds (Feature 004 backlog), which would print the credentials when they are read, so `loggingBehavior` is set to `none`.

## Operational Impact

Dependabot opens update PRs for the plugin; each needs owner approval.

## Links

- Related ADRs: ADR-001-01, ADR-002-01 (superseded)
