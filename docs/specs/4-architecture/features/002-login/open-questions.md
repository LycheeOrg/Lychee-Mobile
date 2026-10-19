# Open Questions – Feature 002

Open questions for [Feature 002](spec.md). Log every high- and medium-impact question here (table row + Question Details entry) before asking the user; see [open-questions-format.md](../../spec-guidelines/open-questions-format.md). Once answered, fold the outcome into [spec.md](spec.md) (and an ADR when architecturally significant), then mark the entry resolved.

## Active Questions

| Question ID | Feature | Priority | Summary | Status | Opened | Updated |
|-------------|---------|----------|---------|--------|--------|---------|
| ~~Q-002-01~~ | 002 – Login | High | How does the app stay signed in? (A Lychee session with `remember_me` in the native cookie store, B API token in secure storage, C password in secure storage with silent re-login) | Resolved (Option A — Lychee session with `remember_me` in the native cookie store; owner, 2026-10-19; spec FR-002-01, FR-002-02, FR-002-04, NFR-002-01; ADR-002-01) | 2026-10-19 | 2026-10-19 |
| ~~Q-002-02~~ | 002 – Login | High | Which sign-in methods are in scope? (A username/password only, LDAP included; B also OAuth through the system browser; C also passkeys) | Resolved (Option A — username/password only, note for other methods; owner, 2026-10-19; spec Non-Goals, FR-002-07) | 2026-10-19 | 2026-10-19 |
| ~~Q-002-03~~ | 002 – Login | Medium | Is signing in required? (A optional, with Continue as guest; B required) | Resolved (Option A — optional, Continue as guest; owner, 2026-10-19; spec FR-002-03, FR-002-05, FR-002-06) | 2026-10-19 | 2026-10-19 |
| ~~Q-002-04~~ | 002 – Login | Medium | Where do sign-in and sign-out live until browsing exists? (A sign-in page after Connect, account line with Sign out on the home page; B one page holding server and sign-in fields; C sign-in as a modal) | Resolved (Option A — sign-in page after Connect, account line on the home page; owner, 2026-10-19; spec FR-002-05, FR-002-06, FR-002-08) | 2026-10-19 | 2026-10-19 |

## Question Details

### ~~Q-002-01~~ – Staying signed in

**Context:** Verified against Lychee 7.11.1 (`lapaglia.pics`, 2026-10-19) and its source:
- `POST /api/v2/Auth::login` takes `{ username, password, remember_me }`, answers a success status with an empty body when it works and 401 on a wrong password, throttled to 10 attempts per 60 minutes. LDAP users sign in through the same call.
- The session cookie lasts 120 minutes (`SESSION_LIFETIME`). With `remember_me: true` Laravel also sets a remember cookie for 28 days (`REMEMBER_LIFETIME` = 40320 minutes) and silently restores the session from it.
- Lychee has one API token per user (`Profile::resetToken`): creating one replaces any token the user already gave to another tool.
- Feature 001 already sends every request through the native cookie store (ADR-001-01). Storing a secret on the device would need a Keychain/Keystore plugin, a new dependency.

- **Option A (chosen):** sign in with `remember_me: true` and keep only Lychee's cookies, which the native cookie store persists across launches. The app stores no password and no token. After 28 days without use, or a sign-out elsewhere, the user signs in again.
  - ✅ No new dependency, nothing secret handled by app code; same session flow as the web UI.
  - ✅ Sign-out on the server (or a password change) ends the app's session too.
  - ❌ Relies on the OS cookie stores persisting cookies when the app is killed; must be checked on both devices.
  - ❌ Re-login every 28 days of inactivity.
- **Option B:** after a password sign-in, call `Profile::resetToken` and store the token in Keychain/Keystore; send it as `Authorization` on every call.
  - ✅ Stateless, never expires.
  - ❌ Replaces the user's existing API token, silently breaking other tools that use it.
  - ❌ New dependency; a stolen token is valid until reset.
- **Option C:** store username and password in Keychain/Keystore and sign in again whenever the session is gone.
  - ✅ Never asks again.
  - ❌ Keeps the password on the device; new dependency; repeated logins count against the throttle.

### ~~Q-002-02~~ – Sign-in methods

**Context:** `GET /api/v2/Auth::config` returns `{ oauthProviders: [...], u2f_enabled: bool }` (empty and `false` on `lapaglia.pics`).
- OAuth is a browser flow on the web routes (`/auth/{provider}/redirect` → provider → `/auth/{provider}/authenticate`). It ends with a session cookie in the browser that ran it, not in the app's native cookie store, and Lychee has no way to hand the result back to an app.
- Passkeys (`WebAuthn::login`) are bound to the server's domain. A native app can only use them for domains that list the app in an associated-domains file, which a self-hosted server will not have.

- **Option A (chosen):** username and password only (LDAP included, same call). If the server offers OAuth or passkeys, the sign-in page says those methods aren't supported in the app yet.
  - ✅ Works with every Lychee server; no new dependency.
  - ❌ Accounts that only have OAuth or passkeys can't sign in.
- **Option B:** also OAuth through the system browser.
  - ✅ Covers OAuth-only accounts.
  - ❌ Needs a Lychee change to return the session to the app (custom URL scheme callback) and a browser plugin; out of reach for the proof of concept.
- **Option C:** also passkeys.
  - ✅ Passwordless.
  - ❌ Needs per-server associated-domain files; not workable for self-hosted servers.

### ~~Q-002-03~~ – Required or optional

**Context:** Lychee galleries often have public albums; `Auth::user` returns `id: null` for guests and the album endpoints serve what a guest may see. Browsing is Feature 003.

- **Option A (chosen):** optional. After connecting, the sign-in page offers Sign in and Continue as guest; a guest can sign in later from the home page.
  - ✅ Public galleries work without an account; matches the web UI.
  - ❌ One more state (guest) for later features to handle.
- **Option B:** required.
  - ✅ Simpler states.
  - ❌ Public galleries need an account for nothing.

### ~~Q-002-04~~ – Screens

**Context:** Today the app has one page, `HomePage.vue`, holding the server field. There is no gallery yet to land on after signing in (Feature 003), and no settings page.

- **Option A (chosen):** a new sign-in page (`/login`) opens after a successful Connect. The home page gains an account line under the server: "Signed in as <name>" with Sign out, or "Not signed in" with Sign in. Feature 003 later replaces the home page with the gallery and moves both lines to a settings page.
  - ✅ Each page does one thing; the sign-in page carries over to later features unchanged.
  - ❌ The home page is a temporary status page until Feature 003.
- **Option B:** one page with server, username and password fields together.
  - ✅ One screen to fill.
  - ❌ Mixes two checks with different failures; awkward once the server is saved.
- **Option C:** sign-in as a modal over the home page.
  - ✅ No new route.
  - ❌ Modals are harder to reach for later features that need a sign-in prompt (e.g. on an expired session).
