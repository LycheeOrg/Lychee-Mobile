/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { reactive } from "vue";
import type { AlbumSection, AlbumTile, GallerySettings } from "@/services/galleryParsers";

/** Used when `Gallery::Init` can't be read (FR-003-09). */
export const DEFAULT_SETTINGS: GallerySettings = { nsfwVisible: true, nsfwBlurred: false, exifDisabled: false };

/** FR-003-09: the server's NSFW settings and whether the user chose Show, for every page. */
export type SensitiveDisplay = { settings: GallerySettings; revealed: boolean };

export function createSensitiveDisplay(): SensitiveDisplay {
	return reactive({ settings: { ...DEFAULT_SETTINGS }, revealed: false });
}

/** The app-wide display state; Show lasts until the app restarts. */
export const sensitiveDisplay = createSensitiveDisplay();

/** Whether sensitive albums are shown. */
export function showsSensitive(display: SensitiveDisplay): boolean {
	return display.settings.nsfwVisible || display.revealed;
}

/** FR-003-09: sections without the hidden sensitive albums, and how many were hidden. */
export function visibleSections(sections: AlbumSection[], showSensitive: boolean): { sections: AlbumSection[]; hiddenCount: number } {
	if (showSensitive) {
		return { sections, hiddenCount: 0 };
	}
	const filtered = sections.map((section) => ({ ...section, albums: section.albums.filter((album) => !album.isNsfw) }));
	const total = (list: AlbumSection[]) => list.reduce((sum, section) => sum + section.albums.length, 0);
	return { sections: filtered.filter((section) => section.albums.length > 0), hiddenCount: total(sections) - total(filtered) };
}

/** FR-003-09 for a plain list of tiles, such as an album's sub-albums. */
export function visibleAlbums(albums: AlbumTile[], showSensitive: boolean): { albums: AlbumTile[]; hiddenCount: number } {
	const { sections, hiddenCount } = visibleSections([{ key: "albums", albums }], showSensitive);
	return { albums: sections[0]?.albums ?? [], hiddenCount };
}
