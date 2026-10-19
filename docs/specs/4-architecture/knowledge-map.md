# Knowledge Map

How the pieces of Lychee-Mobile relate. Update it whenever modules, services, stores, plugins or API contracts appear or change (AGENTS.md).

## Runtime

- **Web app** (`src/`): Vue 3 + Ionic Vue 9, built by Vite+ into `dist/` (ADR-0001).
  - `src/main.ts` creates the app with `IonicVue` and the router, then mounts once the router is ready.
  - `src/router/index.ts`: `@ionic/vue-router` routes; `/` → `/home`.
  - `src/App.vue`: runs `serverStore.launchCheck()` at startup (Feature 001, FR-001-03).
  - `src/views/HomePage.vue`: server address field, Connect, result line and the launch banner with Retry; renders `serverStore` state only.
  - `src/stores/server.ts`: `createServerStore()` / `serverStore`: the one stored server (`@capacitor/preferences` keys `server_url`, `server_version`), `connect()` stores only after a successful check, `launchCheck()` re-checks and reports `launchFailure`.
  - `src/services/server.ts`: `checkServer()` → `ServerCheckResult` (`ok` with version, or `invalid_address`, `insecure_http`, `unreachable`, `not_lychee`, `tls_error`); 10 s timeout raced against the request.
  - `src/services/lycheeHttp.ts`: `createLycheeHttp()`: loads `{server}/` once for the session and `XSRF-TOKEN` cookies, then `api/v2` GETs with JSON headers and `X-XSRF-TOKEN` (ADR-001-01). I/O injected (`fetch`, cookie reader) for tests; `nativeDeps` uses `fetch` (CapacitorHttp) and `CapacitorCookies`.
  - `src/utils/serverUrl.ts`: `normalizeServerUrl()` (adds `https://`, drops trailing slashes, rejects non-http(s)).
  - `src/utils/networkPolicy.ts`: `isLocalNetworkHost()`: plain http only for `localhost`, `*.local`, 127/8, 10/8, 172.16/12, 192.168/16 (ADR-001-02).
  - `src/utils/serverMessages.ts`: user-facing text per check result.
  - `src/theme/variables.css`: Ionic colour variables.
- **Native shells**: Capacitor 8 (`capacitor.config.ts`, app ID `com.mlapaglia.lycheemobile`, ADR-0003).
  - `android/`: Gradle project; `android/app/build.gradle` reads `VERSION_NAME`, `VERSION_CODE` and the `ANDROID_KEY*` variables for release builds.
  - `ios/`: Xcode project using Swift Package Manager (`ios/App/CapApp-SPM`).
  - Plugins: `@capacitor/app`, `@capacitor/preferences`; `CapacitorHttp` enabled in `capacitor.config.ts` (ADR-001-01).
  - Plain http: Android `android:usesCleartextTraffic="true"` (gated by `isLocalNetworkHost()`), iOS `NSAppTransportSecurity` → `NSAllowsLocalNetworking` (ADR-001-02).

## Lychee server

- `GET {server}/` (session + `XSRF-TOKEN` cookies) and `GET /api/v2/Version` (Feature 001). Every `api/v2` call needs `Content-Type: application/json` (else 406) and CSRF (else 419). Fixtures from Lychee 7.11.1 in `src/services/__fixtures__/`.

## Tooling and delivery

- **Device runs**: `npm run android|ios` and `npm run android:live|ios:live` (`scripts/live-reload.mjs`: Vite+ dev server in its own process group + `cap run --live-reload`, `adb reverse` on Android, `--external` for the LAN address).
- **Checks**: `vite.config.ts` holds the Oxlint/Oxfmt configuration (copied from Lychee) and the Vitest config; `tsconfig.json` for vue-tsc.
- **CI**: `.github/workflows/ci.yml` (web checks on Node 24/26, Android debug build, iOS simulator build).
- **Releases**: `.github/workflows/release.yml` → `fastlane/Fastfile` lanes `android|ios alpha|production` (ADR-0002, `docs/specs/5-operations/runbook-releases.md`).
- **Reviews**: CodeRabbit (`.coderabbit.yaml`); Dependabot (`.github/dependabot.yml`).
