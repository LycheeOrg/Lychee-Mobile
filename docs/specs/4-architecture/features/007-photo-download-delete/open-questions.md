# Open Questions – Feature 007

Open questions for [Feature 007](spec.md). Log every high- and medium-impact question here (table row + Question Details entry) before asking the user; see [open-questions-format.md](../../spec-guidelines/open-questions-format.md). Once answered, fold the outcome into [spec.md](spec.md) (and an ADR when architecturally significant), then mark the entry resolved.

## Active Questions

| Question ID | Feature | Priority | Summary | Status | Opened | Updated |
|-------------|---------|----------|---------|--------|--------|---------|
| ~~Q-007-01~~ | 007 – Photo download and delete | High | Where does Download put files, and how? (A the photo library through an app-local native `MediaSaver` plugin on both platforms; B the photo library through `@capacitor/file-transfer` + `@capacitor-community/media`; C the system share sheet through `@capacitor/share` + `@capacitor/filesystem`) | Resolved (Option B — `@capacitor/file-transfer` 2.0.6 and `@capacitor-community/media` 9.1.0 approved; owner, 2026-10-20; spec FR-007-04, FR-007-05, NFR-007-01, NFR-007-03, NC-007-01, NC-007-02; follow-ups Q-007-07, Q-007-08; ADR-007-01) | 2026-10-20 | 2026-10-20 |
| ~~Q-007-02~~ | 007 – Photo download and delete | Medium | Which version of each photo is downloaded? (A the original, unchanged; B the largest web variant, `medium2x`/`medium`; C ask each time) | Resolved (Option A — always the original, unchanged; owner, 2026-10-20; spec FR-007-04, NFR-007-02, Non-Goals) | 2026-10-20 | 2026-10-20 |
| ~~Q-007-03~~ | 007 – Photo download and delete | High | Where is Delete offered, given Lychee deletes "from an album"? (A regular albums and Unsorted, with a confirmation that explains it; B every album where `can_delete` is true except tag and person albums, like the web UI; C regular albums only) | Resolved (Option A — regular albums and Unsorted; owner, 2026-10-20; spec FR-007-02, FR-007-03, Non-Goals, Appendix) | 2026-10-20 | 2026-10-20 |
| ~~Q-007-04~~ | 007 – Photo download and delete | Medium | How does the user start selecting? (A long-press a tile and a Select toolbar button; B Select button only; C long-press only) | Resolved (Option A — long-press and a Select button; owner, 2026-10-20; spec FR-007-01) | 2026-10-20 | 2026-10-20 |
| ~~Q-007-05~~ | 007 – Photo download and delete | Medium | What does downloading a live photo save? (A the still only; B on iOS the still and its video as a Live Photo, Android the still) | Resolved (Option A — the still only; owner, 2026-10-20; spec FR-007-04, Non-Goals) | 2026-10-20 | 2026-10-20 |
| ~~Q-007-06~~ | 007 – Photo download and delete | Medium | Do Download and Delete also go in the photo viewer? (A grid only now, the viewer in a later feature; B grid and viewer in this feature) | Resolved (Option A — grid only, the viewer in a later feature; owner, 2026-10-20; spec Non-Goals; plan Follow-ups) | 2026-10-20 | 2026-10-20 |
| ~~Q-007-07~~ | 007 – Photo download and delete | High | The media plugin saves Android downloads into the app's own folder, which Android deletes on uninstall. How does Android save? (A `OriginalMedia.saveToGallery` into `Pictures/Lychee` via `MediaStore`, media plugin on iOS only; B accept the app folder and document it) | Resolved (Option A — `OriginalMedia.saveToGallery` into `Pictures/Lychee` / `Movies/Lychee`, media plugin on iOS only; owner, 2026-10-20; spec FR-007-04, FR-007-05, NC-007-02, NC-007-04, NC-007-06; ADR-007-01) | 2026-10-20 | 2026-10-20 |
| ~~Q-007-08~~ | 007 – Photo download and delete | Medium | file-transfer needs a full cache file path. Approve `@capacitor/filesystem` as a third dependency? (A yes, pinned `8.1.5`; B no, get the cache path from app-local native code on both platforms) | Resolved (Option A — `@capacitor/filesystem` 8.1.5 approved; owner, 2026-10-20; spec FR-007-04, NFR-007-03, NC-007-03; ADR-007-01) | 2026-10-20 | 2026-10-20 |

## Question Details

### ~~Q-007-01~~ – Download destination and transport

