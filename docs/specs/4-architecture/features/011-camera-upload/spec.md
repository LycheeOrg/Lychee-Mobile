# Feature 011 – Camera Upload

| Field | Value |
|-------|-------|
| Status | Complete |
| Last updated | 2026-10-20 |
| Owners | mlapaglia |
| Linked plan | [plan.md](plan.md) |
| Linked tasks | [tasks.md](tasks.md) |
| Roadmap entry | #011 |

> Guardrail: This specification is the single normative source of truth for the feature. Track high- and medium-impact questions in the feature's [open-questions.md](open-questions.md), encode resolved answers directly in the Requirements/NFR/Behaviour/UI/Telemetry sections below (no per-feature `## Clarifications` sections), and use ADRs under `docs/specs/6-decisions/` for architecturally significant clarifications (referencing their IDs from the relevant spec sections).

> **Amended by Feature 012 (2026-10-20):** the pending list now holds every queued file, with a cleanup kind per file (FR-012-04).

## Overview
A **Take photo** item in the toolbar's "+" menu (Feature 010) opens the phone's own camera; the photo it returns joins the upload queue (Feature 005) for the album on screen, or Unsorted from the album list. The file keeps the camera's EXIF (make, model, lens, exposure, date) and GPS where the platform can provide it (NFR-011-01). On Android the camera app's single-shot capture mode writes the photo straight into the app's storage (reduced camera modes, no location; Q-011-05). iOS's camera hands over an image and its metadata, which the app writes into a JPEG together with the phone's location (Q-011-01, Q-011-02).

## Goals
- Take a photo from the "+" menu and upload it, with the same queue, progress and results as picked files.
- Keep camera information and GPS in the uploaded file.

## Non-Goals
- Video recording; several photos per tap; an in-app camera UI (zoom, modes).
- GPS on Android photos (follow-up, see the roadmap backlog).
- Editing before upload; choosing another album than the one on screen.

## Functional Requirements

