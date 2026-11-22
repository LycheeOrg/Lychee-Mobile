# Open Questions - Feature 015

Open questions for [Feature 015](spec.md).

## Active Questions

| Question ID | Feature | Priority | Summary | Status | Opened | Updated |
|-------------|---------|----------|---------|--------|--------|---------|
| ~~Q-015-01~~ | 015 - Android camera GPS | High | How should Android camera photos get GPS without losing the current single-shot capture flow? | Resolved (Option A - add the phone location to the captured JPEG EXIF) | 2026-11-22 | 2026-11-22 |

## Question Details

### ❓ Q-015-01 - Android GPS implementation

**Status:** Resolved
**Feature:** F-015 - Android camera GPS
**Preferred option:** Option A - Add the phone location to the captured file

**Question**

Should Android captured photos receive the phone's current location as EXIF GPS, or should the app switch to the full camera app and discover newly taken gallery items?

---

#### Option A - Add phone location to the captured file
- **Idea:** Ask for Android `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`, read a recent fix when a photo is taken, and write an EXIF GPS block into the app-private capture file.
- **Spec impact:** Adds runtime location permission UX and may rewrite the camera app's JPEG.
- **Pros:**
  - Preserves the current one-photo capture flow.
  - Works even if the camera app does not add its own GPS.
- **Cons:**
  - Android location permission is required.
  - The exact file is no longer byte-for-byte untouched.
  - A stale/no-fix location must fall back to the existing without-GPS notice.

#### Option B - Open the full camera app and upload gallery additions
- **Idea:** Open the normal camera app, then discover photos and videos added while it was open through MediaStore.
- **Spec impact:** Changes the Android UX to gallery discovery and can upload several items.
- **Pros:**
  - Uses the camera's own location when enabled.
  - Preserves all camera modes and the phone's normal gallery workflow.
- **Cons:**
  - The owner previously found that recently processed photos can be missed.
  - Needs photo/video access and more complex selection/state handling.

#### Option C - Keep Android without GPS
- **Idea:** Preserve the current single-shot capture and explicit without-GPS upload notice.
- **Spec impact:** No new native permission or capture rewrite.
- **Pros:**
  - Lowest risk.
  - Keeps byte-for-byte Android camera files.
- **Cons:**
  - Android camera photos continue to lack GPS.

**Next action**

The owner decides Q-015-01; after resolution, update Feature 015's specification and create the implementation plan/tasks.

**Resolution**

The owner selected Option A on 2026-11-22. Location is requested only when Android Take photo is used. Denied location permission or no recent fix leaves the existing without-GPS upload result.
