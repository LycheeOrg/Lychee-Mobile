# Lychee-Mobile

An iOS and Android app for [Lychee](https://github.com/LycheeOrg/Lychee), the self-hosted photo management system.

> **Status:** early proof of concept. It lives under a personal account for now and will move to [LycheeOrg](https://github.com/LycheeOrg) once it works.

## Stack

- [Capacitor 8](https://capacitorjs.com) for the iOS and Android shells
- [Ionic Vue 9](https://ionicframework.com/docs/vue/overview) on Vue 3 and TypeScript
- The same toolchain as Lychee's web frontend: [Vite+](https://viteplus.dev) (Vite, Oxlint, Oxfmt, Vitest) and vue-tsc

## Getting started

Requirements: Node.js 24+, plus Xcode (macOS) for iOS and JDK 21 + the Android SDK for Android.

```sh
npm install
npx vp dev                 # run in the browser
npm run android            # build, install and launch on a connected phone/emulator
npm run android:live       # same, with live reload (edits in src/ appear instantly)
npm run ios                # / npm run ios:live for the iOS simulator
npm run open:android       # or: npm run open:ios, to work in the native IDEs
```

`android:live` reaches the dev server through `adb reverse`, so it works over USB or wireless debugging. For a physical iPhone, or Android without adb, add `-- --external` (phone and computer on the same Wi-Fi). Pass `-- --target <device id>` to skip the device prompt. Run `npm run android` (or `ios`) afterwards to install a normal build again.

**Xcode 27:** `npm run ios` and `ios:live` fail after installing the app, because native-run 2.0.3 still opens Simulator.app, which Xcode 27 replaced with Device Hub ([capacitor#8620](https://github.com/ionic-team/capacitor/issues/8620), fixed by [native-run#408](https://github.com/ionic-team/native-run/pull/408), not yet released). Until a Capacitor CLI release includes the fix, run iOS from Xcode: `npm run build && npx cap sync ios && npm run open:ios`, then Run.

Android builds need `JAVA_HOME` pointing at JDK 21 and the Android SDK's `platform-tools` on `PATH`.

The app icons and splash images in `android/` and `ios/` come from the Lychee logo in `assets/lychee-logo.png`. After changing it, run `scripts/generate-app-assets.sh` (needs ImageMagick 7).

## Checks

```sh
npx vp check               # format + lint
npx vp run typecheck       # vue-tsc
npx vp test                # Vitest
npx vp run build
```

CI runs these on every pull request, plus an Android debug build and an iOS simulator build.

## Releases

- Every push to `main` ships an **alpha** to TestFlight and Google Play internal testing.
- Publishing a GitHub release tagged `vX.Y.Z` ships to **production** (App Store review, Google Play production draft).

Setup and procedure: [docs/specs/5-operations/runbook-releases.md](docs/specs/5-operations/runbook-releases.md).

## Contributing

This project uses specification-driven development, like Lychee: read [AGENTS.md](AGENTS.md) and [docs/specs/](docs/specs/0-overview/README.md) before starting a feature. Pull requests are reviewed by CodeRabbit and a maintainer.

## License

[MIT](LICENSE)
