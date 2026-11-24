# Feature Plan 015 - Android Camera GPS

_Linked specification: [spec.md](spec.md)_  
_Status: In Progress_  
_Last updated: 2026-11-22_

## Vision & Success Criteria

Android captured photos carry a recent phone location in EXIF when permission is granted, while permission denial or a missing fix preserve the existing capture and without-GPS behavior.

## Scope Alignment

- In scope: Android runtime location permission, recent-fix selection, EXIF GPS writing with the owner-approved AndroidX ExifInterface 1.3.7 dependency, tests and Android build verification.
- Out of scope: iOS behavior, full-camera/MediaStore discovery, unrelated dependency changes, and signing/release changes.

## Dependencies & Interfaces

- `OriginalMediaPlugin.capture({ name, includeLocation })`.
- Android `LocationManager`, AndroidX ExifInterface 1.3.7, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`.
- Existing upload location detection (`prepare`/NFR-005-04).

## Increment Map

1. Add the failing camera contract assertion and verify it red.
2. Implement Android permission request and capture flow.
3. Implement last-known fix selection and EXIF writing.
4. Record the approved Exif dependency decision in the specification and ADR.
5. Run web, Android and documentation checks.

## Scenario Tracking

| Scenario ID | Increment / Task | Notes |
|-------------|------------------|-------|
| S-015-01 | I2-I3 | Location allowed, recent fix, EXIF present |
| S-015-02 | I2 | Permission denied, normal capture |
| S-015-03 | I3 | No recent fix, no GPS EXIF |
| S-015-04 | I3 | EXIF failure, capture still succeeds |

## Analysis Gate

- 2026-11-22: pass after Q-015-01 resolution.
- Native permission and EXIF rewrite are explicitly scoped and documented.
- No dependency is required.
- Test-first camera contract is established.

## Intent Log

- 2026-11-22: owner selected Option A for Feature 015.
- 2026-11-22: location permission is requested on Android Take photo and denied permission falls back to normal capture.
- 2026-11-22: focused and full Vitest suites pass with 715 tests; typecheck/build pass; scoped format/lint pass.
- 2026-11-22: Android Gradle assemble cannot start because JDK 21 is not installed; the available runtime is JDK 23 and JDK 17/19 directories exist.
- 2026-11-24: owner approved AndroidX ExifInterface 1.3.7 for GPS EXIF writing (Q-015-02); the feature specification and ADR now record the dependency and rationale.
- 2026-11-24: the local JDK 21 installation is available for Android assemble verification; its machine-specific `org.gradle.java.home` setting is not part of the feature change.
- 2026-11-24: camera tests (13), full Vitest suite (715), typecheck, web build and Android `assembleDebug` pass; Android assemble uses `JAVA_HOME` for this command only.
- 2026-11-24: `npx vp check` reports formatting issues in 125 existing project files; no unrelated formatting changes were made.
