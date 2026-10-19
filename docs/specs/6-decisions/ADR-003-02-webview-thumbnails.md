# ADR-003-02: Thumbnails load in the WebView from the server's URLs

- **Status:** Accepted
- **Date:** 2026-10-19
- **Related features/specs:** Feature 003 (docs/specs/4-architecture/features/003-album-browsing/spec.md)
- **Related open questions:** Q-003-02

## Context

API calls go through native HTTP (ADR-001-01), but images are shown in the WebView. Lychee's v2 image URLs need no cookie in any mode: static `/uploads/...` files by default, `/image/<encrypted path>` with secure links, and `?expires=&signature=` with temporary links (24 h by default). So an `<img>` element can load them directly. Two WebView limits apply:
- Android serves the app from `https://localhost` and blocks `http://` sub-resources (mixed content) by default, which would hide every image from a local-network http server (ADR-001-02).
- iOS's WebView keeps its own cookie store, separate from the native one; irrelevant while image URLs need no cookie.

## Decision

- Photo and album tiles are `<img loading="lazy" decoding="async">` with the URL the API returned, and a `2x` `srcset` entry when the server provides one.
- `capacitor.config.ts` sets `android.allowMixedContent: true`. The app renders only URLs returned by the connected server, which is https or a local-network host (ADR-001-02).
- A failed image shows a placeholder; refreshing the album fetches new URLs (expired temporary links).

## Consequences

### Positive
- Browser caching, lazy loading and decoding with no per-image script work.

### Negative
- On Android the WebView may load http sub-resources from any host; only the app's rule of rendering server URLs keeps that to the connected server.
- A server that protects image files with cookies (not a Lychee setting today) would show placeholders on iOS.

## Alternatives Considered

- **Native HTTP into blob URLs:** no WebView exception and cookies would apply, but binary bodies cross the bridge as base64: slow and memory-heavy for hundreds of thumbnails, and no HTTP cache.
- **Images only from https servers:** breaks home servers.

## Security / Privacy Impact

Mixed content on Android is allowed app-wide; the content shown comes only from the server the user connected to.

## Operational Impact

None.

## Links

- Related ADRs: ADR-001-01, ADR-001-02, ADR-003-01
