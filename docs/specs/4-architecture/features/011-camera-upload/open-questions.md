# Open Questions – Feature 011

Open questions for [Feature 011](spec.md). Log every high- and medium-impact question here (table row + Question Details entry) before asking the user; see [open-questions-format.md](../../spec-guidelines/open-questions-format.md). Once answered, fold the outcome into [spec.md](spec.md) (and an ADR when architecturally significant), then mark the entry resolved.

## Active Questions

| Question ID | Feature | Priority | Summary | Status | Opened | Updated |
|-------------|---------|----------|---------|--------|--------|---------|
| ~~Q-011-01~~ | 011 – Camera upload | High | How does the app open the camera? (A the app's own small native code: Android's camera app writes the file untouched, iOS's camera with metadata and GPS written by the app; B `@capacitor/camera` plus code of our own for iOS GPS; C `@capacitor/camera` only, no GPS on iOS) | Resolved (Option A — the app's own native code on both platforms; owner, 2026-10-20; spec FR-011-02, NC-011-01, NC-011-02; ADR-011-01 to write) | 2026-10-20 | 2026-10-20 |
| ~~Q-011-02~~ | 011 – Camera upload | Medium | Where does GPS come from? (A Android: the camera app's own location setting; iOS: the phone's location, asked once; B the phone's location on both, added on Android when the camera app didn't record one; C only what the camera provides, so none on iOS) | Resolved (Option A — camera app's location on Android, phone's location on iOS; owner, 2026-10-20; spec FR-011-03) | 2026-10-20 | 2026-10-20 |
| ~~Q-011-03~~ | 011 – Camera upload | Medium | Is a copy of the photo kept on the phone? (A no, it only goes to Lychee; B also save it to the phone's photo library) | Resolved (owner's own option — keep the photo in the app's own storage until its upload succeeds, then delete it, so it's never lost; no gallery copy; owner, 2026-10-20; spec FR-011-04, FR-011-05; follow-up Q-011-04) | 2026-10-20 | 2026-10-20 |
| ~~Q-011-04~~ | 011 – Camera upload | High | Kept photos must reach Lychee even when an upload fails or the app closes. What comes first? (A this feature keeps photos on disk and uploads them again automatically when the app opens or comes back; background uploads follow as Feature 012 and take over the same pending files; B build background uploads first (Feature 012), then this feature on top; C both in this feature) | Resolved (Option A — pending photos on disk, re-queued when the app opens or returns; background uploads next as Feature 012; owner, 2026-10-20; spec FR-011-04, FR-011-06; ADR-011-01) | 2026-10-20 | 2026-10-20 |
| ~~Q-011-05~~ | 011 – Camera upload | High | Android's capture request gives a reduced camera (no Night Sight, Time Lapse, Panorama) and photos without location. How should Android take photos? (A open the full camera app; when the user comes back, upload every photo and video taken meanwhile, found through MediaStore with the photo access of Feature 009; they stay in the gallery like any camera photo; B keep the capture request and add the phone's location to the file (location permission); C keep it as it is) | Resolved (Option C — after trying Option A with a selection screen on the Pixel (photos still being processed were missed), the owner reverted to the single-shot capture request without GPS on Android; GPS is a follow-up; owner, 2026-10-20; spec FR-011-02, FR-011-03; ADR-011-01) | 2026-10-20 | 2026-10-20 |
| ~~Q-011-06~~ | 011 – Camera upload | Medium | Photos still being processed by the camera (Night Sight, HDR+) aren't in the gallery yet when the user returns quickly. How does the app wait for them? (A open New photos at once and keep watching the gallery while it's open, adding photos as they appear, with "Waiting for the camera to finish…"; B wait on a spinner until new photos stop arriving for a few seconds (at most 30 s), then show the screen; C look for the camera's still-pending items) | Withdrawn (the owner reverted Q-011-05 to the single-shot capture request, so nothing has to wait for the camera; owner, 2026-10-20) | 2026-10-20 | 2026-10-20 |

## Question Details

### ~~Q-011-01~~ – Opening the camera

**Context:** Both platforms offer a system camera an app can open: Android's `ACTION_IMAGE_CAPTURE` intent (the user's camera app, which writes the full-quality file and its EXIF, incl. GPS when its location setting is on), and iOS's `UIImagePickerController` (Apple's camera UI, which returns an image and its metadata but never a location). The official `@capacitor/camera` 8.2.6 wraps both (spec Appendix): on Android it re-encodes the photo as JPEG and copies EXIF back; on iOS it writes the metadata but has no way to add GPS. No camera permission is needed on Android when the app doesn't declare it.

