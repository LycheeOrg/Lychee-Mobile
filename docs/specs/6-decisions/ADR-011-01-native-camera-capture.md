# ADR-011-01: Native camera capture with metadata, kept until uploaded

- **Status:** Accepted
- **Date:** 2026-10-20
- **Related features/specs:** Feature 011 (docs/specs/4-architecture/features/011-camera-upload/spec.md), Feature 005
- **Related open questions:** Q-011-01 … Q-011-06

## Context

The owner wants to take photos in the app with the phone's own camera and upload them with camera information and GPS. `@capacitor/camera` 8.2.6 re-encodes Android photos and can't add GPS on iOS, whose camera picker never provides a location (spec Appendix). Uploads run only while the app is open (Feature 005); a taken photo exists nowhere else, so it must not be lost when an upload fails.

## Decision

- **Android:** `OriginalMediaPlugin.capture({ name })` launches `MediaStore.ACTION_IMAGE_CAPTURE` with `EXTRA_OUTPUT` pointing (through the app's `FileProvider`, `files-path` `captures/`) at `files/captures/<name>`. The camera app writes the file in its single-shot mode; the app uploads it byte for byte. No camera permission is declared, so none is needed. `hasCamera()` and `deleteCapture({ path })` complete it. On the Pixel this mode is reduced (no Night Sight, Time Lapse, Panorama) and leaves the location out; opening the full camera app and finding its photos through MediaStore was tried (Q-011-05 A) and reverted because photos still being processed were missed (Q-011-06). GPS on Android is a follow-up.
- **iOS:** an app-local Capacitor plugin `OriginalCamera` (Swift, `ios/App/App/OriginalCameraPlugin.swift`), registered from `MainViewController` (a `CAPBridgeViewController` subclass set in `Main.storyboard`). It opens `UIImagePickerController(.camera)`, reads the capture's `mediaMetadata`, adds a GPS block from `CLLocationManager` (When In Use; the latest fix, waiting at most 10 s), and writes one JPEG (quality 1.0) with `CGImageDestination` to `Application Support/captures/<name>`. New usage strings: `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`.
- **Kept until uploaded:** captures live in app-private persistent storage, are listed in Preferences (`pending_captures`), and are deleted only after Lychee accepted them. Pending photos of the current server rejoin the upload queue after launch and whenever the app returns to the foreground. A stuck photo can be deleted by the user.
- Background uploads are a separate feature (012) that will take over the same pending files.

## Consequences

### Positive
- Android uploads are the camera's own file; camera information on both platforms; GPS on iPhone.
- No new dependency. A taken photo survives failed uploads, app restarts and force-quits.

### Negative
- First iOS native code of the app: a plugin, a view-controller subclass and hand-added Xcode project entries; tested on devices only.
- New iOS permissions (camera, location when in use).
- Android: the camera's reduced single-shot mode and no location (the existing "Uploaded without GPS data" notice tells the user); a follow-up will address GPS.
- Until Feature 012, pending photos upload only while the app is open.

## Alternatives Considered

- **`@capacitor/camera` (+ GPS code or `@capacitor/geolocation` and a JS EXIF writer):** less camera code, but re-encoded Android photos and up to three dependencies.
- **Full camera app with a selection screen (Q-011-05 A):** all camera modes and GPS, but photos the camera was still processing weren't found when the user returned quickly; reverted.
- **Background uploads first (Q-011-04 B):** photos would upload with the app closed from the start, but camera upload would wait for a much larger feature.

## Security / Privacy Impact

Photos stay in app-private storage until uploaded, then are deleted. iOS location is read only while taking a photo and only written into that photo. The app holds no camera permission on Android.

## Operational Impact

None on the server. Pending photos use phone storage until they upload.

## Links

- Related spec sections: FR-011-01 … 06, NFR-011-01, NC-011-01, NC-011-02
- Related ADRs: ADR-005-01, ADR-007-01
