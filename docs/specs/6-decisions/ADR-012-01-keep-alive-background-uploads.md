# ADR-012-01: Keep the app alive for background uploads

- **Status:** Accepted
- **Date:** 2026-10-20
- **Related features/specs:** Feature 012 (docs/specs/4-architecture/features/012-background-uploads/spec.md), Features 005, 011
- **Related open questions:** Q-012-01, Q-012-02

## Context

The upload queue (Feature 005) runs in the app's JavaScript. Android keeps that JavaScript running in the background (Capacitor's `KeepRunning`), but freezes or kills background apps unless they run a foreground service. iOS suspends the WebView a few seconds after the user leaves; only `beginBackgroundTask` (about 30 s) or a native background `URLSession` lets work go on. The owner wants uploads to continue while using other apps, and nothing to be lost when the app is closed.

## Decision

- **One uploader:** the TypeScript queue and upload code stay the only implementation.
- **Keep alive while a run lasts:** a JavaScript runner calls a native `UploadKeepAlive` plugin: `start` when a run starts, `update` with "Uploading N of M" and progress (at most once a second), `stop` when it ends.
  - **Android:** a foreground service `UploadService` (`foregroundServiceType="dataSync"`) with a low-importance notification channel "Uploads" showing the progress; permissions `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC`, `POST_NOTIFICATIONS` (asked when the first upload starts; refusing only hides the notification). Started while the app is in the foreground (where a run starts), as Android 12+ requires.
  - **iOS:** `beginBackgroundTask` for the run, ended on `stop` or when iOS expires it; the interrupted file fails and is retried when the app returns.
- **Nothing lost:** every queued file goes into the pending list of Feature 011 with a cleanup kind: `capture` (delete the taken photo's file), `copy` (iOS: the picker's temporary file moved into `Library/pending/`, deleted after upload), `grant` (Android: persistable read access taken in `pick()`, released after upload). Unfinished files rejoin the queue after launch and on resume.

## Consequences

### Positive
- Android uploads run for as long as needed while the user is in other apps, with a visible notification.
- No second upload implementation; no dependency.
- Closing the app loses no upload.

### Negative
- iOS uploads stop about 30 s after leaving the app; a native background uploader would be a separate feature.
- Android 15 limits `dataSync` services to 6 h per 24 h; the queue then pauses until the app is opened.
- Three Android permissions; Google Play reviews foreground service use (a user-started upload is an accepted `dataSync` use).
- iOS copies of picked files use storage until uploaded.

## Alternatives Considered

- **Native background uploaders on both platforms (Q-012-01 B):** uploads would continue after the app is closed, but the chunked upload would exist three times, and Android would need WorkManager.
- **Android service, iOS native uploader (Q-012-01 C):** full background on iOS, at the cost of a Swift upload implementation.
- **Only taken photos survive a closed app (Q-012-02 B):** simpler, but picked uploads would be dropped silently.

## Security / Privacy Impact

The notification shows only counts, not file names. Persistable access covers only the items the user picked and is released after upload. iOS copies stay in app-private storage.

## Operational Impact

Play Console: declare the `dataSync` foreground service (with the Feature 009 photo permission declaration, runbook-releases).

## Links

- Related spec sections: FR-012-01 … 04, NC-012-01 … 03
- Related ADRs: ADR-005-01, ADR-011-01
