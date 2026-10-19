# Open Questions – Feature 001

Open questions for [Feature 001](spec.md). Log every high- and medium-impact question here (table row + Question Details entry) before asking the user; see [open-questions-format.md](../../spec-guidelines/open-questions-format.md). Once answered, fold the outcome into [spec.md](spec.md) (and an ADR when architecturally significant), then mark the entry resolved.

## Active Questions

| Question ID | Feature | Priority | Summary | Status | Opened | Updated |
|-------------|---------|----------|---------|--------|--------|---------|
| ~~Q-001-01~~ | 001 – Server connection | High | How does the app talk to the Lychee server? (A native HTTP via CapacitorHttp with the native cookie store, B Lychee API token instead of cookies, C WebView fetch with a Lychee CORS change) | Resolved (Option A — CapacitorHttp + native cookie store; owner, 2026-10-19; spec FR-001-01, FR-001-04; ADR-001-01) | 2026-10-19 | 2026-10-19 |
| ~~Q-001-02~~ | 001 – Server connection | High | Which plain-http servers may the app connect to? (A local network only, B any with a warning, C https only) | Resolved (Option A — local-network hosts only; owner, 2026-10-19; spec FR-001-01, NFR-001-03; ADR-001-02) | 2026-10-19 | 2026-10-19 |
| ~~Q-001-03~~ | 001 – Server connection | Medium | What proves an address is a Lychee server, and which versions are accepted? (A `/api/v2/Version` shape, any version; B same plus a minimum version; C `Gallery::Init`) | Resolved (Option A — `/api/v2/Version` shape, any version; owner, 2026-10-19; spec FR-001-01) | 2026-10-19 | 2026-10-19 |
| ~~Q-001-04~~ | 001 – Server connection | Medium | When is the server checked? (A on save, required, and again at launch; B on save only; C at launch only) | Resolved (Option A — on save, required, and at launch; owner, 2026-10-19; spec FR-001-02, FR-001-03) | 2026-10-19 | 2026-10-19 |
| ~~Q-001-05~~ | 001 – Server connection | Medium | One server or several? (A one for the PoC, B a list) | Resolved (Option A — one server; owner, 2026-10-19; spec FR-001-02, Non-Goals) | 2026-10-19 | 2026-10-19 |

## Question Details

### ~~Q-001-01~~ – HTTP transport

**Context:** The app's web content runs at `https://localhost` (Android) / `capacitor://localhost` (iOS), so every call to the Lychee server is cross-origin. Verified against a real Lychee 7.11.1 (2026-10-19) and its source:
- Every `api/v2` request, GETs included, must send `Content-Type: application/json` (`ContentType` middleware, else 406) and pass CSRF (`VerifyCsrfToken::isReading()` returns false for `api/v2`, else 419), unless it carries an API token in `Authorization` (`SessionOrTokenGuard`).
- So even the unauthenticated version check is two steps: `GET {server}/` sets the session and `XSRF-TOKEN` cookies, then `GET /api/v2/Version` with those cookies and `X-XSRF-TOKEN` → 200.
- Lychee's CORS (`config/cors.php`) allows `api/*` from any origin but with `supports_credentials: false`, so a WebView `fetch` cannot send or receive the server's cookies: the check fails from the WebView, not only login.

`@capacitor/core` 8 ships CapacitorHttp (native HTTP behind `fetch`, no CORS) and CapacitorCookies (native cookie store, readable from JS). No new dependency.

- **Option A (chosen):** enable CapacitorHttp; `src/services/` uses `fetch` with the native cookie store: first request to `{server}/`, then API calls with `X-XSRF-TOKEN` read from the stored `XSRF-TOKEN` cookie, and `Content-Type`/`Accept: application/json`.
  - ✅ Works with any unmodified Lychee; the same session carries into login (Feature 002).
  - ✅ Plain `fetch`; testable in jsdom with mocked `fetch` and cookie reader.
  - ❌ In a desktop browser (`npx vp dev`) server calls hit CORS; server work needs a device, emulator or simulator.
- **Option B:** authenticate every call with a Lychee API token (`Authorization` header), which skips CSRF and cookies.
  - ✅ Stateless, simple requests.
  - ❌ The user must create a token in Lychee's web UI before even checking the server; no username/password login.
- **Option C:** WebView `fetch`, with a Lychee change allowing credentialed CORS for app origins.
  - ✅ Same behaviour in the browser and on the device.
  - ❌ Needs a server change and a Lychee release; older servers never work.

### ~~Q-001-02~~ – Plain-http servers

**Context:** Many self-hosted Lychee instances run on a home network over plain http (e.g. `http://192.168.1.10:8000`). Android blocks cleartext traffic by default (network security config) and iOS blocks it through App Transport Security; both need explicit allowances, and broad allowances draw App Store review questions. `normalizeServerUrl()` already accepts `http://`.

- **Option A (chosen):** allow http only for local-network hosts: private IPv4 ranges (10/8, 172.16/12, 192.168/16), `localhost`, `*.local`; anything else must be https. Android: network security config limited to those; iOS: `NSAllowsLocalNetworking`.
  - ✅ Covers home servers; public servers keep TLS.
  - ❌ A public http server cannot be used.
- **Option B:** allow http everywhere, with a warning before saving.
  - ✅ Works with any server.
  - ❌ Credentials (Feature 002) could cross the internet unencrypted; broad ATS exception.
- **Option C:** https only.
  - ✅ Simplest and safest.
  - ❌ Excludes most home-network setups.

### ~~Q-001-03~~ – Identifying a Lychee server

**Context:** `GET /api/v2/Version` needs no login (`routes/api_v2.php`) and returns `{ version: string|null, is_new_release_available: bool, is_git_update_available: bool }`; `version` is `null` when the admin enabled `hide_version_number`. It still needs the JSON content type and CSRF described in Q-001-01. Real response from a Lychee 7.11.1: `{"version":"7.11.1","is_new_release_available":false,"is_git_update_available":false}`.

- **Option A (chosen):** a server is valid when `/api/v2/Version` answers 200 with JSON whose two booleans are present; show the version when given, accept any.
  - ✅ Works with hidden versions; one small request.
  - ❌ A very old Lychee that happens to have this endpoint but lacks later APIs is only caught by later features.
- **Option B:** same, plus a minimum version; reject servers below it or with a hidden version.
  - ✅ Clear support boundary.
  - ❌ Rejects every server that hides its version.
- **Option C:** `GET /api/v2/Gallery::Init` (gallery configuration).
  - ✅ Also returns settings later features need.
  - ❌ Larger response; shape changes more often.

### ~~Q-001-04~~ – When the server is checked

- **Option A (chosen):** check when the user saves (the address is saved only if the check passes), and again at every launch; an unreachable server at launch shows a retry banner and keeps the saved address.
  - ✅ No bad address is stored; the user learns at launch when the server is down.
  - ❌ One request per launch.
- **Option B:** check on save only.
  - ✅ Fewer requests.
  - ❌ A server that went down is only noticed when a later feature fails.
- **Option C:** save without checking, check at launch.
  - ✅ Saving works offline.
  - ❌ Typos are found late.

### ~~Q-001-05~~ – Number of servers

- **Option A (chosen):** one server for the proof of concept; changing it replaces the old one.
  - ✅ Simplest UI and storage.
  - ❌ Users with several galleries switch by retyping.
- **Option B:** a list of servers with one active.
  - ✅ Multi-gallery users.
  - ❌ More UI and storage now, before login exists.
