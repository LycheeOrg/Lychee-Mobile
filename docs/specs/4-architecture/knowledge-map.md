# Knowledge Map

How the pieces of Lychee-Mobile relate. Update it whenever modules, services, stores, plugins or API contracts appear or change (AGENTS.md).

## Runtime

- **Web app** (`src/`): Vue 3 + Ionic Vue 9, built by Vite+ into `dist/` (ADR-0001).
  - `src/main.ts` creates the app with `IonicVue` and the router, then mounts once the router is ready.
  - `src/router/index.ts`: `@ionic/vue-router` routes: `/` → `/albums`, `/albums/:id`, `/settings`, `/login` (FR-003-08).
  - `src/App.vue`: runs `session.launch()` at startup: server check, then the account (FR-001-03, FR-002-03).
  - `src/views/AlbumsPage.vue` (`/albums`, start page): root sections, gallery password prompt, sign-in and failure messages, hidden-sensitive line; sends a first launch to `/settings`; reloads when `galleryKey()` changed (Feature 003).
  - `src/views/AlbumPage.vue` (`/albums/:id`): sub-albums, photo grid with infinite scroll and pull to refresh, album password prompt, sensitive warning (Feature 003).
  - `src/views/SettingsPage.vue` (`/settings`, formerly `HomePage.vue`): server address field, Connect (through `session.connect()`, then `/login` or `/albums`), result line, launch banner with Retry, account line with Sign in / Sign out.
  - `src/components/`: `ThumbImage` (server URL with 2x `srcset`, placeholder on error), `AlbumTileGrid`, `PhotoGrid` (tap opens the viewer), `PasswordPrompt`, `GalleryMessage`, `PhotoViewer` (Swiper Zoom + Virtual with `renderExternal`, overlay, paging; full-screen `ion-modal.photo-viewer-modal` opened by `AlbumPage`), `PhotoSlide` (image with zoom container and original swap, video, press-and-hold live clip) (Feature 004, ADR-004-01).
  - `src/views/LoginPage.vue` (`/login`): username, password, Sign in, Continue as guest, note for OAuth/passkey servers (Feature 002).
  - `src/stores/server.ts`: `createServerStore()` / `serverStore`: the one stored server (`@capacitor/preferences` keys `server_url`, `server_version`), `connect()` stores only after a successful check, `launchCheck()` re-checks and reports `launchFailure`.
  - `src/stores/account.ts`: `createAccountStore()` / `accountStore`: `unknown` / `signed_out` / `signed_in` with the account, sign-in failure, other methods; nothing persisted (ADR-002-01).
  - `src/stores/session.ts`: `createSession()` / `session`: `launch()` (server check, then account), `whenLaunched()`, and `connect()` (reset on a new server, returns `sign_in`, `albums` or `stay`).
  - `src/stores/galleryContext.ts`: `currentGalleryContext()` (gallery for the stored server, signed-in flag, account refresh on 401) and `galleryKey()`.
  - `src/stores/albumList.ts`: `createAlbumList()`: version gate, root and `Gallery::Init`, gallery unlock, sign-in handoff, `view()` with hidden sensitive albums.
  - `src/stores/albumPage.ts`: `createAlbumPage()`: head, sub-album pages then photo pages, load more with retry, album unlock, sensitive warning remembered in `acceptedSensitiveAlbums`; stale pages dropped by a generation counter.
  - `src/stores/sensitive.ts`: `sensitiveDisplay` (server NSFW settings, Show), `visibleSections()`, `visibleAlbums()`.
  - `src/services/auth.ts`: `signIn()` (`Auth::login` with `remember_me`, then `Auth::user`), `readAccount()`, `signOut()` (`Auth::logout`, then clears the server's cookies), `readOtherMethods()` (`Auth::config`); 10 s each.
  - `src/services/gallery.ts`: `createGallery()` / `galleryFor(server)`: v2 `Albums`, `Gallery::Init`, `Album::head`, `Album::albums`, `Album::photos`, `Album::unlock`, `Gallery::unlock` on one session (ADR-003-01); failures mapped from status and Lychee's `exception`; `MIN_BROWSING_VERSION` 7.1.0.
  - `src/services/galleryParsers.ts`: raw JSON → `RootAlbums`, `AlbumHead`, `Page<AlbumTile>` / `Page<PhotoTile>` (with `total`; photos carry all size `variants` and `liveUrl`), `GallerySettings` (NFR-003-03, DO-004-01).
  - `src/services/timeout.ts`: `withTimeout()` races work against a timer and aborts its signal; used by `checkServer()` and the auth service.
  - `src/services/server.ts`: `checkServer()` → `ServerCheckResult` (`ok` with version, or `invalid_address`, `insecure_http`, `unreachable`, `not_lychee`, `tls_error`); 10 s timeout raced against the request.
  - `src/services/lycheeHttp.ts`: `createLycheeHttp()`: loads `{server}/` once for the session and `XSRF-TOKEN` cookies, then `api/v2` GETs (with query parameters) and JSON POSTs with JSON headers and `X-XSRF-TOKEN` (ADR-001-01); a 419 restarts the session and retries once (FR-003-07); `clearCookies()` forgets the server's cookies. I/O injected (`fetch`, cookie reader and clearer) for tests; `nativeDeps` uses `fetch` (CapacitorHttp) and `CapacitorCookies`.
  - `src/utils/serverUrl.ts`: `normalizeServerUrl()` (adds `https://`, drops trailing slashes, rejects non-http(s)).
  - `src/utils/networkPolicy.ts`: `isLocalNetworkHost()`: plain http only for `localhost`, `*.local`, 127/8, 10/8, 172.16/12, 192.168/16 (ADR-001-02).
  - `src/utils/serverMessages.ts`: user-facing text per check result.
  - `src/utils/accountMessages.ts`: sign-in failure text and the other-methods note.
  - `src/utils/galleryMessages.ts`: browsing text (failures, sections, unlock, sign-in, sensitive).
  - `src/utils/version.ts`: `meetsMinimumVersion()`.
  - `src/utils/photoVariant.ts` (`displayVariant()`, `zoomVariant()`, `videoSource()`, `videoPoster()`), `viewerSlides.ts` (`counterText()`, `shouldLoadMore()`), `pressAndHold.ts`, `singleTap.ts` (Feature 004).
  - `src/theme/variables.css`: Ionic colour variables.
- **Native shells**: Capacitor 8 (`capacitor.config.ts`, app ID `com.mlapaglia.lycheemobile`, ADR-0003).
  - `android/`: Gradle project; `android/app/build.gradle` reads `VERSION_NAME`, `VERSION_CODE` and the `ANDROID_KEY*` variables for release builds.
  - `ios/`: Xcode project using Swift Package Manager (`ios/App/CapApp-SPM`).
  - Libraries beyond the starter: `swiper` `14.3.0`, pinned (ADR-004-01).
  - Plugins: `@capacitor/app`, `@capacitor/preferences`; `CapacitorHttp` enabled in `capacitor.config.ts` (ADR-001-01).
  - Plain http: Android `android:usesCleartextTraffic="true"` (gated by `isLocalNetworkHost()`), iOS `NSAppTransportSecurity` → `NSAllowsLocalNetworking` (ADR-001-02); Android `allowMixedContent` for http thumbnails in the WebView (ADR-003-02).

## Lychee server

- `GET {server}/` (session + `XSRF-TOKEN` cookies) and `GET /api/v2/Version` (Feature 001); `POST Auth::login` (`remember_me`, 10 per hour), `GET Auth::user`, `POST Auth::logout`, `GET Auth::config` (Feature 002); `GET Albums`, `Gallery::Init`, `Album::head`, `Album::albums`, `Album::photos`, `POST Album::unlock`, `Gallery::unlock` (Feature 003, Lychee 7.1.0+). Image URLs need no cookie (static `/uploads`, secure or signed `/image` links). Every `api/v2` call needs `Content-Type: application/json` (else 406) and CSRF (else 419). Fixtures from Lychee 7.11.1 in `src/services/__fixtures__/`.

## Tooling and delivery

- **Device runs**: `npm run android|ios` and `npm run android:live|ios:live` (`scripts/live-reload.mjs`: Vite+ dev server in its own process group + `cap run --live-reload`, `adb reverse` on Android, `--external` for the LAN address).
- **Checks**: `vite.config.ts` holds the Oxlint/Oxfmt configuration (copied from Lychee) and the Vitest config; `tsconfig.json` for vue-tsc.
- **CI**: `.github/workflows/ci.yml` (web checks on Node 24/26, Android debug build, iOS simulator build).
- **Releases**: `.github/workflows/release.yml` → `fastlane/Fastfile` lanes `android|ios alpha|production` (ADR-0002, `docs/specs/5-operations/runbook-releases.md`).
- **Reviews**: CodeRabbit (`.coderabbit.yaml`); Dependabot (`.github/dependabot.yml`).
