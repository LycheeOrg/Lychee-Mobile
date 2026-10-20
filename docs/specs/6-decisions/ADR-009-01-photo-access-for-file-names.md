# ADR-009-01: Photo and video read access for original file names

- **Status:** Accepted
- **Date:** 2026-10-20
- **Related features/specs:** Feature 009 (docs/specs/4-architecture/features/009-usability-fixes/spec.md), Feature 005
- **Related open questions:** Q-009-03

## Context

Android uploads pick files through the system photo picker (ADR-005-01, `OriginalMediaPlugin.pick()`). The picker reports each item's `DISPLAY_NAME` as its media ID and extension (`1332.jpg`), so Lychee titles photos with numbers. The camera's file name (`PXL_20261020_121813123.jpg`) is in MediaStore under the same ID, readable only with `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` (Android 13+) or `READ_EXTERNAL_STORAGE` (Android 12 and older). The app so far held only `ACCESS_MEDIA_LOCATION` (and `WRITE_EXTERNAL_STORAGE` up to API 28, ADR-007-01).

## Decision

- Declare `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` and `READ_EXTERNAL_STORAGE` (`maxSdkVersion="32"`) and a `media` permission alias on `OriginalMediaPlugin`, picked by API level.
- `OriginalMedia.requestNameAccess()` asks for it; the JavaScript picker calls it once, before the first Android pick, and remembers that it asked (`@capacitor/preferences`, key `media_names_asked`). The answer never blocks an upload.
- With access, `pick()` looks up `DISPLAY_NAME` in `MediaStore.Files` for each picked item's ID and uses it; without access, with limited access that doesn't cover the item, or when the ID isn't in MediaStore (cloud-only items), it keeps the picker's name.
- Picking still goes through the system photo picker; the permission is used only for names.

## Consequences

### Positive
- Lychee keeps the camera's names, as on the web uploader and on iOS.
- The access could serve later features (e.g. backup), each needing its own decision.

### Negative
- A broad permission prompt on Android.
- Google Play asks apps holding `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` to declare why in the Play Console; a photo gallery client is an accepted use, but it is reviewed (release runbook to mention it).
- Relies on the picker's item ID matching the MediaStore ID for local items (to be confirmed on the Pixel, S-009-12).

## Alternatives Considered

- **Names from the capture date (Q-009-03 B):** no permission, but not the original name.
- **Leave numeric names (Q-009-03 C):** no change, poor titles.

## Security / Privacy Impact

The app can read every photo and video on the device while the permission is granted. It only reads `DISPLAY_NAME` of items the user picked; nothing else is queried, stored or sent. Users can refuse, choose limited access, or revoke it in system settings without losing uploads.

## Operational Impact

Play Console permission declaration before the next production release (ADR-0002, runbook-releases).

## Links

- Related spec sections: FR-009-05, NC-009-02, S-009-12, S-009-13
- Related ADRs: ADR-005-01, ADR-007-01
