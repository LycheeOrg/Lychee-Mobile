# Decisions

We track significant choices as Architecture Decision Records (ADRs). Each ADR is immutable; superseded entries should point at their replacements.

Numbering convention (same as LycheeOrg/Lychee): a decision raised by a feature uses `ADR-<NNN>-<YY>`, where `<NNN>` is the feature and `<YY>` a two-digit sequence within it (`ADR-004-01`, `ADR-004-02`, …), so parallel features cannot collide. Decisions that set up the repository itself, made before any feature, use global `ADR-XXXX` numbers.

| ADR | Status   | Summary                            |
|-----|----------|------------------------------------|
| [ADR-0001](ADR-0001-capacitor-ionic-vue.md) | Accepted | Capacitor + Ionic Vue, with Lychee's frontend toolchain (Vite+, Oxlint, Oxfmt, Vitest, vue-tsc) |
| [ADR-0002](ADR-0002-release-pipeline.md) | Accepted | fastlane on GitHub Actions: alpha to TestFlight and Google Play internal testing on every push to `main`, production on published GitHub releases |
| [ADR-0003](ADR-0003-proof-of-concept-identity.md) | Accepted | Proof of concept under a personal account: public MIT repository, app ID `com.mlapaglia.lycheemobile`, moved to LycheeOrg after the PoC |
| [ADR-001-01](ADR-001-01-native-http-transport.md) | Accepted | CapacitorHttp with the native cookie store; Lychee calls load `{server}/` for the session and `XSRF-TOKEN`, then send JSON headers and `X-XSRF-TOKEN` |
| [ADR-001-02](ADR-001-02-local-network-plain-http.md) | Accepted | Plain http only for local-network hosts, enforced by the app; iOS `NSAllowsLocalNetworking`, Android cleartext allowed at OS level |
| [ADR-002-01](ADR-002-01-session-cookie-sign-in.md) | Accepted | Stay signed in through Lychee's session and remember cookies in the native cookie store; no stored password or API token |
| [ADR-003-01](ADR-003-01-v2-api-for-browsing.md) | Accepted | Browse through the v2 paginated API (Lychee 7.1.0+); v3 struct-of-arrays is off by default |
| [ADR-003-02](ADR-003-02-webview-thumbnails.md) | Accepted | Thumbnails are `<img>` elements with the server's URLs; Android allows mixed content for local http servers |
| [ADR-004-01](ADR-004-01-swiper-photo-viewer.md) | Accepted | Swiper 14.3.0 (pinned) with Zoom and Virtual for the photo viewer's swipe and zoom |
