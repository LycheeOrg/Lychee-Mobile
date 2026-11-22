# Feature 015 - Android Camera GPS

| Field | Value |
|-------|-------|
| Status | In Progress |
| Last updated | 2026-11-22 |
| Owners | Owner |
| Linked plan | [plan.md](plan.md) |
| Linked tasks | [tasks.md](tasks.md) |
| Roadmap entry | #015 |

## Overview

Android currently captures a photo with `OriginalMediaPlugin` in the camera app's single-shot mode. The camera file is uploaded byte for byte, but the GPS block is not supplied and the app shows an without-GPS result. This feature determines and implements Android GPS behavior.

## Goals

- Give Android captured photos GPS when an approved method can obtain a reliable location.
- Preserve the existing upload queue and pending-photo durability.

## Non-Goals

- No implementation change until Q-015-01 is resolved.
- No iOS behavior change.
- No Android release/signing change.

## Open Questions

None. [Q-015-01](open-questions.md#q-015-01---android-gps-implementation) resolved to Option A.

## Functional Requirements

| ID | Requirement | Success path | Validation path | Failure path | Telemetry & traces | Source |
|----|-------------|--------------|-----------------|--------------|--------------------|--------|
| FR-015-01 | Android Take photo requests location at capture time and writes a recent fix into JPEG EXIF. | After permission, the plugin uses the newest GPS/network fix from the last ten minutes and sets latitude, longitude and altitude when available. | Captured JPEG is accepted and uploaded; existing location detection marks it present. | Permission denied or no recent fix leaves the JPEG unchanged and the existing without-GPS notice applies. | None. | Owner 2026-11-22; Feature 011 GPS follow-up |

## Non-Functional Requirements

| ID | Requirement | Driver | Measurement | Dependencies | Source |
|----|-------------|--------|-------------|--------------|--------|
| NFR-015-01 | Existing Android byte-for-byte behavior is preserved when location is unavailable. | Avoid degrading current capture. | Permission denial/no fix produces a normal captured file and upload. | Android LocationManager and ExifInterface. | AGENTS.md |
| NFR-015-02 | No library dependency is added. | Native Android APIs provide the required behavior. | `package.json` remains unchanged for this feature. | Android SDK. | AGENTS.md |

## UI / Interaction Mock-ups

```
 Take photo                 Android permission               After capture
┌──────────────────────┐    ┌──────────────────────┐       ┌──────────────────────┐
│  📷 Take photo       │ -> │ Allow this app to    │  -->  │ Uploading...         │
│                      │    │ access this device   │       │ GPS if granted       │
└──────────────────────┘    │ location?             │       │ otherwise without GPS│
                            └──────────────────────┘       └──────────────────────┘
```

## Branch & Scenario Matrix

| Scenario ID | Description / Expected outcome |
|-------------|--------------------------------|
| S-015-01 | Location allowed with a recent fix -> capture JPEG receives GPS EXIF and Lychee detects location. |
| S-015-02 | Location permission denied -> capture proceeds and the upload uses the existing without-GPS notice. |
| S-015-03 | Permission allowed but no fix in the last ten minutes -> capture proceeds without GPS EXIF. |
| S-015-04 | EXIF writing fails -> capture proceeds and remains pending until uploaded. |

## Test Strategy

- **Components/Vitest:** add a failing camera wrapper assertion for Android `includeLocation: true`, then keep it green.
- **Native:** Android device check for permission allowed/denied, recent/no fix, and Lychee EXIF detection.
- **Build:** Android debug assemble and web quality/type/test/build gates.

## Native Capabilities

| ID | Plugin / permission | Behaviour |
|----|---------------------|-----------|
| NC-015-01 | `OriginalMediaPlugin` with `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` | Requests location only for Android Take photo, uses a fix no older than ten minutes, and writes GPS EXIF with `ExifInterface`. |
