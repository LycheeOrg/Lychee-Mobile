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
npx vp run build && npx cap sync
npm run open:android       # or: npm run open:ios
```

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
