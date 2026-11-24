# Open Questions - Feature 015

Open questions for [Feature 015](spec.md).

## Active Questions

| Question ID | Feature | Priority | Summary | Status | Opened | Updated |
|-------------|---------|----------|---------|--------|--------|---------|
| ~~Q-015-01~~ | 015 - Android camera GPS | High | How should Android camera photos get GPS without losing the current single-shot capture flow? | Resolved (Option A - add the phone location to the captured JPEG EXIF) | 2026-11-22 | 2026-11-22 |
| ~~Q-015-02~~ | 015 - Android camera GPS | High | Is the AndroidX ExifInterface dependency approved for this implementation? | Resolved (Option A - owner approved AndroidX ExifInterface 1.3.7; spec and ADR updated) | 2026-11-24 | 2026-11-24 |

## Question Details

### ❓ Q-015-02 - AndroidX ExifInterface dependency

**Status:** Resolved
**Feature:** F-015 - Android camera GPS
**Preferred option:** Option A - Explicitly approve and document the AndroidX dependency

**Question**

Should the AndroidX ExifInterface dependency currently added to the working tree be approved and included in the commit and push? The feature specification currently says that no library dependency is added.

---

#### Option A - Approve and document the dependency
- **Idea:** Approve `androidx.exifinterface:exifinterface:1.3.7` and update the feature specification to reflect the dependency.
- **Spec impact:** Update NFR-015-02 and the Android native capability details before committing.
- **Pros:**
  - Keeps the current AndroidX-based implementation intact.
  - Makes the dependency decision explicit and documented.
- **Cons:**
  - Adds a library dependency that the current specification excludes.

---

#### Option B - Keep the no-dependency requirement
- **Idea:** Use the Android platform Exif API if it supports the required calls at the app's minimum SDK, otherwise revise the GPS approach.
- **Spec impact:** Preserve NFR-015-02; revise implementation before committing.
- **Pros:**
  - Stays within the currently approved dependency scope.
  - Avoids adding an external library.
- **Cons:**
  - Requires confirming that the platform API can satisfy the implementation.

---

#### Option C - Defer commit and push
- **Idea:** Leave the AndroidX change uncommitted until a later explicit dependency decision.
- **Spec impact:** No feature behavior or dependency decision changes yet.
- **Pros:**
  - Avoids publishing an unapproved dependency.
  - Does not require changing the current implementation.
- **Cons:**
  - The requested commit and push remain blocked.

---

**Next action**

The owner selected Option A on 2026-11-24. The feature specification and ADR record the approved dependency and rationale.

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
