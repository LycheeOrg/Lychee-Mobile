# Open Questions – Feature 005

Open questions for [Feature 005](spec.md). Log every high- and medium-impact question here (table row + Question Details entry) before asking the user; see [open-questions-format.md](../../spec-guidelines/open-questions-format.md). Once answered, fold the outcome into [spec.md](spec.md) (and an ADR when architecturally significant), then mark the entry resolved.

## Active Questions

| Question ID | Feature | Priority | Summary | Status | Opened | Updated |
|-------------|---------|----------|---------|--------|--------|---------|
| ~~Q-005-01~~ | 005 – Photo upload | High | How does the user pick photos and videos? (A the WebView's `<input type="file" multiple>`; B `@capawesome/capacitor-file-picker`; C `@capacitor/camera` `pickImages`) | Resolved (Option B — `@capawesome/capacitor-file-picker`, chosen by the owner because GPS data must never be removed before upload; owner, 2026-10-19; spec FR-005-01, NFR-005-04; ADR-005-01) | 2026-10-19 | 2026-10-19 |
| ~~Q-005-02~~ | 005 – Photo upload | Medium | Where can the user upload to? (A an Upload button on any album page they may upload to, and on the album list into Unsorted; B one Upload entry that asks for the album; C Unsorted only) | Resolved (Option A — Upload on album pages with `can_upload`, Unsorted from the album list; owner, 2026-10-19; spec FR-005-02) | 2026-10-19 | 2026-10-19 |
| ~~Q-005-03~~ | 005 – Photo upload | Medium | How does the upload queue behave? (A in the foreground with a progress sheet, paused while the app is in the background; B native background uploads) | Resolved (Option A — foreground queue with a progress sheet; owner, 2026-10-19; spec FR-005-04) | 2026-10-19 | 2026-10-19 |
| ~~Q-005-04~~ | 005 – Photo upload | High | How does Android read the original safely when the picker's "Include location" may be off? (A small app-local native helper that copies the original to the app cache and reports a refusal; B the plugin's `copyFile` to a hard-coded cache path; C full media access and MediaStore URIs) | Resolved (Option A — app-local native helper copying the original to the cache; owner, 2026-10-19; spec FR-005-01, FR-005-06, NFR-005-04, NC-005-03; ADR-005-01) | 2026-10-19 | 2026-10-19 |
| ~~Q-005-05~~ | 005 – Photo upload | High | On Android, how does the picker offer "Include location"? (A the app's `OriginalMedia` helper opens the system picker itself with the location request; B full media access with the app's own photo browser; C the picker's Settings link only) | Resolved (Option A — `OriginalMedia.pick()` launches the system picker with the location request and original formats; owner, 2026-10-19; spec FR-005-01, NC-005-03; ADR-005-01) | 2026-10-19 | 2026-10-19 |
| ~~Q-005-06~~ | 005 – Photo upload | High | How do uploads keep GPS on Android versions other than 17, where the picker's behaviour is unknown? (A refuse any copy whose GPS was redacted, and test on emulators for API 30–36; B test on emulators only; C allow uploads only on Android 17+) | Resolved (owner's own option D — check each Android copy for GPS, upload regardless, notice when missing; owner, 2026-10-19; spec NFR-005-04, FR-005-04, FR-005-06, NC-005-03; ADR-005-01) | 2026-10-19 | 2026-10-19 |

## Question Details

### ~~Q-005-01~~ – Picking photos and videos

**Context:** Lychee uploads files in chunks (`POST /api/v2/Photo`, multipart). The app sends requests through CapacitorHttp (ADR-001-01), which encodes a `Blob` in `FormData` as base64 in JavaScript before handing it to the native layer, so files are sent in chunks of a few MB. Ways to get the files:
- **WebView file input:** Capacitor's Android `BridgeWebChromeClient` opens the system picker with multi-select; iOS's WKWebView opens the system photo picker. Files arrive as `File` objects. iOS may convert HEIC to JPEG for web uploads and may drop location metadata; Android hands over the originals. The iOS picker also offers "Take Photo", which needs `NSCameraUsageDescription` (and `NSMicrophoneUsageDescription` for video) in `Info.plist`.
- **`@capawesome/capacitor-file-picker`** (community plugin): native pickers returning file paths to the originals, incl. videos; new dependency.
- **`@capacitor/camera` `pickImages`** (official): images only, re-encoded as JPEG at a chosen quality.

- **Option A (recommended, not chosen):** `<input type="file" multiple accept="image/*,video/*">`, triggered by the Upload button; add the camera and microphone usage strings on iOS. Check on the iPhone what iOS sends (format and location) and record it.
  - ✅ No dependency; standard system pickers on both platforms; `File` objects slice directly into chunks.
  - ❌ iOS may send JPEG instead of HEIC and strip location; we only find out on the device.
- **Option B (chosen):** `@capawesome/capacitor-file-picker`.
  - ✅ Originals on both platforms.
  - ❌ New community dependency; files must then be read back into the WebView for chunking (Filesystem or `convertFileSrc`), adding a second step.
