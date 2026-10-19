# ADR-0001: Capacitor + Ionic Vue

- **Status:** Accepted
- **Date:** 2026-10-19
- **Related features/specs:** repository setup (no feature)
- **Related open questions:** none (decided by the owner when creating the repository)

## Context

Lychee-Mobile is a mobile client for [Lychee](https://github.com/LycheeOrg/Lychee), for iOS and Android. Lychee's web frontend is Vue 3 + TypeScript, built with Vite+ (Vite, Oxlint, Oxfmt, Vitest) and type-checked with vue-tsc. The candidates were React Native (bare or Expo) and Capacitor with a web UI framework.

## Decision

- **Runtime:** Capacitor 8, committing the generated `ios/` (Swift Package Manager) and `android/` projects.
- **UI:** Ionic Vue 9 on Vue 3 + vue-router (`@ionic/vue-router`), TypeScript strict.
- **Toolchain:** the same as LycheeOrg/Lychee: Vite+ (`vp dev`, `vp build`, `vp check` for Oxlint and Oxfmt, `vp test` for Vitest) with the same lint rules and formatting, and `vue-tsc` for type checks.
- **Native capabilities:** Capacitor plugins (`@capacitor/*` first).

## Consequences

### Positive
- Contributors and agents move between Lychee and Lychee-Mobile with the same language, framework, lint rules and commands.
- Lychee's TypeScript API types and Vue patterns can be reused.
- Native projects are plain Xcode and Gradle projects, buildable on free CI runners.

### Negative
- WebView rendering: very large galleries need careful virtualisation to feel native.
- Native features beyond the plugin ecosystem need custom Swift/Kotlin plugins.

## Alternatives Considered

- **React Native with Expo and EAS:** strongest native feel and managed build service, but a different UI framework and toolchain from Lychee.
- **Bare React Native with fastlane:** full native control, most maintenance.

## Security / Privacy Impact

The app stores the server address with `@capacitor/preferences`. Credentials, when added, belong in the platform keychain/keystore, not in preferences.

## Operational Impact

`npx vp build && npx cap sync` before opening or building the native projects. iOS builds need Xcode (macOS); Android builds need JDK 21 and the Android SDK.

## Links

- Related ADRs: ADR-0002, ADR-0003
