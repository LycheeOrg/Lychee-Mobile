# Open Questions – Feature 012

Open questions for [Feature 012](spec.md). Log every high- and medium-impact question here (table row + Question Details entry) before asking the user; see [open-questions-format.md](../../spec-guidelines/open-questions-format.md). Once answered, fold the outcome into [spec.md](spec.md) (and an ADR when architecturally significant), then mark the entry resolved.

## Active Questions

| Question ID | Feature | Priority | Summary | Status | Opened | Updated |
|-------------|---------|----------|---------|--------|--------|---------|
| ~~Q-012-01~~ | 012 – Background uploads | High | How do uploads continue in the background? (A keep the app running: Android foreground service with a progress notification, the existing uploader keeps going; iOS ~30 s of background time, then pause until the user returns; B native background uploaders on both platforms (Android WorkManager, iOS background URLSession), re-implementing Lychee's chunked upload in Kotlin and Swift; C A on Android, B on iOS) | Resolved (Option A — keep the app running: Android foreground service with a progress notification, iOS background time then pause; owner, 2026-10-20; spec FR-012-03, NC-012-01, NC-012-02; ADR-012-01) | 2026-10-20 | 2026-10-20 |
| ~~Q-012-02~~ | 012 – Background uploads | Medium | What survives the app being closed? (A every queued file: picked files keep their access (Android) or a copy (iOS) until uploaded, and continue on the next start; B only photos taken in the app, as now; picked files must be picked again) | Resolved (Option A — every queued file kept until uploaded; owner, 2026-10-20; spec FR-012-04; ADR-012-01) | 2026-10-20 | 2026-10-20 |

## Question Details

### ~~Q-012-01~~ – Background execution

**Context:** See the spec Appendix. On Android the app's JavaScript keeps running in the background, but only a foreground service (with a notification) keeps the process alive. On iOS JavaScript stops within seconds; only `beginBackgroundTask` (≈30 s) or a native background `URLSession` lets uploads go on. The upload logic (chunks, `uuid_name` echo, result mapping, Android original copy and GPS check) lives in TypeScript and is tested there (Feature 005).

- **Option A (recommended, chosen):** keep the app running. Android: a small foreground service (`dataSync`) with a progress notification while files are queued; the existing uploader keeps working while the user is in other apps. iOS: ask for background time when leaving mid-upload (≈30 s, usually enough to finish the current file), then pause; continue when the user comes back. ADR-012-01. No dependency.
  - ✅ One upload implementation, already tested; small native code.
  - ✅ Android uploads run for as long as needed in the background.
  - ❌ iOS uploads stop about 30 s after leaving the app (a native iOS uploader could follow as a separate feature).
- **Option B:** native background uploaders on both platforms: Android WorkManager (new Gradle dependency `androidx.work`), iOS background `URLSession`; the chunked upload, session cookies, XSRF token and result mapping rewritten in Kotlin and Swift.
  - ✅ Uploads continue on both platforms, even after the app is closed.
  - ❌ Two more implementations of the upload protocol, tested on devices only; a large feature.
  - ❌ A Gradle dependency.
- **Option C:** A on Android, B's iOS part on iOS.
  - ✅ Full background on both platforms without WorkManager.
  - ❌ A Swift upload implementation alongside the TypeScript one; larger than A.

### ~~Q-012-02~~ – After the app is closed

**Context:** Closing the app (swiping it away) or the system killing it ends the in-memory queue. Feature 011 already keeps taken photos and re-queues them on the next start. Picked files: Android photo-picker URIs lose their access when the process ends unless the app calls `takePersistableUriPermission`; iOS gives the app a temporary copy the system may delete.

- **Option A (recommended, chosen):** every queued file is kept as pending until Lychee accepted it: Android takes persistable access to picked items; iOS moves the temporary copy into app storage. On the next start, unfinished files continue.
  - ✅ Nothing the user chose to upload is lost.
  - ✅ Reuses Feature 011's pending list.
  - ❌ iOS copies use storage until uploaded.
- **Option B:** only taken photos survive (as now); picked files that didn't finish must be picked again.
  - ✅ Simpler.
  - ❌ A closed app silently drops picked uploads.
