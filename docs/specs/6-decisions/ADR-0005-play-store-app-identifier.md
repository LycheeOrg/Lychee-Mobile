# ADR-0005: App identifier matches the Google Play listing

- **Status:** Accepted
- **Date:** 2026-11-06
- **Related features/specs:** repository setup (no feature); supersedes the app identifier of ADR-0004
- **Related open questions:** none (decided by the owner)

## Context

ADR-0004 set the app identifier to `dev.lycheeorg.mobile`. The Google Play Console app has been created with the package `dev.lycheeorg.lychee` instead. A Play listing's package name cannot be changed, and fastlane's `upload_to_play_store` only uploads bundles whose `applicationId` matches the listing, so the release pipeline (ADR-0002) cannot ship to Google Play under the old identifier.

## Decision

- **App identifier:** `dev.lycheeorg.lychee`, used as both the Android application ID and the iOS bundle ID, so the two platforms keep a single identity.
- Changed in `capacitor.config.ts`, the Android `namespace`/`applicationId` (Java sources moved to `dev/lycheeorg/lychee`), `strings.xml`, the iOS `PRODUCT_BUNDLE_IDENTIFIER`, and fastlane's `Appfile`, `Fastfile` and `Matchfile`.
- The display name stays "Lychee". Changing the identifier again needs a new ADR (AGENTS.md).

## Consequences

### Positive
- CI uploads go to the existing Google Play listing.
- Nothing has been published under `dev.lycheeorg.mobile`, so no users need to migrate.

### Negative
- Test installs under `dev.lycheeorg.mobile` are separate apps: they stay on devices until removed, and their settings and stored credentials don't carry over.
- iOS: `dev.lycheeorg.lychee` must be registered in Apple Developer (Identifiers), the App Store Connect app created with it, and `fastlane match appstore` run once for it (owner only) before the iOS lanes can ship.

## Alternatives Considered

- **Keep `dev.lycheeorg.mobile` and create a new Play listing:** the listing that already exists would be abandoned, and its package name can never be reused.
- **`dev.lycheeorg.lychee` on Android only:** iOS has no listing yet, so splitting the identity would gain nothing and would mean per-platform configuration.

## Security / Privacy Impact

None. Android's `FileProvider` authority (`${applicationId}.fileprovider`) and the iOS Keychain items follow the identifier.

## Operational Impact

The release runbook uses the new identifier. The Play service account (`PLAY_STORE_SERVICE_ACCOUNT_JSON`) needs access to the `dev.lycheeorg.lychee` app in Play Console.

## Links

- Related ADRs: ADR-0004 (identifier superseded), ADR-0002 (release pipeline), ADR-0003 (identity history)