**Context:** On a phone, "download" normally means "it shows up in Photos / Google Photos". The app's HTTP goes through CapacitorHttp (ADR-001-01), which hands response bodies to JavaScript as strings; a large video would not fit in memory (NFR-007-01), so bytes must be streamed to disk natively. Lychee's `GET /api/v2/Zip` returns one photo as the file itself and needs the session cookie. iOS needs `NSPhotoLibraryAddUsageDescription` and add-only authorisation. Android 10+ saves through `MediaStore` with no permission; the app's `minSdkVersion` is 24, and Android 7–9 needs `WRITE_EXTERNAL_STORAGE` (`maxSdkVersion="28"`). The app already has an Android app-local plugin (`OriginalMediaPlugin`); an iOS app-local plugin would be new (registered from a `CAPBridgeViewController` subclass).

- **Option A (recommended, not chosen):** an app-local `MediaSaver` plugin, Swift and Java, that streams `GET Zip` (with the cookie passed from JavaScript) into the app cache, adds the file to the library and deletes the copy; progress events; Android 7–9 asks for `WRITE_EXTERNAL_STORAGE`.
  - ✅ No new dependency; exactly the behaviour we need (streaming, progress, cookie, cleanup).
  - ✅ Files land where users look for photos.
  - ❌ Native code to own on both platforms, including the first iOS app-local plugin.
  - ❌ New iOS usage string and an Android permission for old versions.
- **Option B (chosen):** `@capacitor/file-transfer` (official) to download to a file, then `@capacitor-community/media` to save it into the library.
  - ✅ Less native code of our own.
  - ❌ Two new dependencies; the media plugin is community-maintained and its Capacitor 8 support and album behaviour need checking.
  - ❌ Cookie handling of the file-transfer plugin must be verified on both platforms.
- **Option C:** download natively (as in B), then open the system share sheet (`@capacitor/share`) so the user picks "Save Image", "Save to Files", or another app.
  - ✅ No photo-library permission; also covers "send to someone".
  - ❌ Two new dependencies; an extra step per download, and awkward for several photos (one sheet for many files, iOS only saves images in batch).

