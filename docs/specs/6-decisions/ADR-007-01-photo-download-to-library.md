# ADR-007-01: Photo downloads through file-transfer into the device photo library

- **Status:** Accepted
- **Date:** 2026-10-20
- **Related features/specs:** Feature 007 (docs/specs/4-architecture/features/007-photo-download-delete/spec.md)
- **Related open questions:** Q-007-01, Q-007-02, Q-007-07, Q-007-08

## Context

Feature 007 lets the user download selected photos and videos from an album into the phone's photo library. Constraints:
- The app's HTTP calls go through CapacitorHttp (ADR-001-01), which hands response bodies to JavaScript as strings. Photos and videos can be hundreds of MB, so their bytes must go to disk natively and never cross the bridge.
- Lychee's `GET /api/v2/Zip?photo_ids=<id>&variant=ORIGINAL&from_id=<album>` returns one photo as the file itself, needs the session cookie, and is gated by `PhotoPolicy::canDownload`.
- Downloads should keep the original bytes with GPS, mirroring the upload rule (NFR-005-04).
- Lychee-Mobile's `minSdkVersion` is 24 and its iOS deployment target 15.0.

Reading the published packages on 2026-10-20:
- `@capacitor/file-transfer` 2.0.6 streams a download to a given full path with progress events and rejects with `httpStatus` on HTTP errors. It returns no response headers and has no cookie handling of its own.
- `@capacitor-community/media` 9.1.0 on iOS saves the original data or file into the camera roll with add-only authorisation. On Android it requires an album folder under `getExternalMediaDirs()[0]` (`Android/media/<package>/`), which Android deletes when the app is uninstalled.

## Decision

- Add three dependencies, pinned exactly, all approved by the owner on 2026-10-20: `@capacitor/file-transfer` `2.0.6` (Q-007-01), `@capacitor-community/media` `9.1.0` (Q-007-01), `@capacitor/filesystem` `8.1.5` (Q-007-08).
- For each photo, one at a time: `Filesystem.getUri({ directory: Cache, path: "downloads/<photo id>.<ext>" })`, then `FileTransfer.downloadFile` of the single-photo `Zip` URL with `variant=ORIGINAL` (Q-007-02) and a `Cookie` header built from `lycheeHttp`'s cookie reader (`CapacitorCookies.getCookies`). Then save the file and delete it from the cache whatever the result; leftovers are removed when a run starts.
- The extension comes from the original variant URL's path (the stored file), falling back to the photo's `type` (MIME) when that URL is downgraded; `type` is not used first because converted RAW photos keep the camera MIME while their original is a JPEG. Photo or video is chosen by the photo's kind (`precomputed.is_video`).
- **iOS:** `Media.savePhoto` / `Media.saveVideo` with the file path and no album (camera roll, add-only, `NSPhotoLibraryAddUsageDescription`).
- **Android:** a new `saveToGallery({ path, name, mimeType })` method on the app's own `OriginalMediaPlugin` (Q-007-07). On API 29+ it inserts into `MediaStore` with `RELATIVE_PATH` `Pictures/Lychee` or `Movies/Lychee` and `IS_PENDING`, and byte-copies the file, with no permission. On API 24–28 it copies into the public `Pictures/Lychee` or `Movies/Lychee` folder after asking for `WRITE_EXTERNAL_STORAGE` (`maxSdkVersion="28"`), then scans the file. The media plugin is not called on Android.
- Live photos save the still only (Q-007-05).

## Consequences

### Positive
- Bounded memory: no downloaded byte passes through JavaScript.
- Downloaded files are Lychee's originals, GPS included.
- Android downloads live in standard shared folders and survive uninstalling the app.
- Little native code of our own: one Android method in a plugin we already own; nothing new on iOS.

### Negative
- Three new dependencies with native code; each update needs review and owner approval. Transitive libraries: `ion-ios-filetransfer`, `ionfiletransfer-android`, SDWebImage (SPM) and OkHttp (Android, unused by us).
- The media plugin's Android half ships but isn't used.
- iOS photos pass through SDWebImage's downloader before `PHAssetCreationRequest.addResource(.photo, data:)`. Byte equality is assumed from reading the code and must be confirmed by checksum on the iPhone (NFR-007-02).
- The cookie header passed to file-transfer is our own work-around. If either platform's stack ignores or overrides it, private-album downloads fail; this is checked on both devices (NFR-007-06).
- A storage permission on Android 7–9.

## Alternatives Considered

- **App-local `MediaSaver` plugin on both platforms (Q-007-01 A):** no dependencies, but our own Swift and Java download and save code, and the first iOS app-local plugin. Not chosen.
- **Share sheet (Q-007-01 C):** no library permission, but a step per download and poor for several files.
- **Media plugin on Android too (Q-007-07 B):** no Android code, but downloads vanish on uninstall and it relies on deprecated APIs.
- **Cache path from native code (Q-007-08 B):** one dependency fewer, but brings back iOS native code.

## Security / Privacy Impact

- The session cookie crosses the bridge as a request header; bridge logging stays off (NFR-006-01, ADR-006-01), and the header is never logged.
- Downloads carry the photo's location into the device library, where other apps with library access can read it. This is the expected behaviour for an original.
- iOS asks for add-only access, not read access to the library. Android 10+ needs no permission; Android 7–9 asks for write access to shared storage.

## Operational Impact

- Dependabot opens update PRs for the three packages; each needs owner approval (AGENTS.md).
- Temporary files in `cache/downloads/` are cleaned per photo and at the start of each run; the OS may also purge the cache.

## Links

- Related spec sections: `docs/specs/4-architecture/features/007-photo-download-delete/spec.md` FR-007-04 … 06, NFR-007-01 … 03, NFR-007-06, NC-007-01 … 06, Appendix "Library findings"
- Related ADRs: ADR-001-01, ADR-005-01, ADR-006-01
