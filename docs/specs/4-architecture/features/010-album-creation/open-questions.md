# Open Questions – Feature 010

Open questions for [Feature 010](spec.md). Log every high- and medium-impact question here (table row + Question Details entry) before asking the user; see [open-questions-format.md](../../spec-guidelines/open-questions-format.md). Once answered, fold the outcome into [spec.md](spec.md) (and an ADR when architecturally significant), then mark the entry resolved.

## Active Questions

| Question ID | Feature | Priority | Summary | Status | Opened | Updated |
|-------------|---------|----------|---------|--------|--------|---------|
| ~~Q-010-01~~ | 010 – Album creation | Medium | How does the "+" menu open? (A a small dropdown under the button, like the web UI; B an action sheet from the bottom of the screen) | Resolved (Option A — dropdown under the "+"; owner, 2026-10-20; spec FR-010-01) | 2026-10-20 | 2026-10-20 |
| ~~Q-010-02~~ | 010 – Album creation | Medium | What happens after an album is created? (A open the new album, like the web UI; B stay and show it in the list) | Resolved (Option A — open the new album; owner, 2026-10-20; spec FR-010-03) | 2026-10-20 | 2026-10-20 |
| ~~Q-010-03~~ | 010 – Album creation | Medium | Where is Create album offered? (A on the album list and in regular albums wherever the server allows creating, i.e. edit rights; B exactly where the web UI shows it, i.e. upload rights, even where the server then refuses; C only on the album list) | Resolved (Option A — wherever the server allows, i.e. edit rights; owner, 2026-10-20; spec FR-010-02) | 2026-10-20 | 2026-10-20 |

## Question Details

### ~~Q-010-01~~ – Menu form

**Context:** Lychee's web UI opens a context menu under its "+" button. Ionic offers a popover anchored to the button (`IonPopover` with `trigger`) or an action sheet sliding up from the bottom (`IonActionSheet`, Android/iOS native look).

- **Option A (recommended, chosen):** a popover under the "+" with two rows, icon and label.
  - ✅ Matches the web UI and the owner's "under it".
  - ✅ Close to the button that opened it.
  - ❌ A smaller tap target than an action sheet.
- **Option B:** an action sheet from the bottom with the two items and Cancel.
  - ✅ Large, thumb-friendly buttons; the platforms' standard.
  - ❌ Not "under" the button; looks different from the web UI.

### ~~Q-010-02~~ – After creating

**Context:** The web UI (`AlbumCreateDialog.vue`) navigates to the new album. An empty new album shows "This album is empty."; from there the user can upload into it with the same "+" menu.

- **Option A (recommended, chosen):** open the new album; the page it came from reloads its albums when the user goes back.
  - ✅ Same as the web UI; ready to upload into it.
  - ❌ To create several albums in a row, go back each time.
- **Option B:** stay, and reload the current list so the new album appears.
  - ✅ Quick to create several.
  - ❌ An extra tap to fill the new album.

### ~~Q-010-03~~ – Where Create album is offered

**Context:** The server allows creating an album when the user may edit the parent (`AlbumPolicy::CAN_EDIT`; at the top level, any user who may upload). The web UI shows its "+" when the user may upload, and its New album item in every regular album, so a user with upload but not edit rights on a shared album sees New album and gets an error.

- **Option A (recommended, chosen):** Create album where the server allows it: the album list when `Albums` `rights.can_edit`, a regular album when its `rights.can_edit`. Upload photos keeps its own rule; the "+" shows when either item does.
  - ✅ Never offers what the server refuses.
  - ❌ Slightly different from the web UI on shared albums.
- **Option B:** exactly as the web UI: the "+" with can_upload, Create album in every regular album.
  - ✅ Identical to the web.
  - ❌ Errors on shared albums without edit rights.
- **Option C:** only on the album list.
  - ✅ Simplest.
  - ❌ No sub-albums from the phone.
