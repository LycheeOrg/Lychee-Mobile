/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

/**
 * Parsers for Lychee's v2 gallery responses (ADR-003-01). They turn raw JSON
 * into the app's own types and return `undefined` when a payload isn't
 * Lychee's; unknown fields are ignored (NFR-003-03).
 */

/** A thumbnail and its 2x variant for `srcset`. */
export type Thumb = { src: string; src2x: string | null };

/** DO-003-01. */
export type AlbumTile = { id: string; title: string; thumb: Thumb | null; photoCount: number | null; isLocked: boolean; isNsfw: boolean };

/** DO-003-02. */
export type PhotoKind = "photo" | "video" | "live" | "raw";
export type PhotoTile = { id: string; title: string; kind: PhotoKind; thumb: Thumb | null };

/** DO-003-03. */
export type SectionKey = "pinned" | "smart" | "albums" | "shared" | "tags" | "people";
export type AlbumSection = { key: SectionKey; albums: AlbumTile[] };
export type RootAlbums = { sections: AlbumSection[] };

/** DO-003-04. */
export type AlbumKind = "album" | "smart" | "tag" | "person";
export type AlbumHead = { id: string; title: string; kind: AlbumKind; hasSubAlbums: boolean; nsfwWarning: boolean };

/** DO-003-05. */
export type Page<T> = { items: T[]; page: number; lastPage: number };

/** DO-003-07. */
export type GallerySettings = { nsfwVisible: boolean; nsfwBlurred: boolean };

type Json = Record<string, unknown>;

/** Display order of the root sections (FR-003-01) and their fields. */
const SECTIONS: [SectionKey, string][] = [
	["pinned", "pinned_albums"],
	["smart", "smart_albums"],
	["albums", "albums"],
	["shared", "shared_albums"],
	["tags", "tag_albums"],
	["people", "person_albums"],
];

export function parseRootAlbums(payload: unknown): RootAlbums | undefined {
	if (!isObject(payload) || !Array.isArray(payload.albums)) {
		return undefined;
	}
	const sections = SECTIONS.map(([key, field]) => ({ key, albums: tilesOf(payload[field], parseAlbumTile) })).filter(
		(section) => section.albums.length > 0,
	);
	return { sections };
}

export function parseAlbumHead(payload: unknown): AlbumHead | undefined {
	if (!isObject(payload) || !isObject(payload.config) || !isObject(payload.resource)) {
		return undefined;
	}
	const { resource, config } = payload;
	if (typeof resource.id !== "string" || typeof resource.title !== "string") {
		return undefined;
	}
	const kind = albumKindOf(resource);
	return {
		id: resource.id,
		title: resource.title,
		kind,
		hasSubAlbums: kind === "album" && typeof resource.num_children === "number" && resource.num_children > 0,
		nsfwWarning: config.is_nsfw_warning_visible === true,
	};
}

export function parseAlbumPage(payload: unknown): Page<AlbumTile> | undefined {
	return pageOf(payload, "data", parseAlbumTile);
}

export function parsePhotoPage(payload: unknown): Page<PhotoTile> | undefined {
	return pageOf(payload, "photos", parsePhotoTile);
}

export function parseGallerySettings(payload: unknown): GallerySettings | undefined {
	if (!isObject(payload) || typeof payload.are_nsfw_visible !== "boolean" || typeof payload.is_nsfw_background_blurred !== "boolean") {
		return undefined;
	}
	return { nsfwVisible: payload.are_nsfw_visible, nsfwBlurred: payload.is_nsfw_background_blurred };
}

function parseAlbumTile(payload: unknown): AlbumTile | undefined {
	if (!isObject(payload) || typeof payload.id !== "string" || typeof payload.title !== "string") {
		return undefined;
	}
	const thumb = isObject(payload.thumb) ? thumbOf(payload.thumb.thumb, payload.thumb.thumb2x) : null;
	const count = payload.num_photos;
	return {
		id: payload.id,
		title: payload.title,
		thumb,
		photoCount: typeof count === "number" && count > 0 ? count : null,
		isLocked: payload.is_locked === true,
		isNsfw: payload.is_nsfw === true,
	};
}

function parsePhotoTile(payload: unknown): PhotoTile | undefined {
	if (!isObject(payload) || typeof payload.id !== "string") {
		return undefined;
	}
	const variants = isObject(payload.size_variants) ? payload.size_variants : {};
	return {
		id: payload.id,
		title: typeof payload.title === "string" ? payload.title : "",
		kind: photoKindOf(isObject(payload.precomputed) ? payload.precomputed : {}),
		thumb: thumbOf(urlOf(variants.thumb), urlOf(variants.thumb2x)),
	};
}

function albumKindOf(resource: Json): AlbumKind {
	if (resource.is_tag_album === true) {
		return "tag";
	}
	if (resource.is_person_album === true) {
		return "person";
	}
	return "has_albums" in resource ? "album" : "smart";
}

function photoKindOf(precomputed: Json): PhotoKind {
	if (precomputed.is_video === true) {
		return "video";
	}
	if (precomputed.is_livephoto === true) {
		return "live";
	}
	return precomputed.is_raw === true ? "raw" : "photo";
}

function thumbOf(src: unknown, src2x: unknown): Thumb | null {
	if (typeof src !== "string" || src === "") {
		return null;
	}
	return { src, src2x: typeof src2x === "string" && src2x !== "" ? src2x : null };
}

function urlOf(variant: unknown): unknown {
	return isObject(variant) ? variant.url : undefined;
}

function pageOf<T>(payload: unknown, field: string, parse: (item: unknown) => T | undefined): Page<T> | undefined {
	if (!isObject(payload) || !Array.isArray(payload[field])) {
		return undefined;
	}
	const { current_page, last_page } = payload;
	if (typeof current_page !== "number" || typeof last_page !== "number") {
		return undefined;
	}
	return { items: tilesOf(payload[field], parse), page: current_page, lastPage: last_page };
}

/** Parses each item, dropping malformed ones. */
function tilesOf<T>(items: unknown, parse: (item: unknown) => T | undefined): T[] {
	return Array.isArray(items) ? items.map(parse).filter((item): item is T => item !== undefined) : [];
}

function isObject(value: unknown): value is Json {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