**Outcome (2026-10-20):** the owner chose Option B. Reading the published packages showed: file-transfer needs a full target path and returns no response headers (file type now comes from the photo's `type`, FR-007-06); it has no cookie handling of its own (NFR-007-06); the media plugin on iOS saves original data to the camera roll with add-only access; on Android it requires an album folder under the app's own `Android/media/` directory (Q-007-07). The path need raised Q-007-08.

### ~~Q-007-02~~ – Downloaded version

**Context:** `GET Zip` takes `variant` (`ORIGINAL`, `MEDIUM2X`, `MEDIUM`, …, `RAW` only when `raw_download_enabled`, `LIVEPHOTOVIDEO`). `PhotoPolicy::canDownload` gates all of them; the original is not separately gated by `can_access_full_photo` on this route. Feature 005 went to lengths to keep GPS on upload (NFR-005-04).

- **Option A (recommended, chosen):** always `ORIGINAL`, written unchanged.
  - ✅ The photo as it was uploaded, with GPS and other metadata; round trip with Feature 005.
  - ✅ No extra UI.
  - ❌ Large files on mobile data (videos especially).
- **Option B:** the largest web variant (`MEDIUM2X`, else `MEDIUM`, else `ORIGINAL`).
  - ✅ Smaller and faster.
  - ❌ Re-encoded JPEG without the original's metadata; videos have no medium variant anyway.
- **Option C:** an action sheet each time: Original / Smaller.
  - ✅ The user decides per download.
  - ❌ Extra tap every time; more states to test.

### ~~Q-007-03~~ – Where Delete is offered

**Context:** `DELETE /api/v2/Photo` needs `from_id` and deletes "from that album" (spec Appendix): a photo also in other albums is only unlinked; in no other album it is deleted for good. With `from_id` = Recent, Starred or On This Day, nothing happens for photos that live in real albums, yet the server answers 204. Lychee's web UI shows photo Delete wherever the album's `rights.can_delete` is true, except tag and person albums, so it has this gap in Recent/Starred.

- **Option A (recommended, chosen):** Delete in regular albums (`can_delete`) and in Unsorted, with the confirmation text "Photos that are also in other albums are only removed from this album. This can't be undone."
  - ✅ Every Delete does what it says.
  - ✅ Unsorted is where a fresh phone upload lands (Feature 005), a likely place to clean up.
  - ❌ No Delete in Recent/Starred, where a user may browse.
- **Option B:** wherever `can_delete` is true except tag and person albums (like the web UI).
  - ✅ Same as the web UI.
  - ❌ Delete silently does nothing for most photos in Recent, Starred and On This Day.
- **Option C:** regular albums only.
  - ✅ Simplest rule.
  - ❌ No way to clean up Unsorted from the phone.

### ~~Q-007-04~~ – Starting selection

**Context:** iOS Photos uses a Select button; Google Photos uses long-press. The album toolbar already holds Back, the title and Upload (Feature 005).

- **Option A (recommended, chosen):** both: long-press a tile selects it and enters selection mode; a Select toolbar button enters it empty.
  - ✅ Familiar on both platforms; discoverable through the button.
  - ❌ A long-press handler on tiles must not fight scrolling or the tap that opens the viewer.
- **Option B:** Select button only.
  - ✅ Simplest; no gesture conflicts.
  - ❌ Android users expect long-press.
- **Option C:** long-press only.
  - ✅ Keeps the toolbar uncluttered.
  - ❌ Hidden on iOS, where users look for a Select button.

### ~~Q-007-05~~ – Live photos

**Context:** A Lychee live photo is a still plus a `live_photo_url` video (Feature 004). iOS can save both as one Live Photo (`PHAssetCreationRequest` with `.photo` and `.pairedVideo` resources) only when the pair carries matching content identifiers in their metadata, which Lychee keeps when the files came from an iPhone. Android has no common format.

- **Option A (recommended, chosen):** save the still only, on both platforms.
  - ✅ One file per photo; simple and predictable.
  - ❌ The motion is lost on iOS.
- **Option B:** on iOS save the pair as a Live Photo (second `Zip` call with `LIVEPHOTOVIDEO`), fall back to the still when iOS refuses the pair; Android saves the still.
  - ✅ Round trip of iPhone Live Photos.
  - ❌ More native code and device testing; platform difference.

### ~~Q-007-06~~ – Actions in the viewer

**Context:** The request is "from the grid". The viewer (Feature 004) has an overlay with only Close. Download and Delete there would reuse the same services but add overlay buttons, viewer paging after a delete, and closing on the last photo.

- **Option A (recommended, chosen):** grid only in this feature; the viewer in a follow-up feature.
  - ✅ Smaller, focused increment.
  - ❌ To save or delete the photo you're looking at, you close the viewer and select it.
- **Option B:** grid and viewer in this feature.
  - ✅ Complete experience at once.
  - ❌ Larger scope; viewer edge cases (delete the current slide, index shifts, last photo).

### ~~Q-007-07~~ – Where Android saves downloads

**Context:** `@capacitor-community/media` 9.1.0 on Android requires `albumIdentifier`, a folder under `getExternalMediaDirs()[0]`, i.e. `Android/media/com.mlapaglia.lycheemobile/<album>/`. It byte-copies the file there and broadcasts a media scan, so the photo shows in Google Photos; it needs no permission. Android treats `Android/media/<package>` as app-specific storage and deletes it when the app is uninstalled (to confirm on the Pixel), taking the downloaded photos with it; `getExternalMediaDirs()` is also deprecated since API 30. The app already owns an Android plugin, `OriginalMediaPlugin` (Feature 005). Saving through `MediaStore` into `Pictures/` or `Movies/` needs no permission on Android 10+; Android 7–9 needs `WRITE_EXTERNAL_STORAGE` (`maxSdkVersion="28"`).

- **Option A (recommended, chosen):** add `saveToGallery({ path, name, mimeType })` to `OriginalMediaPlugin`: `MediaStore` insert into `Pictures/Lychee` or `Movies/Lychee` with `IS_PENDING`, byte copy; on Android 7–9 copy into the public folder and scan it after asking for `WRITE_EXTERNAL_STORAGE`. The media plugin is used on iOS only.
  - ✅ Downloads survive uninstalling the app and sit in standard folders.
  - ✅ Small addition to a plugin we already own; no deprecated API.
  - ❌ Some Android native code after all, and a storage permission on Android 7–9.
  - ❌ The media plugin's Android half ships unused.
- **Option B:** use the media plugin on Android too: create a "Lychee" album with `createAlbum` and save into it; document that downloads disappear if the app is uninstalled.
  - ✅ No native code of our own; no permission on any Android version.
  - ❌ Uninstalling the app deletes every photo downloaded with it, without warning.
  - ❌ Relies on `getExternalMediaDirs()` (deprecated) and the deprecated media-scan broadcast.

### ~~Q-007-08~~ – Cache path for file-transfer

**Context:** `FileTransfer.downloadFile` takes `path`, the full target file path, and its documentation points to `@capacitor/filesystem` to build it. JavaScript has no other way to learn the app's cache directory. The downloaded file must also be deleted after it is saved.

- **Option A (recommended, chosen):** add `@capacitor/filesystem` (official Ionic plugin), pinned to `8.1.5`: `getUri({ directory: Directory.Cache, path })` for the target, `deleteFile` and `rmdir` for cleanup.
  - ✅ Official, maintained alongside Capacitor; the documented way to use file-transfer.
  - ✅ No native code.
  - ❌ A third new dependency.
- **Option B:** no new dependency; expose the cache path (and deletion) from app-local native code: a method on `OriginalMediaPlugin` on Android and a first iOS app-local plugin.
  - ✅ No extra dependency.
  - ❌ Brings back the iOS native code that choosing Option B in Q-007-01 avoided.
