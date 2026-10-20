# Knowledge Map

How the pieces of Lychee-Mobile relate. Update it whenever modules, services, stores, plugins or API contracts appear or change (AGENTS.md).

## Runtime

- **Web app** (`src/`): Vue 3 + Ionic Vue 9, built by Vite+ into `dist/` (ADR-0001).
  - `src/main.ts` creates the app with `IonicVue` and the router, then mounts once the router is ready.
  - `src/router/index.ts`: `@ionic/vue-router` routes: `/` → `/albums`, `/albums/:id`, `/settings` (FR-003-08; `/login` removed, FR-009-04).
  - `src/App.vue`: runs `session.launch()` at startup: server check, then the account, then a silent login when not signed in (FR-001-03, FR-002-03, FR-006-02, FR-009-03); opens `/settings` when a stored password is rejected (FR-006-03, FR-009-03); Android back on `/albums` closes the app (`rootBackHandler`, FR-009-01).
  - `src/views/AlbumsPage.vue` (`/albums`, start page): root sections, gallery password prompt, sign-in and failure messages, hidden-sensitive line; sends a first launch to `/settings`; reloads when `galleryKey()` changed (Feature 003).
  - `src/views/AlbumPage.vue` (`/albums/:id`): sub-albums, photo grid with infinite scroll and pull to refresh, album password prompt, sensitive warning (Feature 003); Select, selection toolbar, Download/Delete footer, delete confirmation, download bar, Android back leaves selection (Feature 007).
  - `src/views/SettingsPage.vue` (`/settings`): server address, username and password (blank keeps the stored one), Save (through `session.save()`, then `/albums` as root), result and failure lines, launch banner with Retry, "Signed in as … / Sign out", OAuth/passkey note (FR-009-04).
  - `src/components/`: `ThumbImage` (server URL with 2x `srcset`, placeholder on error), `AlbumTileGrid`, `PhotoGrid` (tap opens the viewer), `PasswordPrompt`, `GalleryMessage`, `PhotoViewer` (Swiper Zoom + Virtual with `renderExternal`, overlay, paging; full-screen `ion-modal.photo-viewer-modal` opened by `AlbumPage`), `PhotoSlide` (image with zoom container and original swap, video, press-and-hold live clip) (Feature 004, ADR-004-01), `UploadSheet` (global, in `App.vue`) (Feature 005); `AddButton` (the toolbar "+": popover with Upload photos and Create album, upload badge) (Feature 010). `PhotoGrid` also has selection mode (500 ms hold via `pressAndHold`, tap toggles, check mark) and `DownloadBar` shows a download run (Feature 007). `PhotoViewer` has an "i" button opening a sheet `IonModal` (breakpoints 0, 0.5, 1) with `PhotoInfoPanel` (About sections, text only) and `StaticMap` (Lychee's tiles, tap opens the maps app) (Feature 008, ADR-008-01).
  - `src/stores/server.ts`: `createServerStore()` / `serverStore`: the one stored server (`@capacitor/preferences` keys `server_url`, `server_version`), `connect()` stores only after a successful check, `launchCheck()` re-checks and reports `launchFailure`.
  - `src/stores/account.ts`: `createAccountStore()` / `accountStore`: `unknown` / `signed_out` / `signed_in` with the account, sign-in failure, other methods, `passwordRejected`; stores credentials on sign-in, `reauthenticate()` (single flight, no cooldown since FR-009-03; reports its failure), `storedUsername()`, forgets on sign-out and reset (ADR-006-01).
  - `src/services/credentials.ts`: `saveCredentials()`, `loadCredentials()` (server must match; unreadable → deleted), `forgetCredentials()` over `@aparajita/capacitor-secure-storage` (sync off, Keychain `afterFirstUnlockThisDeviceOnly`) (Feature 006).
  - `src/stores/session.ts`: `createSession()` / `session`: `launch()` (server check, account, silent login unless signed in), `whenLaunched()`, and `save()` (FR-009-04: server check, reset on a new server, then sign in with the typed or stored password, or continue as guest; returns a `SaveOutcome`).
  - `src/stores/galleryContext.ts`: `currentGalleryContext()` (gallery for the stored server, signed-in flag, `recoverSession()` on 401: silent login, else account refresh) and `galleryKey()`.
  - `src/stores/albumList.ts`: `createAlbumList()`: version gate, root and `Gallery::Init`, gallery unlock, sign-in handoff, `view()` with hidden sensitive albums.
  - `src/stores/albumPage.ts`: `createAlbumPage()`: head, sub-album pages then photo pages, load more with retry, album unlock, sensitive warning remembered in `acceptedSensitiveAlbums`; stale pages dropped by a generation counter. Owns a `PhotoSelection` (cleared on every load) and `deleteSelected()` (401 recovery, local removal, next page recomputed and duplicates dropped, reload on timeout) (Feature 007).
  - `src/stores/photoSelection.ts`: `createPhotoSelection()` (start, toggle, clear, ids in selection order); `src/stores/photoRights.ts`: `photoActionsFor()` (Download by `can_download`; Delete by `can_delete` in regular albums and Unsorted only) (Feature 007).
  - `src/stores/addMenu.ts`: `addMenuForRoot()`, `addMenuFor()`, `hasItems()`, `titleProblem()`, `createAlbumIn()` (401 recovery), `promptForAlbum()` (title dialog loop) (Feature 010).
  - `src/stores/photoAlbums.ts`: `createPhotoAlbums()` (albums per photo for the info panel, cached, 401 recovery) (Feature 008).
  - `src/stores/downloadRun.ts`: `createDownloadRun()` / `downloadRun` (one photo at a time, progress, failures, Retry failed, append, stop on a second 401 or a denied permission) (Feature 007).
  - `src/stores/uploadQueue.ts`: `createUploadQueue()` / `uploadQueue` (one file at a time, retry, clear, `finishedRuns`/`lastDoneAlbums`, stop on 401), `uploadTargetFor()`; `src/stores/uploadSheet.ts` (sheet open state).
  - `src/stores/sensitive.ts`: `sensitiveDisplay` (server NSFW settings, Show), `visibleSections()`, `visibleAlbums()`.
  - `src/services/auth.ts`: `signIn()` (`Auth::login` without `remember_me`, then `Auth::user`), `readAccount()`, `signOut()` (`Auth::logout`, then clears the server's cookies), `readOtherMethods()` (`Auth::config`); 10 s each.
  - `src/services/gallery.ts`: `createGallery()` / `galleryFor(server)`: v2 `Albums`, `Gallery::Init`, `Album::head`, `Album::albums`, `Album::photos`, `Album::unlock`, `Gallery::unlock` on one session (ADR-003-01); `deletePhotos()` (`DELETE Photo`, 30 s) and `downloadRequest()` (`Zip` URL and `Cookie` header) (Feature 007); `photoAlbums()` (`GET Photo/{id}/albums`, 404 → `unsupported`) and `mapProvider()` (`Map::provider`, cached) (Feature 008); `createAlbum()` (`POST Album`, 409 retried, Feature 010); failures mapped from status and Lychee's `exception`; `MIN_BROWSING_VERSION` 7.1.0.
  - `src/services/photoDetails.ts`: `parsePhotoDetails()` (`preformatted`/`precomputed` → `PhotoDetails` on every `PhotoTile`) and `htmlToText()` (inert `DOMParser`, NFR-008-02) (Feature 008).
  - `src/services/galleryParsers.ts`: raw JSON → `RootAlbums`, `AlbumHead`, `Page<AlbumTile>` / `Page<PhotoTile>` (with `total`; photos carry all size `variants` and `liveUrl`), `GallerySettings` (NFR-003-03, DO-004-01).
  - `src/services/download.ts`: `downloadFileOf()` (extension from the original URL, else `type`; name; photo or video), `transferFailure()`; `src/services/downloadDevice.ts`: file-transfer into `cache/downloads/` and Filesystem cleanup; `src/services/librarySaver.ts`: iOS `Media.savePhoto/saveVideo`, Android `OriginalMedia.saveToGallery` (Feature 007, ADR-007-01).
  - `src/services/upload.ts`: `readChunkSize()` (`Gallery::getUploadLimits`, ≤ 4 MiB), `uploadFile()` (chunked multipart `POST Photo`, `uuid_name` echo, result mapping) (Feature 005).
  - `src/services/fileChunks.ts`: `rangeChunks()` (iOS), `streamChunks()` (Android), `chunksOfFile()` over `convertFileSrc`.
  - `src/services/picker.ts`: `pickForUpload()`: Android `ACCESS_MEDIA_LOCATION` gate and `OriginalMedia.pick()`, iOS `FilePicker.pickMedia({ skipTranscoding })`.
  - `src/services/originalMedia.ts`: `OriginalMedia` plugin binding; `withOriginal()` (Android copy, release, `withoutLocation` marking).
  - `src/services/timeout.ts`: `withTimeout()` races work against a timer and aborts its signal; used by `checkServer()` and the auth service.
  - `src/services/server.ts`: `checkServer()` → `ServerCheckResult` (`ok` with version, or `invalid_address`, `insecure_http`, `unreachable`, `not_lychee`, `tls_error`); 10 s timeout raced against the request.
  - `src/services/lycheeHttp.ts`: `createLycheeHttp()`: loads `{server}/` once for the session and `XSRF-TOKEN` cookies, then `api/v2` GETs (with query parameters), JSON POSTs and DELETEs with JSON headers and `X-XSRF-TOKEN` (ADR-001-01); `apiUrl()` and `cookieHeader()` for requests sent by file-transfer (Feature 007); a 419 restarts the session and retries once (FR-003-07); `clearCookies()` forgets the server's cookies. I/O injected (`fetch`, cookie reader and clearer) for tests; `nativeDeps` uses `fetch` (CapacitorHttp) and `CapacitorCookies`.
  - `src/utils/serverUrl.ts`: `normalizeServerUrl()` (adds `https://`, drops trailing slashes, rejects non-http(s)).
  - `src/utils/networkPolicy.ts`: `isLocalNetworkHost()`: plain http only for `localhost`, `*.local`, 127/8, 10/8, 172.16/12, 192.168/16 (ADR-001-02).
  - `src/utils/serverMessages.ts`: user-facing text per check result.
  - `src/utils/accountMessages.ts`: sign-in failure text and the other-methods note.
  - `src/utils/galleryMessages.ts`: browsing text (failures, sections, unlock, sign-in, sensitive).
  - `src/utils/version.ts`: `meetsMinimumVersion()`.
  - `src/utils/uploadMessages.ts`: upload results, entry status, picker failures.
  - `src/utils/backButton.ts`: `rootBackHandler()` (FR-009-01).
  - `src/utils/albumMessages.ts`: title problems and create failures (Feature 010).
  - `src/utils/photoInfo.ts`: `mapTiles()` (Web Mercator, 5 × 3 tiles), `mapsUrl()` (`geo:`, `maps://`), `cameraLine()` (Feature 008).
  - `src/utils/photoActionMessages.ts`: selection title, delete confirmation and failures, download progress and summary (Feature 007).
  - `src/utils/photoVariant.ts` (`displayVariant()`, `zoomVariant()`, `videoSource()`, `videoPoster()`), `viewerSlides.ts` (`counterText()`, `shouldLoadMore()`), `pressAndHold.ts`, `singleTap.ts` (Feature 004).
  - `src/theme/variables.css`: Ionic colour variables.
- **Native shells**: Capacitor 8 (`capacitor.config.ts`, app ID `com.mlapaglia.lycheemobile`, ADR-0003).
  - `android/`: Gradle project; `android/app/build.gradle` reads `VERSION_NAME`, `VERSION_CODE` and the `ANDROID_KEY*` variables for release builds.
  - `ios/`: Xcode project using Swift Package Manager (`ios/App/CapApp-SPM`).
  - Libraries beyond the starter: `swiper` `14.3.0` (ADR-004-01), `@capawesome/capacitor-file-picker` `8.1.0` (ADR-005-01), `@aparajita/capacitor-secure-storage` `8.0.1` (ADR-006-01), `@capacitor/file-transfer` `2.0.6`, `@capacitor-community/media` `9.1.0` (iOS only), `@capacitor/filesystem` `8.1.5` (ADR-007-01), all pinned.
  - `capacitor.config.ts`: `loggingBehavior: "none"` (NFR-006-01).
  - App-local Android plugin `OriginalMediaPlugin.java` (registered in `MainActivity`): `pick()` (system picker with the undocumented `REQUEST_LOCATION_METADATA_ACCESS` and `ACCEPT_ORIGINAL_MEDIA_FORMAT`), `prepare()` (copy via `setRequireOriginal`, fallback, location check), `release()` (Feature 005); `saveToGallery()` (`MediaStore` into `Pictures/Lychee` / `Movies/Lychee`, legacy public folder and `storage` permission alias on API 24–28) (Feature 007).
  - Android permissions `ACCESS_MEDIA_LOCATION` (ADR-005-01), `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO`/`READ_EXTERNAL_STORAGE` ≤ 32 for upload names (`OriginalMedia.requestNameAccess()`, ADR-009-01); `WRITE_EXTERNAL_STORAGE` with `maxSdkVersion="28"`, iOS `NSPhotoLibraryAddUsageDescription` (ADR-007-01).
  - Plugins: `@capacitor/app`, `@capacitor/preferences`; `CapacitorHttp` enabled in `capacitor.config.ts` (ADR-001-01).
  - Plain http: Android `android:usesCleartextTraffic="true"` (gated by `isLocalNetworkHost()`), iOS `NSAppTransportSecurity` → `NSAllowsLocalNetworking` (ADR-001-02); Android `allowMixedContent` for http thumbnails in the WebView (ADR-003-02).

## Lychee server

- `GET {server}/` (session + `XSRF-TOKEN` cookies) and `GET /api/v2/Version` (Feature 001); `POST Auth::login` (`remember_me`, 10 per hour), `GET Auth::user`, `POST Auth::logout`, `GET Auth::config` (Feature 002); `GET Albums`, `Gallery::Init`, `Album::head`, `Album::albums`, `Album::photos`, `POST Album::unlock`, `Gallery::unlock` (Feature 003, Lychee 7.1.0+); `Gallery::getUploadLimits`, multipart `POST Photo` (Feature 005); `DELETE Photo` (`photo_ids`, `from_id`) and `GET Zip?photo_ids=<one>&variant=ORIGINAL` (the file itself, fetched by file-transfer with the `Cookie` header) (Feature 007); `GET Photo/{id}/albums` (7.4.0+) and `Map::provider`, plus `Gallery::Init.is_exif_disabled` and `Album::head.config.is_map_accessible` for the info panel; map tiles from the configured provider (Feature 008). `POST Album` (`title`, `parent_id`, returns the ID) with `rights.can_edit` from `Albums` and `Album::head` (Feature 010). Image URLs need no cookie (static `/uploads`, secure or signed `/image` links). Every `api/v2` call needs `Content-Type: application/json` (else 406) and CSRF (else 419). Fixtures from Lychee 7.11.1 in `src/services/__fixtures__/`.

## Tooling and delivery

- **Device runs**: `npm run android|ios` and `npm run android:live|ios:live` (`scripts/live-reload.mjs`: Vite+ dev server in its own process group + `cap run --live-reload`, `adb reverse` on Android, `--external` for the LAN address).
- **Checks**: `vite.config.ts` holds the Oxlint/Oxfmt configuration (copied from Lychee) and the Vitest config; `tsconfig.json` for vue-tsc.
- **CI**: `.github/workflows/ci.yml` (web checks on Node 24/26, Android debug build, iOS simulator build).
- **Releases**: `.github/workflows/release.yml` → `fastlane/Fastfile` lanes `android|ios alpha|production` (ADR-0002, `docs/specs/5-operations/runbook-releases.md`).
- **Reviews**: CodeRabbit (`.coderabbit.yaml`); Dependabot (`.github/dependabot.yml`).
