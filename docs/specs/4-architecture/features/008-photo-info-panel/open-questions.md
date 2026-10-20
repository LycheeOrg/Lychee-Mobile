# Open Questions – Feature 008

Open questions for [Feature 008](spec.md). Log every high- and medium-impact question here (table row + Question Details entry) before asking the user; see [open-questions-format.md](../../spec-guidelines/open-questions-format.md). Once answered, fold the outcome into [spec.md](spec.md) (and an ADR when architecturally significant), then mark the entry resolved.

## Active Questions

| Question ID | Feature | Priority | Summary | Status | Opened | Updated |
|-------------|---------|----------|---------|--------|--------|---------|
| ~~Q-008-01~~ | 008 – Photo info panel | High | How is the location map shown? (A a static map built from Lychee's tile provider, no dependency, tap opens the maps app; B an interactive Leaflet map like the web UI, new dependency; C no map, coordinates and address with a button to open the maps app) | Resolved (Option A — static map from Lychee's tile provider, tap opens the maps app; owner, 2026-10-20; spec FR-008-05, NFR-008-04, NFR-008-05, API-008-03; ADR-008-01) | 2026-10-20 | 2026-10-20 |
| ~~Q-008-02~~ | 008 – Photo info panel | Medium | What form does the panel take? (A a bottom sheet over the viewer, half height and draggable to full, following the photo on screen; B a full-screen page sliding in; C swipe up on the photo to reveal it below, like iOS Photos) | Resolved (Option A — sheet over the viewer at half height, draggable to full; owner, 2026-10-20; spec FR-008-01) | 2026-10-20 | 2026-10-20 |
| ~~Q-008-03~~ | 008 – Photo info panel | Medium | Which sections? (A everything read-only from the web panel that fits a phone: header, dates, description, tags, albums, EXIF, location, license; no rating, statistics, faces, palette; B only dates, EXIF and location; C also the rating widget and statistics) | Resolved (Option A — read-only header, dates, description, tags, albums, EXIF, location, license; owner, 2026-10-20; spec FR-008-02 … 06, Non-Goals) | 2026-10-20 | 2026-10-20 |
| ~~Q-008-04~~ | 008 – Photo info panel | Medium | Lychee 7.1.x keeps camera, focal length, address and coordinates elsewhere. How is it handled? (A show what 7.2.0+'s shape provides, so 7.1.x gets a shorter panel; B also read the 7.1.x fields; C raise the app's minimum Lychee version to 7.2.0) | Resolved (Option A — 7.2.0+ shape only, shorter panel on 7.1.x; owner, 2026-10-20; spec FR-008-07) | 2026-10-20 | 2026-10-20 |

## Question Details

### ~~Q-008-01~~ – Location map

**Context:** Lychee's web panel shows a Leaflet map (`MapInclude.vue`) with tiles from the provider configured on the server (`GET /api/v2/Map::provider` → `layer` URL template and attribution; OpenStreetMap.org, .de, .fr or RRZE). The map shows only when the album's `config.is_map_accessible` is true. The app has no map library. Tile servers such as tile.openstreetmap.org ask apps to identify themselves; requests from the WebView carry a browser User-Agent and the app's local origin, the same for Leaflet or plain `<img>` tiles. To be checked on a device.

- **Option A (recommended, chosen):** a static map: the 3 × 3 tiles around the photo at zoom 15 from Lychee's provider, placed with CSS, a marker at the exact point, the provider's attribution; tapping it opens the phone's maps app (`geo:` / `maps://`).
  - ✅ Looks like the web panel; no dependency.
  - ✅ Simple, small code (tile maths is a few lines).
  - ❌ No pinch or pan in the panel (the maps app covers that).
- **Option B:** Leaflet (`leaflet`, MIT, ~40 kB gzipped) like the web UI.
  - ✅ Interactive zoom and pan; same component model as Lychee.
  - ❌ New dependency and its CSS; gestures compete with the sheet's drag.
- **Option C:** no map; coordinates and address with an "Open in Maps" button.
  - ✅ Simplest; no tile traffic.
  - ❌ Unlike the screenshot the owner showed.

### ~~Q-008-02~~ – Panel form

**Context:** The viewer (Feature 004) is a full-screen modal with Swiper; its overlay holds Close, the title and the counter. Ionic's `IonModal` supports sheet modals with breakpoints.

- **Option A (recommended, chosen):** a sheet modal over the viewer with breakpoints at 0.5 and 1, opened by the "i" button; the photo stays visible above at half height and can still be swiped; the panel follows the photo on screen.
  - ✅ Familiar on both platforms (Google Photos, Apple Maps style); compare the photo and its data.
  - ✅ Built into Ionic.
  - ❌ At half height the panel covers the lower half of the photo.
- **Option B:** a full-screen page sliding in from the right, with Back.
  - ✅ The most room for content.
  - ❌ The photo is hidden; going to the next photo means closing it.
- **Option C:** swipe up on the photo to reveal the panel below it (iOS Photos).
  - ✅ No button needed.
  - ❌ Conflicts with Swiper's vertical gestures and zoom; more work.

### ~~Q-008-03~~ – Sections

**Context:** Lychee's web panel (`PhotoDetails.vue`) shows: header (title, resolution, size, palette), dates, description, tags, albums, EXIF, location and map, license, statistics (when metrics are on), a rating widget (when ratings are on) and people (face recognition).

- **Option A (recommended, chosen):** read-only header, dates, description, tags, albums, EXIF, location and map, license. Leave out palette, statistics, rating and people.
  - ✅ Everything the screenshot shows except the rating; no editing.
  - ❌ Rating, which the web panel lets you set, isn't there.
- **Option B:** only dates, EXIF and location.
  - ✅ Smallest.
  - ❌ No albums or description, which the screenshot shows.
- **Option C:** A plus the rating widget (setting a rating, `POST Photo::setRating`) and statistics.
  - ✅ Closest to the web panel.
  - ❌ Adds the first write action to the viewer; more API and UI.

### ~~Q-008-04~~ – Lychee 7.1.x

**Context:** The app supports Lychee 7.1.0 and later (`MIN_BROWSING_VERSION`). In 7.1.x, `make`, `model`, `focal`, `location` and decimal coordinates sit on the photo itself; from 7.2.0 they are in `preformatted`/`precomputed`. The albums call exists from 7.4.0.

- **Option A (recommended, chosen):** read only the 7.2.0+ shape; on 7.1.x the panel has no camera, focal length, address or map; the albums section is left out before 7.4.0.
  - ✅ One code path; nothing breaks on old servers.
  - ❌ Shorter panel on 7.1.x.
- **Option B:** also read the 7.1.x top-level fields.
  - ✅ Full panel on 7.1.x.
  - ❌ A second parsing path for an old release.
- **Option C:** raise the minimum to Lychee 7.2.0 for the whole app.
  - ✅ Simplest model.
  - ❌ Users of 7.1.x lose the app, not just a few lines.
