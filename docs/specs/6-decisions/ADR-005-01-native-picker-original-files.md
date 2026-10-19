# ADR-005-01: Native photo picker with unchanged originals for uploads

- **Status:** Accepted
- **Date:** 2026-10-19
- **Related features/specs:** Feature 005 (docs/specs/4-architecture/features/005-photo-upload/spec.md)
- **Related open questions:** Q-005-01

## Context

Uploads must keep GPS and every other piece of metadata: the owner requires that nothing is removed before the file reaches Lychee. The WebView's `<input type="file">` was the dependency-free option, but iOS may convert HEIC to JPEG and drop location for web file inputs. Reading `@capawesome/capacitor-file-picker` 8.1.0's source (2026-10-19):
- iOS `pickMedia` uses `PHPickerViewController`; with `skipTranscoding` it requests the current representation and copies the provided file to a temporary location without re-encoding.
- Android `pickMedia` uses the system photo picker (`PickVisualMedia`), which redacts location metadata unless the app holds `ACCESS_MEDIA_LOCATION`; the plugin can check and request that permission.

The picked files must then be read into the WebView in chunks (Lychee's chunked upload, CapacitorHttp's base64 `FormData`). Capacitor 8.5.3's local file handlers differ: iOS honours `Range` by seeking; Android answers a `Range` request with the stream from byte 0 and a claimed `Content-Range`, so ranges can't be used there.

## Decision

- Add `@capawesome/capacitor-file-picker` pinned to exactly `8.1.0` (MIT, 2026-09-05; 8.1.1 was published the same day this was decided, so the older release is used). Chosen by the owner.
- Pick with `pickMedia({ limit: 0, skipTranscoding: true })`.
- Android: declare `ACCESS_MEDIA_LOCATION` and require it at runtime before picking; without it the app refuses to upload rather than send redacted files. The permission alone is not enough: MediaStore only serves the unredacted file for URIs carrying `requireOriginal=1` (`MediaStore.setRequireOriginal()`), which the plugin doesn't add. On Android 17 MediaStore also refuses `setRequireOriginal()` for picker URIs unless the user turned on the picker's own "Include location" switch, throwing `UnsupportedOperationException`, which Capacitor's local file server doesn't catch (the app crashed). So an app-local native plugin, `OriginalMedia` (Q-005-04 Option A), copies each picked file through `MediaStore.setRequireOriginal()` into the app cache before upload, rejects with `LOCATION_NOT_INCLUDED` when refused, and deletes the copy after upload; the WebView reads the copy as a local file. The picker only offers "Include location" when the launching app sets the undocumented extra `android.provider.extra.REQUEST_LOCATION_METADATA_ACCESS` (read from the Pixel's `PhotopickerGoogle.apk`), which AndroidX `PickVisualMedia` (used by the plugin) can't pass, so on Android `OriginalMedia.pick()` launches `ACTION_PICK_IMAGES` itself, also with `EXTRA_ACCEPT_ORIGINAL_MEDIA_FORMAT` so videos aren't transcoded (Q-005-05). The file picker plugin remains in use for iOS picking and the Android permission check.
- Read picked files through `Capacitor.convertFileSrc(path)`: iOS with one `Range` request per chunk, Android with a single streamed response consumed chunk by chunk. Only one chunk (≤ 4 MiB) is in memory at a time.
- Upload the bytes as read, never decoding or re-encoding them.
- Never block an upload for location (owner, Q-005-06): on Android each copy is checked for GPS (`ExifInterface` for photos, `MediaMetadataRetriever` for videos; absent or 0,0 = missing). If MediaStore refuses the original ("Include location" off), the helper copies the file as served. Files without location upload with the notice "Uploaded without GPS data".

## Consequences

### Positive
- Original files, incl. HEIC and GPS, reach Lychee.
- Bounded memory for large videos on both platforms.

### Negative
- A community dependency with native code on both platforms; updates need review and approval.
- Android users must grant a permission to upload at all.
- Two file-reading paths, one per platform, because of Capacitor's Android `Range` handling.
- Whether iOS's picker includes location is checked on a device (NFR-005-04); if it doesn't, this ADR is revisited.
- Found on the Pixel (Android 17) on 2026-10-19: with the permission granted but without `requireOriginal=1`, uploads arrived without GPS. Photos uploaded before the fix are stored without location.
- Native code of our own (`OriginalMediaPlugin.java`), tested on devices only; one temporary copy per file while it uploads.
- Depends on an undocumented picker extra; if a picker ignores it, files upload without location and say so (Q-005-06) rather than silently.
- The check is a heuristic: a real 0,0 location reads as missing; iOS isn't checked yet.

## Alternatives Considered

- **WebView file input:** no dependency, but iOS may convert and strip location.
- **`@capacitor/camera` `pickImages`:** official, but images only and re-encoded as JPEG.
- **Reading the whole file into a Blob:** simplest, but a large video would sit in memory on iOS.

## Security / Privacy Impact

Uploading keeps the photos' location, as the owner requires; Lychee's own settings decide who sees it. The Android permission is requested only when uploading.

## Operational Impact

Dependabot opens update PRs for the plugin; each needs owner approval (AGENTS.md).

## Links

- Related ADRs: ADR-001-01, ADR-001-02
