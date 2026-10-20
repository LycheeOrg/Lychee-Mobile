# ADR-008-01: Static location map from Lychee's tile provider

- **Status:** Accepted
- **Date:** 2026-10-20
- **Related features/specs:** Feature 008 (docs/specs/4-architecture/features/008-photo-info-panel/spec.md)
- **Related open questions:** Q-008-01

## Context

The photo info panel shows where a photo was taken, like Lychee's web sidebar, which uses Leaflet with tiles from the provider configured on the server (`GET /api/v2/Map::provider`: `layer` URL template and attribution; OpenStreetMap.org, .de, .fr or RRZE). The app has no map library and the panel is a draggable sheet, whose drag would compete with a pannable map. Until now the app only talked to the user's own Lychee server.

## Decision

- No map library. The panel draws a static map: the tiles around the photo at zoom 15 (five columns, three rows, 256 px each) from the `layer` template of `Map::provider` (`{s}` → `a`, `{z}`, `{x}`, `{y}`; surrounding whitespace trimmed), positioned with CSS so the photo's point sits under a marker at the centre. Tile maths is the standard Web Mercator formula.
- The provider's attribution is shown as plain text (tags stripped, NFR-008-02).
- The map shows only when the album's `config.is_map_accessible` is true and the photo carries decimal coordinates (absent when the server hides GPS).
- Tapping the map opens the phone's maps app: `geo:` on Android, `maps://` on iOS, which Capacitor hands to the OS.
- `Map::provider` is loaded once per server; if it fails, the panel leaves the map out.

## Consequences

### Positive
- No dependency; little code.
- Same tiles and attribution as the web UI; follows the server's map settings.
- Zoom and pan happen in the user's maps app.

### Negative
- No pinch or pan in the panel.
- The app now requests tiles from a third-party server, outside the user's Lychee server.
- OpenStreetMap's tile policy asks apps to identify themselves; WebView image requests send a browser User-Agent and the app's local origin. If a provider blocks them, tiles show grey and coordinates and address still show (checked on devices).

## Alternatives Considered

- **Leaflet (Q-008-01 B):** interactive, but a new dependency and gesture conflicts with the sheet.
- **No map (Q-008-01 C):** simplest, but unlike the web panel the owner asked to match.

## Security / Privacy Impact

Each tile request tells the tile server roughly where the photo was taken (a zoom-15 tile, a few hundred metres across), together with the device's IP address. This is the same disclosure the web UI makes when its map is shown, and it only happens when the server allows maps and GPS display. No Lychee cookie or credential is sent to the tile server (plain `<img>` requests to another origin).

## Operational Impact

None on Lychee. Tile traffic is a few images per opened photo, cached by the WebView.

## Links

- Related spec sections: FR-008-05, NFR-008-04, NFR-008-05, API-008-03
- Related ADRs: ADR-001-01, ADR-003-02 (thumbnails as `<img>`), ADR-006-01
