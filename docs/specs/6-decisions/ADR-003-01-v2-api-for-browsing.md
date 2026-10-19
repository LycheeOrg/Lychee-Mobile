# ADR-003-01: Browse through Lychee's v2 paginated API

- **Status:** Accepted
- **Date:** 2026-10-19
- **Related features/specs:** Feature 003 (docs/specs/4-architecture/features/003-album-browsing/spec.md)
- **Related open questions:** Q-003-01

## Context

Lychee 7.11 offers two ways to list albums and photos:
- **v2:** `GET /api/v2/Albums` (whole root list), `Album::head`, and the paginated `Album::albums` (30 per page) and `Album::photos` (100 per page, 500 for smart albums). Responses carry full album tiles and photo objects with size-variant URLs. Available since 7.1.0, always on.
- **v3:** struct-of-arrays responses (one array per field), unpaginated, thumbnails through a binary `Asset` endpoint, photo details in a second call. Available since 7.8.4 but behind `STRUCT_OF_ARRAY_ENABLED`, off by default; the routes answer 401/403 when it is off. Off on `lapaglia.pics`.

## Decision

- Browsing uses v2 only: `Albums`, `Album::head`, `Album::albums`, `Album::photos`, plus `Album::unlock`, `Gallery::unlock` and `Gallery::Init`.
- Browsing requires Lychee 7.1.0 or newer; a stored version below it gets a message instead of gallery calls; a hidden version is tried.
- All responses are parsed into the app's own types at the service boundary (NFR-003-03), so a later switch to v3 changes the service, not the pages.

## Consequences

### Positive
- Works on every Lychee 7.1+ server with default settings; one code path.
- Pages map directly onto infinite scroll.

### Negative
- Larger payloads than v3: each photo arrives with all its fields.
- Servers older than 7.1.0 can connect (Feature 001) but not browse.

## Alternatives Considered

- **v3 when enabled, v2 otherwise:** faster where enabled, but two code paths and fixture sets for few servers.
- **v3 only:** fails on default installations.

## Security / Privacy Impact

None beyond Feature 001/002: same transport, same session.

## Operational Impact

None.

## Links

- Related ADRs: ADR-001-01, ADR-003-02
