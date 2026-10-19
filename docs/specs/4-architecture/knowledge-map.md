# Knowledge Map

How the pieces of Lychee-Mobile relate. Update it whenever modules, services, stores, plugins or API contracts appear or change (AGENTS.md).

## Runtime

- **Web app** (`src/`): Vue 3 + Ionic Vue 9, built by Vite+ into `dist/` (ADR-0001).
  - `src/main.ts` creates the app with `IonicVue` and the router, then mounts once the router is ready.
  - `src/router/index.ts`: `@ionic/vue-router` routes; `/` → `/home`.
  - `src/views/HomePage.vue`: server address field; saves the normalised address under the `server_url` key of `@capacitor/preferences`.
  - `src/utils/serverUrl.ts`: `normalizeServerUrl()` (adds `https://`, drops trailing slashes, rejects non-http(s)); tested in `serverUrl.test.ts`.
  - `src/theme/variables.css`: Ionic colour variables.
- **Native shells**: Capacitor 8 (`capacitor.config.ts`, app ID `com.mlapaglia.lycheemobile`, ADR-0003).
  - `android/`: Gradle project; `android/app/build.gradle` reads `VERSION_NAME`, `VERSION_CODE` and the `ANDROID_KEY*` variables for release builds.
  - `ios/`: Xcode project using Swift Package Manager (`ios/App/CapApp-SPM`).
  - Plugins: `@capacitor/app`, `@capacitor/preferences`.

## Lychee server

- Not called yet. Feature 001 introduces `src/services/` and the first API contract.

## Tooling and delivery

- **Checks**: `vite.config.ts` holds the Oxlint/Oxfmt configuration (copied from Lychee) and the Vitest config; `tsconfig.json` for vue-tsc.
- **CI**: `.github/workflows/ci.yml` (web checks on Node 24/26, Android debug build, iOS simulator build).
- **Releases**: `.github/workflows/release.yml` → `fastlane/Fastfile` lanes `android|ios alpha|production` (ADR-0002, `docs/specs/5-operations/runbook-releases.md`).
- **Reviews**: CodeRabbit (`.coderabbit.yaml`); Dependabot (`.github/dependabot.yml`).