- **Option C:** `@capacitor/camera` `pickImages`.
  - ✅ Official plugin.
  - ❌ No videos; re-encodes JPEGs, losing originals and HEIC.

### ~~Q-005-02~~ – Upload destination

**Context:** Lychee checks `AlbumPolicy::CAN_UPLOAD` per album. `Album::head` returns `resource.rights.can_upload`; the root list returns `rights.can_upload` for uploading without an album (into Unsorted, `album_id: null`). Smart albums other than Unsorted can't take uploads.

- **Option A (chosen):** an Upload button in the toolbar of every album page whose `can_upload` is true, uploading into that album; on the album list when its `can_upload` is true, uploading into Unsorted. Hidden otherwise (guests, read-only shares).
  - ✅ Upload where you are; no extra picker; follows the server's rights.
  - ❌ Uploading to an album you're not viewing means navigating there first.
- **Option B:** one Upload entry on the album list that asks for the target album.
  - ✅ One place to look.
  - ❌ Needs an album chooser (more UI); the server's target list (`Album::getTargetListAlbums`) is another endpoint.
- **Option C:** Unsorted only.
  - ✅ Simplest.
  - ❌ Everything needs sorting afterwards in the web UI.

### ~~Q-005-03~~ – Upload queue

**Context:** iOS suspends a backgrounded app within seconds and Android may kill it; JavaScript stops with it. True background uploads need native upload tasks (URLSession background sessions, WorkManager), i.e. a plugin and files on disk.

- **Option A (chosen):** a foreground queue. Picked files upload one at a time (each in chunks) while a bottom sheet shows each file's name, progress and result; the sheet can be closed and the queue keeps going while the app is open. When the app goes to the background, the current chunk may fail; on return, failed files show Retry. The album reloads when the queue finishes.
  - ✅ No dependency; simple, visible state.
  - ❌ Leaving the app interrupts uploads.
- **Option B:** native background uploads.
  - ✅ Survives leaving the app.
  - ❌ New native plugin or custom native code on both platforms; files must be copied to disk first.

**Outcome of Q-005-01 (2026-10-19):** the owner chose Option B and set a hard requirement: GPS data must not be removed before upload. Option A was rejected because iOS may strip location from web file inputs. Reading the plugin's 8.1.0 source showed that Android's photo picker redacts location unless the app holds `ACCESS_MEDIA_LOCATION`, and that iOS uses `PHPickerViewController` with `skipTranscoding` (current representation, file copied unchanged). Both are folded into NFR-005-04 and ADR-005-01.

### ~~Q-005-04~~ – Reading the original safely on Android

**Context:** Device check on the Pixel (Android 17, 2026-10-19):
- Without `requireOriginal=1`, MediaStore served picked photos with GPS removed, although `ACCESS_MEDIA_LOCATION` was granted.
- With `requireOriginal=1`, MediaStore throws `UnsupportedOperationException: Require original is only supported for Picker URIs when location sharing is explicitly granted by the user` unless the user turns on **"Include location"** in the photo picker (the picker's own toggle: "Lychee is requesting location info with the photos and videos you select"; strings read from the device's `PhotopickerGoogle.apk`).
- Capacitor's local file server only catches `SecurityException`, so that exception crashes the app. JavaScript can't catch it, so the app must find out before the WebView reads the file.
- The file picker plugin's `copyFile` does catch it (rejects the call), but copies only to a path, which for the app's cache would have to be hard-coded (`/data/user/0/<package>/cache/…`).

- **Option A (chosen):** a small native helper inside the app (Java in `android/app`, registered as a local Capacitor plugin; no new dependency). `prepare(uri)` opens the URI with `MediaStore.setRequireOriginal()`, copies it to `getCacheDir()`, and returns the copy's path, or rejects with `location_not_included` when Android refuses; `release(path)` deletes the copy after upload. The app uploads from the copy through the local file server. When refused, the file fails with "Turn on Include location in the photo picker, then try again."
  - ✅ No crash; exact original with GPS; no hard-coded paths; works with the picker the user already sees.
  - ❌ Native code of our own to maintain (device-tested, not unit-tested in Vitest); one disk copy per file while it uploads.
- **Option B:** use the plugin's `copyFile` with `requireOriginal=1` into a hard-coded cache path.
  - ✅ No native code of our own.
  - ❌ Hard-coded data path breaks for work profiles and other users; the copy can't be deleted without another plugin.
- **Option C:** request full media access (`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`) and open the matching `content://media/external/…` URI with `requireOriginal=1`.
  - ✅ No picker toggle needed.
  - ❌ Broad permission over the whole library (Google Play restricts it); still needs a crash-safe read.

### ~~Q-005-05~~ – Getting the picker to offer "Include location" (Android)

