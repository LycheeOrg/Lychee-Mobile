# Open Questions – Feature 009

Open questions for [Feature 009](spec.md). Log every high- and medium-impact question here (table row + Question Details entry) before asking the user; see [open-questions-format.md](../../spec-guidelines/open-questions-format.md). Once answered, fold the outcome into [spec.md](spec.md) (and an ADR when architecturally significant), then mark the entry resolved.

## Active Questions

| Question ID | Feature | Priority | Summary | Status | Opened | Updated |
|-------------|---------|----------|---------|--------|--------|---------|
| ~~Q-009-01~~ | 009 – Usability fixes | High | When are stored credentials used, and where does the user go when they fail? (A try them everywhere first: Connect, launch even when the account check failed, and once more on a 401 while browsing; only when they are missing or rejected open Settings with a message; B the same, but open the Sign in page on failure; C only fix the Connect path) | Resolved (Option A — stored credentials on every path, cooldown removed, failures open Settings; owner, 2026-10-20; spec FR-009-03) | 2026-10-20 | 2026-10-20 |
| ~~Q-009-02~~ | 009 – Usability fixes | Medium | How does the combined Settings page work? (A one Save button that checks the server and signs in with the typed or stored password; Sign out stays; empty username and password browse as guest; the Sign in page is removed; B Connect and Sign in as two buttons on Settings, Sign in page kept for failures; C fields on Settings and the Sign in page both kept) | Resolved (Option A — one Save button, Sign in page removed; owner, 2026-10-20; spec FR-009-04) | 2026-10-20 | 2026-10-20 |
| ~~Q-009-03~~ | 009 – Usability fixes | High | How do Android uploads keep the camera's file name, which the photo picker hides? (A ask for photo and video read access on the first upload and read the real name from MediaStore, falling back to the picker's name when refused; B name files from their capture date, e.g. `IMG_20261020_121813.jpg`, no permission; C leave as is) | Resolved (Option A — ask for photo and video access, real names from MediaStore; owner, 2026-10-20; spec FR-009-05, NC-009-02; ADR-009-01) | 2026-10-20 | 2026-10-20 |

## Question Details

### ~~Q-009-01~~ – Using stored credentials before any sign-in screen

**Context:** At launch the app already reads the account and, when the session ended, signs in silently with the stored credentials (FR-006-02). Paths that still end on a sign-in screen with credentials stored:
- **Settings → Connect** reads the account and, when signed out, opens the Sign in page without trying the stored credentials. This is also the first-launch path, and on iOS the Keychain keeps credentials across a reinstall.
- **Launch when the account check fails** (timeout, server error): status stays "unknown", so no silent sign-in is tried.
- **A 401 while browsing within 60 s of a silent sign-in** (NFR-006-02 cooldown): no second try, so the album list shows "Your session ended. Sign in again."
- **The server rejects the stored password**: the Sign in page opens prefilled (FR-006-03); that one is intended.

Which of these the owner sees isn't known yet; Option A covers all of them.

- **Option A (recommended, chosen):** stored credentials are tried before any sign-in screen on every path above: Connect signs in with them; launch tries them when the account can't be read; a 401 while browsing gets one try per page load even inside the cooldown. Only when there are none, or the server rejects them, the app opens Settings (with the fields of FR-009-04) and a message.
  - ✅ No sign-in screen while saved credentials still work.
  - ✅ Failures land where the fields now are (Q-009-02 A).
  - ❌ Slightly more login traffic when a server is misbehaving (still one at a time).
- **Option B:** as A, but failures open the existing Sign in page.
  - ✅ Keeps the dedicated page.
  - ❌ Two places to enter credentials.
- **Option C:** only fix Connect.
  - ✅ Smallest change.
  - ❌ The other paths may be the one the owner sees.

### ~~Q-009-02~~ – The combined Settings page

**Context:** Settings has the server address and Connect, then "Signed in as … / Sign out" or a Sign in button that opens the Sign in page (username, password, Continue as guest, a note for OAuth/passkey servers). Lychee keeps the session; the app stores username and password (ADR-006-01).

- **Option A (recommended, chosen):** Settings shows Server address, Username and Password and one **Save** button. Save checks the server, then signs in with the username and the typed password, or the stored password when the field is blank and the username is unchanged. Errors show under the fields. The password field is always empty, with the placeholder "Leave blank to keep the existing password" when credentials are stored. "Signed in as …" with **Sign out** stays. Leaving username and password empty saves the server and browses as a guest. The Sign in page is removed; its OAuth/passkey note moves to Settings.
  - ✅ One place for everything, as asked.
  - ✅ Removes a page and a navigation path.
  - ❌ Changing only the server and keeping the account needs no extra step, but signing in to a new server needs the password typed again (credentials belong to one server, FR-006-04).
- **Option B:** the same fields, but **Connect** and **Sign in** as two buttons; the Sign in page stays for failures.
  - ✅ Clear separation of server and account.
  - ❌ Two buttons for one form; the page stays.
- **Option C:** fields on Settings and the Sign in page both kept.
  - ✅ No removal.
  - ❌ Duplicate forms.

### ~~Q-009-03~~ – Original file names on Android uploads

**Context:** Uploads send `file_name` = the picked file's name. Android's system photo picker reports `DISPLAY_NAME` as the media ID and extension (`1332.jpg`) instead of the camera's name (`PXL_20261020_121813123.jpg`), to be confirmed on the Pixel. The real name is in MediaStore under the same ID, readable only with `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO` (Android 13+) or `READ_EXTERNAL_STORAGE` (Android 12 and older). On Android 14+ the user may grant "limited access", which only covers the photos they choose in the system dialog. Google Play asks apps holding `READ_MEDIA_*` to declare why; a photo gallery client is an accepted use, but it is reviewed. iOS's picker already gives the original name.

- **Option A (recommended, chosen):** on the first Android upload, ask for photo and video access; when granted, `OriginalMediaPlugin` reads `DISPLAY_NAME` from MediaStore for each picked ID and uploads with it; when refused or limited, it falls back to the picker's name. Documented in an ADR.
  - ✅ Real original names, as asked.
  - ✅ The permission also covers future features (e.g. backup).
  - ❌ A broad permission prompt, and a Play Store declaration.
- **Option B:** when the picker gives a numeric name, name the file from its capture date (`IMG_yyyyMMdd_HHmmss.ext`, from EXIF or MediaStore's date taken).
  - ✅ No permission; readable names.
  - ❌ Not the original name (Pixel's `PXL_…` prefix and milliseconds are lost).
- **Option C:** leave as is.
  - ✅ No change.
  - ❌ Photos keep numeric titles.
