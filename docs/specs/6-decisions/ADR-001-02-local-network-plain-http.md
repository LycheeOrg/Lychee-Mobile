# ADR-001-02: Plain http only for local-network servers

- **Status:** Accepted
- **Date:** 2026-10-19
- **Related features/specs:** Feature 001 (docs/specs/4-architecture/features/001-server-connection/spec.md)
- **Related open questions:** Q-001-02

## Context

Many self-hosted Lychee instances run over plain http on a home network. Android blocks cleartext traffic and iOS App Transport Security blocks plain http by default. Credentials (Feature 002) will travel over this connection.

## Decision

- The app accepts plain http only for local-network hosts: `localhost`, `*.local`, and the IPv4 ranges 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. Any other http address is refused before a request is made (`isLocalNetworkHost()` in `src/utils/networkPolicy.ts`, result `insecure_http`).
- **iOS:** `Info.plist` → `NSAppTransportSecurity` → `NSAllowsLocalNetworking = true`, so ATS stays on for everything else.
- **Android:** the network security config can scope cleartext to hostnames but not to IP ranges, so it cannot express this rule. The app sets `android:usesCleartextTraffic="true"` and relies on the app-level check above.

## Consequences

### Positive
- Home servers over http work; public servers must use https.
- iOS keeps ATS enforced at the OS level for non-local hosts.

### Negative
- On Android the rule is enforced only by the app's code, not by the OS: a bug in the check would allow public http.
- `NSAllowsLocalNetworking` behaviour for raw IP addresses: verified 2026-10-19 on the iOS 27.1 simulator, plain http to `192.168.1.164` is allowed (Feature 001, T-001-11).

## Alternatives Considered

- **Any http server with a warning:** works everywhere, but credentials could cross the internet unencrypted and needs a broad ATS exception.
- **https only:** safest, but excludes most home setups.

## Security / Privacy Impact

The check runs on the normalised URL's hostname before any network call; unit tests cover the range boundaries (e.g. 172.15.x and 172.32.x are public).

## Operational Impact

None.

## Links

- Related ADRs: ADR-001-01