- **Option A (recommended, chosen):** the app's own native code. Android: a `capture()` method on `OriginalMediaPlugin` launches the intent into a cache file and uploads it byte for byte. iOS: a small app-local Swift plugin opens the camera, takes the metadata, adds GPS from the phone's location and writes one JPEG. ADR-011-01.
  - ✅ Android photos are the camera's original file; full metadata on both.
  - ✅ No dependency; GPS on iOS.
  - ❌ The app's first iOS native code (and its registration), tested on devices only.
- **Option B:** `@capacitor/camera` for capture, plus our own iOS code (or `@capacitor/geolocation` and a JS EXIF writer) to add GPS.
  - ✅ Less camera code of our own.
  - ❌ One to three dependencies; Android photos re-encoded; GPS added afterwards by rewriting the JPEG.
- **Option C:** `@capacitor/camera` only.
  - ✅ Least work.
  - ❌ No GPS on iPhone photos; Android photos re-encoded; a dependency.

### ~~Q-011-02~~ – GPS source

**Context:** Android camera apps record location only when their own "Save location" setting is on (Google Camera asks on first use). iOS's camera picker never includes location; the app must ask for When-In-Use location access and read a fix with `CLLocationManager` around the time of capture.

- **Option A (recommended, chosen):** Android uses what the camera app recorded; iOS adds the phone's location (asked the first time Take photo is used). Photos without GPS upload with the "Uploaded without GPS data" notice.
  - ✅ No location permission on Android; iPhone photos get GPS.
  - ❌ On Android it depends on the camera app's setting (the notice tells the user).
- **Option B:** as A, plus on Android the app adds the phone's location when the camera app didn't.
  - ✅ GPS whatever the camera app's setting.
  - ❌ A location permission on Android; rewriting the camera's file breaks "byte for byte".
- **Option C:** only what the camera provides; nothing added.
  - ✅ No location permission at all.
  - ❌ iPhone photos never have GPS.

### ~~Q-011-03~~ – Copy on the phone

**Context:** With Option A of Q-011-01 the photo is written into the app's cache, so it isn't in the phone's gallery; it's deleted after upload (FR-011-04). Saving a copy would reuse Feature 007's savers (`Pictures/Lychee`, camera roll).

- **Option A (recommended, not chosen):** no copy; the photo only goes to Lychee.
  - ✅ No duplicates in the phone's gallery; no storage used.
  - ❌ If the upload fails and the user gives up, the photo is lost.
- **Option B:** also save it to the phone's photo library (`Pictures/Lychee` on Android, the camera roll on iOS).
  - ✅ A local copy, like the normal camera.
  - ❌ Duplicates the photo on the phone; iOS needs the add-only permission (already used by Feature 007).

**Outcome (2026-10-20):** the owner chose neither: the photo is kept in the app's own storage until its upload succeeds and deleted then, so a failed upload never loses it. The owner added that uploads which continue after the app closes (a background worker) may be needed, possibly first → Q-011-04.

### ~~Q-011-04~~ – Kept photos and background uploads

**Context:** Uploads run in the app's foreground queue (Feature 005, Q-005-03 Option A): leaving the app interrupts them, and a failed file needs Retry. With Q-011-03 a taken photo stays on disk until it's uploaded, so something must upload it again later. Uploads that continue after the app closes need native work on both platforms: Android `WorkManager` (or a foreground service) running Lychee's chunked upload with the session cookie and XSRF token outside the WebView; iOS background `URLSession` upload tasks, one file per request, so each 4 MiB chunk is written to disk first and resumed by the system, plus session handling when the app relaunches in the background. That's a feature of its own (several days), affecting every upload, not only taken photos.

- **Option A (recommended, chosen):** this feature keeps taken photos in a durable pending list on disk. Whenever the app opens or comes back to the foreground, pending photos that aren't uploaded yet join the queue again; each is deleted only after Lychee accepted it. Background uploads come next as Feature 012 and take over the same pending files, so nothing here is thrown away.
  - ✅ No photo is ever lost, from the first release of this feature.
  - ✅ Ships soon; the pending store is the foundation Feature 012 needs anyway.
  - ❌ Until Feature 012, uploads only progress while the app is open.
- **Option B:** pause this feature, build background uploads (Feature 012) first, then take photos on top of it.
  - ✅ Taken photos upload in the background from day one.
  - ❌ Camera upload waits for the larger feature; background design questions (e.g. Wi-Fi only, battery) come first.
- **Option C:** do both in this feature.
  - ✅ One delivery.
  - ❌ A very large increment that mixes two concerns, against the ≤ 90-minute increments of AGENTS.md.

