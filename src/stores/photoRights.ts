/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import type { AlbumKind } from "@/services/galleryParsers";

/** FR-007-02: which selection actions an album page offers. */
export type PhotoActions = { download: boolean; delete: boolean };

/**
 * FR-007-02: Download follows `can_download`; Delete follows `can_delete` in
 * regular albums and Unsorted only, because Lychee's delete from Recent,
 * Starred or On This Day does nothing for photos in real albums (spec Appendix).
 */
export function photoActionsFor(album: { id: string; kind: AlbumKind; canDownload: boolean; canDelete: boolean }): PhotoActions {
	const deletable = album.kind === "album" || (album.kind === "smart" && album.id === "unsorted");
	return { download: album.canDownload, delete: album.canDelete && deletable };
}
