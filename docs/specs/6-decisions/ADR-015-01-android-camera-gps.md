# ADR-015-01: Android camera location in capture EXIF

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related features/specs:** Feature 015; Feature 011
- **Related open questions:** Q-015-01, Q-015-02

## Decision

Android Take photo keeps the existing single-shot capture flow. It requests fine/coarse location permission only when capture starts, uses the newest GPS/network/passive fix no older than ten minutes, and writes latitude, longitude and altitude into the captured JPEG EXIF using AndroidX ExifInterface 1.3.7.

If permission is denied or no recent fix is available, capture continues normally. The existing upload location check reports the photo as uploaded without GPS.

## Consequences

### Positive

- Android captures receive a usable location in the common case.
- The existing camera, pending-photo, upload and cleanup flows remain unchanged.

### Negative

- Android may rewrite the captured JPEG metadata.
- Location quality depends on the phone's last known fixes.
- Permission refusal remains visible through the existing without-GPS result.
- AndroidX ExifInterface 1.3.7 is an additional library dependency, approved by the owner on 2026-11-24 (Q-015-02); no unrelated dependencies are in scope.

## Alternatives Considered

- Open the full camera and discover gallery additions (rejected after earlier processing misses).
- Keep Android captures without GPS (rejected by the owner for this follow-up).
