# Open Questions – Feature 006

Open questions for [Feature 006](spec.md). Log every high- and medium-impact question here (table row + Question Details entry) before asking the user; see [open-questions-format.md](../../spec-guidelines/open-questions-format.md). Once answered, fold the outcome into [spec.md](spec.md) (and an ADR when architecturally significant), then mark the entry resolved.

## Active Questions

| Question ID | Feature | Priority | Summary | Status | Opened | Updated |
|-------------|---------|----------|---------|--------|--------|---------|
| ~~Q-006-01~~ | 006 – Stored credentials | High | Where are the username and password stored? (A `@aparajita/capacitor-secure-storage` 8.0.1; B the app's own native code on both platforms; C `capacitor-secure-storage-plugin` 0.13.0) | Resolved (Option A — `@aparajita/capacitor-secure-storage` 8.0.1, dependency approved by the owner; owner, 2026-10-19; spec FR-006-01, NFR-006-01, NFR-006-03; ADR-006-01) | 2026-10-19 | 2026-10-19 |
| ~~Q-006-02~~ | 006 – Stored credentials | High | When does the app log in with the stored credentials? (A whenever Lychee says the session is gone: at launch and on a 401, then retry once; B on a timer before the 2-hour session ends; C both) | Resolved (Option A — on demand at launch and on a 401, retry once, shared login; owner, 2026-10-19; spec FR-006-02, NFR-006-02) | 2026-10-19 | 2026-10-19 |
| ~~Q-006-03~~ | 006 – Stored credentials | Medium | What happens when a silent login fails? (A wrong password: forget the credentials and open sign-in with the username filled in; throttled or offline: keep them and show the message; B keep them always and retry on the next launch) | Resolved (Option A — wrong password forgets and opens sign-in prefilled; throttle/offline keep; owner, 2026-10-19; spec FR-006-03) | 2026-10-19 | 2026-10-19 |
| ~~Q-006-04~~ | 006 – Stored credentials | Medium | Any protection beyond the device lock? (A no: Keychain "this device only, after unlock", Keystore key without user authentication, no iCloud sync; B Face ID / fingerprint before every silent login; C store only when the user ticks "Stay signed in") | Resolved (Option A — no extra prompt, `afterFirstUnlockThisDeviceOnly`, no iCloud sync; owner, 2026-10-19; spec FR-006-01, NFR-006-03) | 2026-10-19 | 2026-10-19 |

## Question Details

### ~~Q-006-01~~ – Secure storage

**Context:** The owner asked (2026-10-19) to store the username and password securely and use them to log in for a fresh session, without `remember_me`. This reverses ADR-002-01 (Q-002-01 Option A); storing credentials was Q-002-01 Option C. Capacitor has no built-in secure storage; `@capacitor/preferences` is plain storage. Read from the packages (2026-10-19):
- `@aparajita/capacitor-secure-storage` 8.0.1 (MIT, 2026-09-23; 8.0.0 2026-02-10): Android AES/GCM with a key in the Android Keystore, ciphertext in SharedPreferences; iOS Keychain through the `KeychainSwift` Swift package, with an optional iCloud Keychain sync switch. Declares `@capacitor/app` and `@capacitor/keyboard` as runtime dependencies.
- `capacitor-secure-storage-plugin` 0.13.0 (MIT, 2026-01-10): Android Keystore RSA/ECB/PKCS1Padding; iOS `SwiftKeychainWrapper`.
- Own native code: an app-local plugin like `OriginalMediaPlugin` on Android (Keystore AES/GCM) plus an app-local Swift plugin on iOS (Security framework `SecItem*`).

- **Option A (chosen):** `@aparajita/capacitor-secure-storage` pinned to `8.0.1`, iCloud sync off.
  - ✅ Maintained for Capacitor 8; modern Android scheme (AES-GCM, Keystore); little code of ours.
  - ❌ New dependency with a transitive Swift package and an unneeded `@capacitor/keyboard` dependency; needs owner approval.
- **Option B:** our own native code on both platforms.
  - ✅ No dependency; exact control over Keychain accessibility and Keystore settings.
  - ❌ Security-sensitive code of our own in Java and Swift, tested on devices only; the first app-local iOS plugin (custom bridge view controller).
- **Option C:** `capacitor-secure-storage-plugin` 0.13.0.
  - ✅ Small.
  - ❌ Older Android scheme (RSA PKCS#1 v1.5); third-party iOS wrapper.

### ~~Q-006-02~~ – When to log in

**Context:** The session cookie lasts 120 minutes. Without `remember_me`, Lychee forgets the user when it expires: `Auth::user` reads as a guest and gallery calls answer 401 (FR-003-06), uploads too (FR-005-03). Each login counts against Lychee's 10-per-hour throttle (API-002-01).

- **Option A (chosen):** log in on demand. At launch, when `Auth::user` reads guest but credentials are stored, log in silently. During use, the first 401 from a gallery or upload call triggers one silent login and the call is sent again once; concurrent 401s share that one login. The user never sees the expiry.
  - ✅ Logs in only when needed (at most about once per 2 hours of use); no timers.
  - ❌ The first call after expiry takes one extra round trip.
- **Option B:** refresh on a timer, e.g. every 110 minutes while the app is open.
  - ✅ No failed call first.
  - ❌ Timers stop in the background, so launch and 401 handling are needed anyway; extra logins while idle.
- **Option C:** both.
  - ❌ Most logic for little gain.

### ~~Q-006-03~~ – Failed silent login

**Context:** A silent login can fail because the password changed on the server (401), the throttle hit (429), or the server is unreachable.

- **Option A (chosen):** 401 → delete the stored credentials, mark signed out, and open the sign-in page with the username filled in and "Your password changed or was reset. Sign in again."; 429 or unreachable → keep the credentials, show the usual message for the call, try again at the next 401 or launch.
  - ✅ No login loops with a wrong password; temporary problems don't sign the user out.
  - ❌ A wrong password the server answers with something other than 401 isn't caught.
- **Option B:** keep the credentials whatever happens; show sign-in only when the user acts.
  - ✅ Simplest.
  - ❌ A changed password would be retried on every expiry, burning the throttle.

### ~~Q-006-04~~ – Extra protection

**Context:** Stored credentials are as safe as the device's secure storage. Options for more: a biometric prompt (another plugin), or storing only on request.

- **Option A (chosen):** no extra prompt. iOS Keychain item `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` (not synced, not in backups to other devices); Android Keystore key without user-authentication requirement. Sign out and server changes delete the credentials.
  - ✅ Seamless, which is the point of the change.
  - ❌ Anyone who can use the unlocked phone can use the app as the user.
- **Option B:** require Face ID / fingerprint before each silent login.
  - ✅ Stronger.
  - ❌ A prompt about every 2 hours of use; another plugin.
- **Option C:** a "Stay signed in" switch on the sign-in page; without it, nothing is stored and the session simply ends after 2 hours.
  - ✅ The user chooses.
  - ❌ One more control; the default must be decided.

**Note (2026-10-19):** the owner asked whether the credentials could be kept in the Keychain / Keystore without a dependency; the agent explained Option B (platform APIs, app-local plugins on both platforms); the owner then chose Option A for all four questions, which approves `@aparajita/capacitor-secure-storage`.
