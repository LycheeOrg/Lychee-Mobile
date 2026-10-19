# ADR-0002: Release pipeline

- **Status:** Accepted
- **Date:** 2026-10-19
- **Related features/specs:** repository setup (no feature); runbook `docs/specs/5-operations/runbook-releases.md`
- **Related open questions:** none (decided by the owner when creating the repository)

## Context

The owner wants automated alpha builds for testers and automated official releases, for iOS and Android, without depending on a paid build service. The repository is public, so GitHub Actions minutes (Linux and macOS) are free.

## Decision

- **Tooling:** fastlane (`fastlane/Fastfile`, Ruby via `Gemfile`), run by `.github/workflows/release.yml`; Android on `ubuntu-latest`, iOS on `macos-latest`.
- **Alpha:** every push to `main` builds a signed release and uploads it to **TestFlight** (iOS) and the **Google Play internal testing** track (Android).
- **Production:** publishing a GitHub release tagged `vX.Y.Z` builds the same way and uploads to **App Store Connect** (submitted for review, released manually after approval) and the **Google Play production** track (as a draft, rolled out from the console). The job runs in the GitHub environment `production`, which should require a reviewer.
- **Versions:** the marketing version comes from the release tag (or `package.json` for alpha); the build number is the workflow run number, shared by both tracks so it only grows.
- **Signing:** iOS through `fastlane match` (certificates in a private repository, encrypted) and an App Store Connect API key; Android through an upload keystore. All of it from repository/environment secrets; nothing signing-related is committed.
- **Missing secrets:** each release job checks its secrets first and skips with a notice, so the workflow stays green until the stores are set up.

## Consequences

### Positive
- No build service fees; the pipeline is plain YAML and Ruby in the repository.
- Alpha and production use the same lanes, so a production build is a build testers already ran.

### Negative
- macOS runners are slower than Linux; iOS builds take several minutes.
- `match` needs a second (private) repository for certificates.
- First uploads are manual on both stores (Play requires the first AAB through the console; App Store Connect needs the app record).

## Alternatives Considered

- **Ionic Appflow:** managed builds and deploys for Capacitor, paid.
- **Expo EAS:** not applicable without React Native/Expo.
- **Firebase App Distribution for alpha:** no store setup for Android, but iOS needs registered devices and alpha would differ from production.

## Security / Privacy Impact

Secrets live only in GitHub (repository or environment secrets). `match` encrypts certificates with `MATCH_PASSWORD`. Workflows that use secrets never run for pull requests from forks.

## Operational Impact

See `docs/specs/5-operations/runbook-releases.md` for the one-time store and secret setup and for cutting a release.

## Links

- Related ADRs: ADR-0001, ADR-0003