| ID | Requirement | Success path | Validation path | Failure path | Telemetry & traces | Source |
|----|-------------|--------------|-----------------|--------------|--------------------|--------|
| FR-011-01 | Take photo in the "+" menu. | **Take photo** (camera icon) sits between Upload photos and Create album, shown wherever Upload photos is (same rights and target, FR-010-02, FR-005-02). | Devices without a camera (`hasSystemFeature(FEATURE_CAMERA_ANY)` / `UIImagePickerController.isSourceTypeAvailable(.camera)`) → hidden. | — | — | Owner 2026-10-20 |
| FR-011-02 | Capture. | Opens the platform camera (Q-011-01, Q-011-05): Android `MediaStore.ACTION_IMAGE_CAPTURE` with `EXTRA_OUTPUT` to `files/captures/<name>` (the camera app's single-shot mode); iOS `UIImagePickerController` (`.camera`). The camera's own review step (retake / use photo) applies. The result is a `PickedFile` named `IMG_yyyyMMdd_HHmmss.jpg` (local time of capture), recorded as pending (FR-011-04), added to the upload queue, and the upload sheet opens. | Cancel in the camera → nothing happens. | No camera app → "No camera app found."; iOS camera permission denied → "Taking photos needs camera access. Allow it in the app's settings."; other errors → "Couldn't take the photo." | — | Owner 2026-10-20 |
| FR-011-03 | Camera information and GPS. | Android: the file exactly as the camera app wrote it in its single-shot mode (camera information; camera apps leave the location out there, and the app doesn't add one for now; owner, 2026-10-20) (Q-011-05). iOS: the JPEG carries the capture's metadata (`mediaMetadata`: TIFF make/model, EXIF exposure, lens, date) plus a GPS block from the phone's location (`CLLocationManager`, When In Use) (Q-011-02). The upload's location check (NFR-005-04) marks photos without GPS "Uploaded without GPS data". | Location permission denied or no fix within 10 s of capture → uploaded without GPS, with the notice. | — | — | Owner 2026-10-20; NFR-005-04 |
| FR-011-04 | Never lose a photo. | The captured file is written to the app's own persistent storage (not the cache) and recorded as pending; it is deleted only after Lychee accepted it (upload `done`, or `skipped` as already in the gallery). Failed or interrupted uploads keep it. Pending photos are listed in Preferences (`pending_captures`: path, name, type, size, date, album, server). When the app has launched and whenever it returns to the foreground, every pending photo of the current server that isn't waiting or uploading joins the queue again (a failed row is retried, a missing one added) (Q-011-04). Photos taken for another server stay pending until that server is current again. Background uploads that continue after the app closes are Feature 012, which takes over the same pending files. | — | A file that can't be read is reported like any upload failure and kept. | — | Owner 2026-10-20 (Q-011-03) |
| FR-011-06 | Discard a stuck photo. | A failed row of a taken photo in the upload sheet offers **Delete photo** next to Retry; after a confirmation ("Delete this photo from the phone? It isn't in Lychee yet.") the local copy and its pending entry are removed. | Cancel keeps it. | — | — | Needed so a photo that can never upload (e.g. its album was deleted) isn't retried forever. |
| FR-011-05 | Phone gallery. | No copy in the phone's gallery; the only local copy is the pending file of FR-011-04 (Q-011-03). | — | — | — | Owner 2026-10-20 |

## Non-Functional Requirements

| ID | Requirement | Driver | Measurement | Dependencies | Source |
|----|-------------|--------|-------------|--------------|--------|
| NFR-011-01 | Metadata kept: Android uploads the camera app's file byte for byte; iOS writes the image once as JPEG (quality 1.0) with the full capture metadata, never re-encoding again. | Owner: "include GPS and camera information". | Device check: Lychee's info panel shows camera, exposure and location for a photo taken in the app. | NC-011-01, NC-011-02 | NFR-005-04 |
| NFR-011-02 | Capture flow and queueing are injected and tested in jsdom. | NFR-003-03. | Vitest. | — | — |
| NFR-011-03 | No new dependency (Q-011-01). | AGENTS.md. | `package.json` diff. | — | — |

## UI / Interaction Mock-ups

```
 "+" menu                                Camera (system UI)                 After "Use photo"
┌──────────────────────────────┐       ┌──────────────────────────────┐   ┌──────────────────────────────┐
│ ‹    Holidays          +     │       │                              │   │ Uploading to Holidays     ✕  │
│                ┌────────────────┐    │       (phone's camera)       │   │ IMG_20261020_181342.jpg      │
│                │ ☁ Upload photos │    │                              │   │ ███████████░░░░░  64%        │
│                │ 📷 Take photo   │    │      [ ◯ shutter ]           │   │                              │
│                │ 📁 Create album │    │                              │   │                              │
│                └────────────────┘    └──────────────────────────────┘   └──────────────────────────────┘
```

## Branch & Scenario Matrix

| Scenario ID | Description / Expected outcome |
|-------------|--------------------------------|
| S-011-01 | Take photo in an album → camera → Use photo → uploads into that album; Lychee shows camera make/model and exposure. |
| S-011-02 | From the album list → uploads into Unsorted. |
| S-011-03 | Android → the camera app's single-shot mode; the photo uploads with "Uploaded without GPS data" (GPS is a follow-up). |
| S-011-04 | iOS with location allowed → Lychee shows the location. |
| S-011-05 | Location off / denied → uploads with "Uploaded without GPS data". |
| S-011-06 | Cancel in the camera → nothing uploaded. |
| S-011-07 | iOS camera access denied → message. |
| S-011-08 | Album without upload rights → no Take photo. |
| S-011-09 | After a successful upload the local copy is gone. |
| S-011-10 | Airplane mode while uploading a taken photo → failed; close and reopen the app with network → it uploads by itself, then the copy is deleted. |
| S-011-11 | Force-quit right after taking a photo → reopen → it uploads. |
| S-011-12 | A taken photo whose album was deleted fails → Delete photo with confirmation removes it. |

## Test Strategy
- **Units (Vitest):** `takePhoto()` (platform branch, cancel, errors, file name); pending store (persist, remove on done/skipped, keep on failure, resume per server without duplicates, discard); queue `onSettled` hook; "+" menu item visibility.
- **Native:** Pixel 11 Pro and iPhone: S-011-01 … 09; EXIF/GPS checked in Lychee's info panel (Feature 008).

## Interface & Contract Catalogue

### Native Capabilities
| ID | Plugin / permission | Behaviour |
|----|---------------------|-----------|
| NC-011-01 | Android `OriginalMediaPlugin.capture({ name })`, `deleteCapture({ path })`, `hasCamera()` (Q-011-01, Q-011-05) | `ACTION_IMAGE_CAPTURE` with `EXTRA_OUTPUT` (a `FileProvider` URI, `files-path` `captures/`) to `files/captures/<name>`; the target path travels in the call's data; resolves `{ path, name, mimeType, size, modifiedAt }`; rejects `CANCELLED`, `NO_CAMERA`. Manifest `<queries>` for `IMAGE_CAPTURE`; no camera permission is declared, so none is needed. |
| NC-011-02 | iOS app-local plugin `OriginalCamera.capture({ name })`, `deleteCapture({ path })`, `hasCamera()` (Q-011-01) | `UIImagePickerController(.camera)`; writes `image` + `mediaMetadata` + GPS (`CLLocationManager`) with `CGImageDestination` to `Application Support/captures/<name>`; same result and errors; `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`. Registered from a `CAPBridgeViewController` subclass set in `Main.storyboard`. |

### UI States
| ID | State | Trigger / Expected outcome |
|----|-------|---------------------------|
| UI-011-01 | Take photo item | FR-011-01. |
| UI-011-02 | Camera messages | FR-011-02 failure path. |

## Telemetry & Observability
None.

## Documentation Deliverables
- Roadmap row 011 and backlog row 012 (background uploads); knowledge map; ADR-011-01; note in Feature 010's spec.

## Appendix

### What `@capacitor/camera` 8.2.6 does (read 2026-10-20)
- Android (`LegacyCameraFlow`): system camera via `ACTION_IMAGE_CAPTURE`, then always decodes the bitmap and re-compresses it as JPEG (`quality`, default 90), copying a fixed list of EXIF tags back (`ExifWrapper`: make, model, lens, exposure, GPS, dates). GPS present only if the camera app recorded it.
- iOS: `UIImagePickerController`; writes `image.jpegData` with `mediaMetadata` via `CGImageDestination`. Apple's picker supplies no GPS, and the plugin adds none.
