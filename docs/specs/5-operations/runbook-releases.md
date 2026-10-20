# Runbook: Releases

How alpha and production builds reach testers and the stores (ADR-0002). Everything signing-related lives in GitHub secrets; nothing is committed.

## Tracks

| Trigger | Track | iOS | Android |
|---------|-------|-----|---------|
| Push to `main` (code changes) | `alpha` | TestFlight | Google Play internal testing |
| GitHub release published, tag `vX.Y.Z` | `production` | App Store Connect, submitted for review, released manually after approval | Google Play production track, as a draft rolled out from the console |
| Manual "Run workflow" | `alpha` | same as alpha | same as alpha |

Versions: the marketing version is the tag (`v1.2.3` → `1.2.3`) for production and `package.json` `version` for alpha; the build number / version code is the run number of `release.yml`, shared by both tracks.

Until the secrets below exist, each release job prints a notice and skips, so the workflow stays green.

## One-time setup

### GitHub
1. Settings → Environments: `alpha` and `production` are created on the first run; give `production` a required reviewer (the owner).
2. Add the secrets below as repository secrets (or per environment).
3. Commit `Gemfile.lock` after the first `bundle install` (Ruby ≥ 3.2) so CI resolves the same fastlane version.

### Apple (iOS)
1. Apple Developer Program membership; note the **Team ID** → secret `APPLE_TEAM_ID`.
2. App Store Connect → Apps → New App with bundle ID `com.mlapaglia.lycheemobile` (register the identifier first under Certificates, Identifiers & Profiles).
3. App Store Connect → Users and Access → Integrations → App Store Connect API → new key with the **App Manager** role:
   - `ASC_KEY_ID` (Key ID), `ASC_ISSUER_ID` (Issuer ID)
   - `ASC_KEY_P8_BASE64`: `base64 -i AuthKey_XXXX.p8 | pbcopy`
4. Signing with fastlane match:
   - Create a **private** repository for certificates, e.g. `mlapaglia/Lychee-Mobile-certs`; `MATCH_GIT_URL` = its HTTPS URL.
   - `MATCH_GIT_BASIC_AUTHORIZATION`: `printf 'mlapaglia:<fine-grained PAT with contents read/write on that repo>' | base64`
   - `MATCH_PASSWORD`: a new passphrase that encrypts the certificates.
   - Once, on a Mac with Ruby ≥ 3.2: `bundle install && MATCH_GIT_URL=… bundle exec fastlane match appstore` (creates the distribution certificate and profile and pushes them, encrypted). This is a write operation: owner only.
5. TestFlight → Internal Testing: create a group and add testers.

### Google (Android)
1. Google Play Console developer account; create the app with package `com.mlapaglia.lycheemobile`.
2. Upload keystore (keep a backup outside the repository):
   ```sh
   keytool -genkeypair -v -keystore upload.keystore -alias upload -keyalg RSA -keysize 4096 -validity 10000
   ```
   - `ANDROID_KEYSTORE_BASE64`: `base64 -i upload.keystore | pbcopy`
   - `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`upload`), `ANDROID_KEY_PASSWORD`
3. Enrol in Play App Signing (Google holds the app signing key; the keystore above is the upload key).
4. Google Cloud: service account with access to the Play Console app (Users and permissions → invite the service account, release permissions), JSON key → `PLAY_STORE_SERVICE_ACCOUNT_JSON` (the whole file content).
5. **First upload is manual:** build `bundleRelease` locally or download the CI artifact, upload it once to Internal testing in the console; afterwards fastlane takes over.
6. Internal testing → Testers: add the tester list.

## Cutting a production release

1. Make sure `main` is green and the alpha of that commit was tested.
2. Bump `version` in `package.json` on `main` (e.g. `1.2.0`), merge.
3. GitHub → Releases → Draft a new release, tag `v1.2.0` on `main`, publish.
4. Approve the `production` environment when asked.
5. App Store Connect: after review approval, release the version. Play Console: review the draft on the production track and roll it out.

Before the first production release that includes Feature 009: Play Console → App content → Photo and video permissions: declare why the app uses `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` (keeping the camera's file names on photos uploaded to the user's Lychee gallery, ADR-009-01).

## Troubleshooting

- **"skipping" notice:** a required secret is empty (see the `CONFIGURED` expressions in `release.yml`).
- **Build number already used:** both stores reject reused numbers; re-run creates a new run number, never re-use a run.
- **match fails to decrypt:** `MATCH_PASSWORD` differs from the one used to create the certificates.