### ~~Q-011-05~~ – Android: full camera app or capture request

**Context:** Device check on the Pixel (2026-10-20): `ACTION_IMAGE_CAPTURE` opens Google Camera in its single-shot capture mode, which hides Night Sight, Time Lapse, Panorama, video and other modes, and returns photos without a location (the upload's location check reported it missing, although the owner's gallery photos carry GPS). Camera apps decide what that mode offers; the app can't change it. Android can instead open the camera app normally (`MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA`): every mode, the camera's own location setting applies, photos are saved to the gallery as usual, but nothing is handed back to the app. The app can then find what was taken while the camera was open by asking MediaStore for photos and videos added since it opened the camera; that needs the photo and video access of Feature 009 (ADR-009-01), and `setRequireOriginal` with `ACCESS_MEDIA_LOCATION` (ADR-005-01) keeps their GPS. iOS has no equivalent: an app can't open Apple's Camera app and get its photos back, so iOS keeps Apple's picker (FR-011-02).

- **Option A (recommended, chosen):** Android opens the full camera app. When the user comes back, the app uploads every photo and video taken since it opened the camera (`DATE_ADDED` since then, images and videos, in the order taken) into the album on screen, as originals with GPS. They stay in the phone's gallery like any camera photo, so no private copy is needed; the pending list keeps their MediaStore URIs until each is uploaded. Without photo access the app asks for it first, and explains that it's needed to find the new photos.
  - ✅ All camera modes; GPS as with any camera photo; several photos and videos per trip to the camera.
  - ✅ The gallery keeps the photos, so nothing can be lost.
  - ❌ Needs the photo access that Feature 009 asks for (refused → Take photo can't work on Android, with a message).
  - ❌ A photo taken by another app during that time would be picked up too (only what's added while the camera is open counts).
- **Option B:** keep the capture request and write the phone's location into the photo (Android location permission, the file is rewritten).
  - ✅ No gallery copy; one photo per tap as now.
  - ❌ Still the reduced camera.
  - ❌ A location permission, and the camera's file is no longer untouched.
- **Option C:** keep it as it is.
  - ✅ No change.
  - ❌ Reduced camera, no location on Android.

**Outcome (2026-10-20):** first Option A, with the owner's addition of a selection screen on return; on the Pixel, photos still being processed by the camera were missed when returning quickly (Q-011-06). The owner then reverted to Option C: the single-shot capture request, reduced camera, no GPS on Android for now, with GPS as a follow-up.

### ~~Q-011-06~~ – Waiting for photos the camera is still processing

**Context:** Device check on the Pixel (2026-10-20): after taking a photo and going back to Lychee quickly, New photos doesn't list it, because Google Camera is still processing it (Night Sight, HDR+) and hasn't published it to MediaStore yet. The full camera app can't be told where to save (only the reduced capture request takes `EXTRA_OUTPUT`). Camera apps may insert an item with `IS_PENDING` while writing it, but MediaStore shows other apps' pending items only to their owner, so Lychee can't see "still processing" reliably. It can watch MediaStore for new items (`ContentObserver` on the media collections), which fires when the camera publishes the finished photo.

- **Option A (recommended):** New photos opens as soon as the user is back and keeps watching the gallery while it's open; each photo or video that appears is added, selected. Until the first one arrives, and for a few seconds after each, it shows "Waiting for the camera to finish…" with a spinner. If nothing arrives within 30 s: "No new photos or videos were found." Upload is possible at any time with what's there; photos that arrive after Upload are offered again on the screen. Only items written by the camera app that was opened count (`OWNER_PACKAGE_NAME` = its package, Android 10+; older versions fall back to `DCIM/`), so it effectively watches the camera's own folder (owner's follow-up: the full camera app can't be given a destination folder).
  - ✅ No fixed delay; quick photos show at once, slow Night Sight shots join when ready.
  - ✅ The user sees that the app is still waiting.
  - ❌ A slightly busier screen (items can appear while looking at it).
- **Option B:** a spinner "Waiting for the camera…" until no new item has arrived for 3 s (at most 30 s), then the screen as now.
  - ✅ The list doesn't change while the user chooses.
  - ❌ Always waits at least 3 s; a very slow shot can still be missed.
- **Option C:** also query pending items (`QUERY_ARG_MATCH_PENDING`).
  - ✅ Would know a photo is coming.
  - ❌ Other apps' pending items are hidden from Lychee, so it most likely finds nothing; not reliable.

**Outcome (2026-10-20):** withdrawn; the owner reverted to the single-shot capture request (Q-011-05).
