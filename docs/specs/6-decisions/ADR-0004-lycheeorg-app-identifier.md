# ADR-0004: LycheeOrg app identifier

- **Status:** Accepted
- **Date:** 2026-10-20
- **Related features/specs:** repository setup (no feature); supersedes the app identifier of ADR-0003
- **Related open questions:** none (decided by the owner after the move to LycheeOrg)

## Context

ADR-0003 gave the proof of concept a personal identifier, `com.mlapaglia.lycheemobile`, to keep LycheeOrg's name out of store identities until the organisation agreed. The repository has since moved to `LycheeOrg/Lychee-Mobile` (ADR-0003 Update), and the app has not been published to either store, so the identifier can still change without stranding users or listings.

## Decision

- **App identifier:** `dev.lycheeorg.mobile` (iOS bundle ID and Android application ID), the reverse of LycheeOrg's domain `lycheeorg.dev`. Chosen by the owner ("use lycheeorg"); the form is the one ADR-0003 listed as the LycheeOrg-style alternative.
- Changed in `capacitor.config.ts`, the Android `namespace`/`applicationId` (Java sources moved to `dev/lycheeorg/mobile`), `strings.xml`, the iOS `PRODUCT_BUNDLE_IDENTIFIER`, and fastlane's `Appfile`, `Fastfile` and `Matchfile`.
- The display name stays "Lychee". Changing the identifier again needs a new ADR (AGENTS.md).

## Consequences

### Positive
- The store identity matches the organisation that now owns the code.
- No migration for users: nothing was published yet.

### Negative
- Test installs under the old identifier are separate apps: they stay on devices until removed, and their settings and stored credentials don't carry over.
- Before the release workflow can ship again: register `dev.lycheeorg.mobile` in Apple Developer (Identifiers) and create the App Store Connect app, run `fastlane match appstore` once for the new identifier (owner only), and create the Google Play app with the new package; the Play upload key and the Play listing for the old package are not reused. Until then the alpha lanes on `main` fail.
- Which developer accounts hold the listings (the owner's or LycheeOrg's) is still open (ADR-0003 migration checklist).

## Alternatives Considered

- **Keep `com.mlapaglia.lycheemobile` until the first store release:** no setup now, but the identifier would be fixed forever once published.
- **`org.lycheeorg.mobile`:** LycheeOrg's site is `lycheeorg.dev`, so `dev.lycheeorg` is the matching reverse domain.

## Security / Privacy Impact

None. Android's `FileProvider` authority and the iOS Keychain items follow the identifier; nothing carries over from the old app.

## Operational Impact

The release runbook's store setup uses the new identifier; secrets that embed the identifier (none in this repository) would need updating.

## Links

- Related ADRs: ADR-0003 (identifier superseded), ADR-0002 (release pipeline)
