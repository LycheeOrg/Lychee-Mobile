# Open Questions – Feature 003

Open questions for [Feature 003](spec.md). Log every high- and medium-impact question here (table row + Question Details entry) before asking the user; see [open-questions-format.md](../../spec-guidelines/open-questions-format.md). Once answered, fold the outcome into [spec.md](spec.md) (and an ADR when architecturally significant), then mark the entry resolved.

## Active Questions

| Question ID | Feature | Priority | Summary | Status | Opened | Updated |
|-------------|---------|----------|---------|--------|--------|---------|
| ~~Q-003-01~~ | 003 – Album browsing | High | Which Lychee API does browsing use? (A v2 paginated endpoints, Lychee ≥ 7.1.0; B v3 struct-of-arrays when the server enables it, else v2; C v3 only) | Resolved (Option A — v2 paginated endpoints, Lychee 7.1.0+; owner, 2026-10-19; spec FR-003-01, FR-003-02, FR-003-04; ADR-003-01) | 2026-10-19 | 2026-10-19 |
| ~~Q-003-02~~ | 003 – Album browsing | High | How are thumbnails loaded? (A `<img>` with the server's URLs, mixed content allowed on Android; B native HTTP into blob URLs; C images only from https servers) | Resolved (Option A — `<img>` with server URLs, `android.allowMixedContent`; owner, 2026-10-19; spec FR-003-03, NC-003-01; ADR-003-02) | 2026-10-19 | 2026-10-19 |
| ~~Q-003-03~~ | 003 – Album browsing | Medium | How is a large grid rendered? (A CSS grid, page-by-page infinite scroll, lazy images, no virtualisation; B `@tanstack/vue-virtual`; C hand-written virtualisation) | Resolved (Option A — CSS grid, infinite scroll, lazy images, no virtualisation; owner, 2026-10-19; spec FR-003-02, NFR-003-02, NFR-003-04) | 2026-10-19 | 2026-10-19 |
| ~~Q-003-04~~ | 003 – Album browsing | Medium | Password-protected albums and gallery passwords? (A prompt and unlock both; B show the lock, no unlocking yet) | Resolved (Option A — album and gallery unlock prompts; owner, 2026-10-19; spec FR-003-05) | 2026-10-19 | 2026-10-19 |
| ~~Q-003-05~~ | 003 – Album browsing | Medium | Sensitive (NSFW) albums? (A follow the server's settings: blur and warn as the web UI does; B show them like any album) | Resolved (Option A — follow the server: hide, blur and warn as the web UI; owner, 2026-10-19; spec FR-003-09) | 2026-10-19 | 2026-10-19 |
| ~~Q-003-06~~ | 003 – Album browsing | Medium | App structure? (A gallery becomes the start page, server and account move to a settings page; B keep the home page and add a Browse button) | Resolved (Option A — album list is the start page, settings page for server and account; owner, 2026-10-19; spec FR-003-08) | 2026-10-19 | 2026-10-19 |

## Question Details

### ~~Q-003-01~~ – Lychee API for browsing

**Context:** Read from Lychee 7.11.1 source and checked on `lapaglia.pics`:
- v2: `GET /api/v2/Albums` returns the whole root in one response (`smart_albums`, `pinned_albums`, `albums`, `shared_albums`, `tag_albums`, `person_albums`, each a list of album tiles with `thumb.thumb`/`thumb2x` URLs). `Album::head`, `Album::albums?page=` (30 per page) and `Album::photos?page=` (100 per page, 500 for smart albums) are paginated with `current_page`/`last_page`, and return full photo objects with size-variant URLs. Added in Lychee 7.1.0.
- v3: struct-of-arrays responses (parallel arrays per field), unpaginated, thumbnails through a binary `Asset` endpoint, details loaded in a second call. Behind `STRUCT_OF_ARRAY_ENABLED`, **off by default** (401/403 when off); off on `lapaglia.pics`. Lychee 7.8.4+.

- **Option A (chosen):** v2 only. Browsing requires Lychee 7.1.0 or newer; a server reporting an older version gets "Album browsing needs Lychee 7.1 or newer."; a hidden version is tried anyway.
  - ✅ Works on every server with default settings; one code path; pages map naturally to infinite scroll.
  - ❌ Larger payloads than v3 (full photo objects).
- **Option B:** v3 when `Gallery::Init` reports `is_struct_of_array_enabled`, v2 otherwise.
  - ✅ Faster on servers that enable it.
  - ❌ Two code paths and fixture sets for one PoC; few servers enable it.
- **Option C:** v3 only.
  - ❌ Fails on servers with default settings, including `lapaglia.pics`.

### ~~Q-003-02~~ – Loading thumbnails

**Context:** v2 image URLs are, by default, static `{server}/uploads/...` files that need no cookie. With "secure image links" they become `{server}/image/<encrypted>`, and with "temporary image links" they carry `?expires=&signature=` (24 h by default); neither needs a cookie. So a plain `<img src>` works for every mode. Two WebView limits:
- Android serves the app from `https://localhost` and blocks `http://` images (mixed content) unless `android.allowMixedContent` is set in `capacitor.config.ts`. That matters for local-network http servers (ADR-001-02).
- iOS's WebView has its own cookie store, separate from the native one used for API calls (ADR-001-01); irrelevant while images need no cookie.

- **Option A (chosen):** render `<img>` with the URLs from the API. Set `android.allowMixedContent: true`; the app only ever renders URLs returned by the connected server, which is https or a local-network host (ADR-001-02). On an image error after a temporary link expired, reloading the album refreshes the URLs.
  - ✅ Browser caching, lazy loading and decoding for free; no per-image JS work.
  - ❌ Android's WebView allows http sub-resources from any host, guarded only by the app showing server URLs.
- **Option B:** download each image through native HTTP and show it as a blob URL.
  - ✅ No WebView exception; would carry cookies if a server protects images.
  - ❌ CapacitorHttp returns binary bodies as base64 through the bridge: slow and memory-heavy for a grid of hundreds of thumbnails; no HTTP cache.
- **Option C:** show images only for https servers; local http servers browse without pictures.
  - ❌ Breaks the main home-server case.

### ~~Q-003-03~~ – Rendering large grids

**Context:** an album page has up to 100 photos (500 in smart albums); albums can hold thousands. Ionic removed its virtual scroll in v7. Lychee's web UI virtualises with `@tanstack/vue-virtual`. Adding a library needs owner approval (AGENTS.md).

- **Option A (chosen):** a CSS grid of square thumbnails (3 columns on phones, more on wider screens), `ion-infinite-scroll` loading the next page near the end, `<img loading="lazy" decoding="async">` with `thumb`/`thumb2x` by pixel density. No virtualisation; measure on the Pixel with the largest album available and revisit only if scrolling degrades.
  - ✅ No dependency; simplest; the browser skips off-screen image decoding.
  - ❌ DOM grows with every page; a 5 000-photo album fully scrolled keeps 5 000 nodes.
- **Option B:** `@tanstack/vue-virtual` (as Lychee's web UI).
  - ✅ Constant DOM size.
  - ❌ New dependency; more code for a PoC.
- **Option C:** hand-written row virtualisation.
  - ❌ Most code to maintain.

### ~~Q-003-04~~ – Password-protected albums and gallery passwords

**Context:**
- A public album with a password appears in lists with `is_locked: true` and no cover. Opening it fails with `PasswordRequiredException`. `POST /api/v2/Album::unlock {album_id, password}` adds it to the session's unlocked albums (wrong password → 403, throttled to 10 per minute).
- Since 7.10.0 a whole gallery can have a password: every gallery call from a guest fails with `GalleryPasswordRequiredException` (401) until `POST /api/v2/Gallery::unlock {password}`, which sets a 30-day `lychee_gallery_unlock` cookie.
- Both unlocks live in cookies, which the native cookie store keeps (ADR-001-01, ADR-002-01).

- **Option A (chosen):** support both. Locked tiles show a lock; opening one asks for the album password. A locked gallery shows a password prompt in place of the album list, with a Sign in link.
  - ✅ Covers how many self-hosted galleries are shared with family; two small endpoints.
  - ❌ Two more prompts to build and test.
- **Option B:** show locked albums with a lock and "Open this album in the browser to unlock it."; a locked gallery shows "This gallery needs a password. Sign in instead." Unlocking moves to the backlog.
  - ✅ Smaller.
  - ❌ Guests of password-protected galleries can't use the app.

### ~~Q-003-05~~ – Sensitive (NSFW) albums

**Context:** Lychee marks albums `is_nsfw`. The server already decides whether they are listed (`are_nsfw_visible`); `Gallery::Init` and `Album::head` tell the client whether to blur covers (`is_nsfw_background_blurred`) and show a warning before opening (`is_nsfw_warning_visible`).

- **Option A (chosen):** follow the server: blur NSFW covers when it says so, and show its warning with Continue before opening an NSFW album when `is_nsfw_warning_visible`, once per album per launch.
  - ✅ Same behaviour as the web UI; respects the admin's choice; app-store friendlier.
  - ❌ One more state and an `Init` call.
- **Option B:** show NSFW albums like any other.
  - ✅ Simplest.
  - ❌ Ignores the admin's settings; risky for store review.

### ~~Q-003-06~~ – App structure

**Context:** today the start page holds the server field and the account line (Features 001/002). Feature 002 planned to move both to a settings page once browsing exists.

- **Option A (chosen):** the album list becomes the start page (`/albums`, album pages at `/albums/:id`). Server and account move unchanged to `/settings`, opened from a gear button in the album list's toolbar. With no stored server the app opens `/settings`; after Connect and sign-in (or Continue as guest) it goes to `/albums`.
  - ✅ Opens straight into photos; settings stay reachable.
  - ❌ Moves Feature 001/002 UI, with their device checks redone briefly.
- **Option B:** keep the home page and add a Browse button.
  - ✅ No moves.
  - ❌ An extra tap on every launch.