**Context:** Second device check (2026-10-19): the native copy (Q-005-04) works and no longer crashes, but MediaStore refused the original because the picker never asked about location (log: `PickerUriResolver.checkPermissionForRequireOriginalQueryParamInPicker`). The picker's own code (`PhotopickerGoogle.apk` on the Pixel) shows that it only offers the "Include location" switch when the app launching it sets the intent extra `android.provider.extra.REQUEST_LOCATION_METADATA_ACCESS` and holds `ACCESS_MEDIA_LOCATION`. That extra is **not** in the public Android 17 SDK (`MediaStore` in `android-37.0/android.jar`), so it is undocumented. The file picker plugin launches the picker through AndroidX `PickVisualMedia`, which can't pass extras. The same code reads `MediaStore.EXTRA_ACCEPT_ORIGINAL_MEDIA_FORMAT` (public), without which the picker may transcode media (e.g. HEVC video) for the app, which would also break NFR-005-04.

- **Option A (chosen):** on Android, `OriginalMedia` gets a `pick()` method that launches `MediaStore.ACTION_PICK_IMAGES` itself with `EXTRA_PICK_IMAGES_MAX`, image and video types, `EXTRA_ACCEPT_ORIGINAL_MEDIA_FORMAT` and `REQUEST_LOCATION_METADATA_ACCESS`; the result URIs go through the existing `prepare`/`release` copy. iOS keeps `@capawesome/capacitor-file-picker`.
  - ✅ Same system picker, now with the "Include location" switch; originals without transcoding; no new dependency.
  - ❌ Relies on an undocumented extra that may change or disappear; if the picker ignores it, uploads fail with the existing message rather than losing GPS. More native code.
- **Option B:** request full media access (`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`) and build the app's own photo browser over MediaStore, opening `content://media/external/…` URIs with `setRequireOriginal()`.
  - ✅ Uses only public APIs; no picker switch needed.
  - ❌ Broad library permission (Google Play restricts it); a whole photo browser to build.
- **Option C:** keep the current picker and tell users to enable location sharing in the picker's settings (if the picker offers it there).
  - ✅ No code.
  - ❌ Unverified that such a setting exists without the request extra; poor experience.

### ~~Q-005-06~~ – Older Android versions

**Context:** GPS survives on the Pixel (Android 17, 2026-10-19) because the picker offers "Include location" and MediaStore then serves the original. Elsewhere it is unverified:
- The photo picker and MediaStore are Mainline modules updated through Google Play system updates, so behaviour depends on the module version, not only the Android version. The "Include location" switch is behind a picker flag (`PICKER_LOCATION_METADATA_ENABLED`, seen in the picker's code); an older picker may ignore `REQUEST_LOCATION_METADATA_ACCESS`.
- On a picker without the switch, `setRequireOriginal()` on a picker URI may (a) work with `ACCESS_MEDIA_LOCATION` alone (GPS kept), (b) throw (the app shows "Turn on Include location…", which would be wrong there and block uploads), or (c) be ignored and serve a redacted file, losing GPS **silently**. Only (c) breaks NFR-005-04 without anyone noticing.
- The system photo picker (`ACTION_PICK_IMAGES`) exists on Android 13+ and on Android 11–12 with a recent Google Play system update; Android 7–10 (minSdk 24) and devices without it get "Couldn't open your photos." today.
- MediaStore redaction overwrites the GPS values with zeros and keeps the tags (the Pixel's log listed the redacted byte ranges). Android's own `android.media.ExifInterface` (no new dependency) can read GPS from JPEG and HEIF copies.

- **Option A (recommended):** add a safety net and measure. After `prepare` copies a photo, the native helper reads its GPS with `ExifInterface`; GPS tags present with latitude and longitude both 0 means redacted, and the file fails with "This photo's location was removed by Android, so it wasn't uploaded." Photos without GPS tags upload as they are. Then run the upload on Android emulators for API 30, 33, 34, 35 and 36 with a GPS-tagged photo and record which case each shows; fix the message for case (b) if it appears.
  - ✅ No Android version can silently lose GPS; real data on which versions work.
  - ❌ A heuristic (a photo really taken at 0,0 would be refused); emulator system images to download (several GB); videos aren't checked (their location lives in MP4 metadata, which `ExifInterface` doesn't cover).
- **Option B:** emulator tests only.
  - ✅ Less code.
  - ❌ Real devices with other module versions can still lose GPS silently.
- **Option C:** allow uploads only on Android 17+ for now.
  - ✅ Only the verified path.
  - ❌ Locks out most Android users.
- **Option D (chosen by the owner, 2026-10-19):** "add a check to see if GPS data is being included. if it is not, still upload the picture, but show a notice when uploading that gps data is missing." Uploads are never blocked for location: each Android copy is checked (photos with `ExifInterface`, videos with `MediaMetadataRetriever`); missing or 0,0 location uploads with the notice "Uploaded without GPS data". The agent applied the same rule to the picker's "Include location" being off (Q-005-04): instead of failing, the file is copied without `requireOriginal` and uploaded with the notice. Emulator testing (Option A's second half) was not chosen.
