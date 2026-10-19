/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { vi } from "vite-plus/test";
import type { Gallery, GalleryResult, UnlockResult } from "@/services/gallery";
import type { AlbumHead, AlbumTile, Page, PhotoTile, RootAlbums } from "@/services/galleryParsers";

export const ok = <T>(value: T): GalleryResult<T> => ({ kind: "ok", value });

export function albumTile(id: string, overrides: Partial<AlbumTile> = {}): AlbumTile {
	return { id, title: id, thumb: null, photoCount: null, isLocked: false, isNsfw: false, ...overrides };
}

export function photoTile(id: string): PhotoTile {
	const none = { medium2x: null, medium: null, original: null, small2x: null, small: null, thumb2x: null, thumb: null };
	return { id, title: id, kind: "photo", thumb: null, variants: none, liveUrl: null };
}

export function head(overrides: Partial<AlbumHead> = {}): AlbumHead {
	return { id: "a1", title: "Holidays", kind: "album", hasSubAlbums: false, nsfwWarning: false, ...overrides };
}

export function page<T>(items: T[], current: number, last: number, total = items.length): Page<T> {
	return { items, page: current, lastPage: last, total };
}

/** A gallery whose calls answer from queues; an empty queue answers `failed`. */
export function fakeGallery(answers: {
	root?: GalleryResult<RootAlbums>[];
	settings?: GalleryResult<{ nsfwVisible: boolean; nsfwBlurred: boolean }>[];
	head?: GalleryResult<AlbumHead>[];
	albums?: GalleryResult<Page<AlbumTile>>[];
	photos?: GalleryResult<Page<PhotoTile>>[];
	unlock?: UnlockResult[];
}) {
	const next = <T>(queue: T[] | undefined, fallback: T): T => queue?.shift() ?? fallback;
	const failed = { kind: "failed" as const };
	return {
		root: vi.fn<Gallery["root"]>(async () => next(answers.root, failed)),
		settings: vi.fn<Gallery["settings"]>(async () => next(answers.settings, failed)),
		head: vi.fn<Gallery["head"]>(async () => next(answers.head, failed)),
		albums: vi.fn<Gallery["albums"]>(async () => next(answers.albums, failed)),
		photos: vi.fn<Gallery["photos"]>(async () => next(answers.photos, failed)),
		unlockAlbum: vi.fn<Gallery["unlockAlbum"]>(async () => next(answers.unlock, failed)),
		unlockGallery: vi.fn<Gallery["unlockGallery"]>(async () => next(answers.unlock, failed)),
	} satisfies Gallery;
}

export function context(gallery: Gallery, signedIn = false) {
	return { gallery, signedIn, onUnauthenticated: vi.fn(async () => undefined) };
}
