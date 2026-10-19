# ADR-004-01: Swiper for the photo viewer's swipe and zoom

- **Status:** Accepted
- **Date:** 2026-10-19
- **Related features/specs:** Feature 004 (docs/specs/4-architecture/features/004-photo-viewer/spec.md)
- **Related open questions:** Q-004-01

## Context

The photo viewer needs horizontal swiping between photos, pinch and double-tap zoom, and panning while zoomed, on Android and iOS WebViews, through albums of thousands of photos. Ionic removed `ion-slides` in v7 and points to Swiper. Ionic's gesture utility tracks one pointer, so it can't pinch. Hand-written gestures are possible but carry the most code and the most device-specific edge cases.

## Decision

- Add `swiper` pinned to exactly `14.3.0` (MIT; released 2026-09-28), approved by the owner on 2026-10-19. It is the first runtime dependency added beyond the Capacitor and Ionic starter.
- Use Swiper's core API with the **Zoom** module (pinch, double tap, pan within bounds, max 4×) and the **Virtual** module with `renderExternal`, so Vue renders only the current slide and its neighbours; `renderExternalUpdate` is off and the viewer asks Swiper to re-measure after Vue has rendered.
- Keep Swiper inside one component (`PhotoViewer.vue`); variant choice, paging decisions and press-and-hold logic stay in plain, tested TypeScript.

## Consequences

### Positive
- Mature gestures with momentum, edge resistance and zoom bounds on both platforms.
- Constant DOM size however long the album is.

### Negative
- A third-party dependency to keep updated (Dependabot); a major upgrade may change its API.
- Swiper's gestures can't be unit-tested in jsdom; they are checked on devices.
- Zoomed panning hands over to swiping at the image's edge (Swiper's behaviour), rather than blocking swipes while zoomed.

## Alternatives Considered

- **Hand-written Pointer Events gestures:** no dependency, but most code and device testing.
- **Ionic gestures, swipe only:** no pinch zoom.

## Security / Privacy Impact

None: Swiper runs locally and makes no network requests.

## Operational Impact

Dependabot opens update PRs for Swiper; each needs owner approval (AGENTS.md).

## Links

- Related ADRs: ADR-0001, ADR-003-02
