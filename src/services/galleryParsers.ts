/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { htmlToText, parsePhotoDetails, type PhotoDetails } from "@/services/photoDetails";

/**
 * Parsers for Lychee's v2 gallery responses (ADR-003-01). They turn raw JSON
 * into the app's own types and return `undefined` when a payload isn't
 * Lychee's; unknown fields are ignored (NFR-003-03).
 */

/** A thumbnail and its 2x variant for `srcset`. */
export type Thumb = { src: string; src2x: string | null };

/** DO-003-01. */
export type AlbumTile = { id: string; title: string; thumb: Thumb | null; photoCount: number | null; isLocked: boolean; isNsfw: boolean };

/** DO-003-02, DO-004-01. */
export type PhotoKind = "photo" | "video" | "live" | "raw";
export type Variant = { url: string; width: number; height: number };
export type VariantName = "medium2x" | "medium" | "original" | "small2x" | "small" | "thumb2x" | "thumb";
export type Variants = Record<VariantName, Variant | null>;
/** `mimeType`: Lychee's `type` (DO-007-02). */
export type PhotoTile = {
	id: string;
	title: string;
	kind: PhotoKind;
	mimeType: string | null;
	thumb: Thumb | null;
	/** DO-008-01: what the info panel shows. */
	details: PhotoDetails;
	variants: Variants;
	liveUrl: string | null;
};

/** DO-003-03. */
export type SectionKey = "pinned" | "smart" | "albums" | "shared" | "tags" | "people";
export type AlbumSection = { key: SectionKey; albums: AlbumTile[] };
export type RootAlbums = { sections: AlbumSection[]; canUpload: boolean };

/** DO-003-04, DO-007-02. */
export type AlbumKind = "album" | "smart" | "tag" | "person";
export type AlbumHead = {
	id: string;
	title: string;
	kind: AlbumKind;
	hasSubAlbums: boolean;
	nsfwWarning: boolean;
	canUpload: boolean;
	canDownload: boolean;
	canDelete: boolean;
	/** FR-008-05: `config.is_map_accessible`. */
	mapAllowed: boolean;
};

/** DO-003-05, DO-004-02. */
export type Page<T> = { items: T[]; page: number; lastPage: number; total: number };

/** DO-008-03: an album a photo is in (`PhotoAlbumResource`). */
export type PhotoAlbum = { id: string; title: string };

/** API-008-03: tile URL template and attribution as text (NFR-008-02). */
export type MapProvider = { layer: string; attribution: string };

/** DO-003-07; `exifDisabled`: no info panel (FR-008-01, DO-008-02). */
export type GallerySettings = { nsfwVisible: boolean; nsfwBlurred: boolean; exifDisabled: boolean };

type Json = Record<string, unknown>;

/** Display order of the root sections (FR-003-01) and their fields. */
const VARIANT_NAMES: VariantName[] = ["medium2x", "medium", "original", "small2x", "small", "thumb2x", "thumb"];

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
	return { sections, canUpload: canUploadOf(payload.rights) };
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
		canUpload: canUploadOf(resource.rights),
		canDownload: rightOf(resource.rights, "can_download"),
		canDelete: rightOf(resource.rights, "can_delete"),
		mapAllowed: config.is_map_accessible === true,
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
	return {
		nsfwVisible: payload.are_nsfw_visible,
		nsfwBlurred: payload.is_nsfw_background_blurred,
		exifDisabled: payload.is_exif_disabled === true,
	};
}

/** API-008-02: `PhotoAlbumResource[]`; malformed entries are dropped. */
export function parsePhotoAlbums(payload: unknown): PhotoAlbum[] | undefined {
	if (!Array.isArray(payload)) {
		return undefined;
	}
	return tilesOf(payload, (item) =>
		isObject(item) && typeof item.id === "string" && typeof item.title === "string" ? { id: item.id, title: item.title } : undefined,
	);
}

/** API-008-03: `MapProviderData`. */
export function parseMapProvider(payload: unknown): MapProvider | undefined {
	if (!isObject(payload) || typeof payload.layer !== "string" || payload.layer.trim() === "") {
		return undefined;
	}
	return { layer: payload.layer.trim(), attribution: typeof payload.attribution === "string" ? htmlToText(payload.attribution) : "" };
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
		mimeType: typeof payload.type === "string" && payload.type !== "" ? payload.type : null,
		thumb: thumbOf(urlOf(variants.thumb), urlOf(variants.thumb2x)),
		variants: Object.fromEntries(VARIANT_NAMES.map((name) => [name, variantOf(variants[name])])) as Variants,
		liveUrl: typeof payload.live_photo_url === "string" && payload.live_photo_url !== "" ? payload.live_photo_url : null,
		details: parsePhotoDetails(payload),
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

/** A size variant with a URL; `null` when missing or downgraded (no full-photo access). */
function variantOf(variant: unknown): Variant | null {
	if (!isObject(variant) || typeof variant.url !== "string" || variant.url === "") {
		return null;
	}
	const { url, width, height } = variant;
	return { url, width: typeof width === "number" ? width : 0, height: typeof height === "number" ? height : 0 };
}

function urlOf(variant: unknown): unknown {
	return isObject(variant) ? variant.url : undefined;
}

function pageOf<T>(payload: unknown, field: string, parse: (item: unknown) => T | undefined): Page<T> | undefined {
	if (!isObject(payload) || !Array.isArray(payload[field])) {
		return undefined;
	}
	const { current_page, last_page, total } = payload;
	if (typeof current_page !== "number" || typeof last_page !== "number") {
		return undefined;
	}
	const items = tilesOf(payload[field], parse);
	return { items, page: current_page, lastPage: last_page, total: typeof total === "number" ? total : items.length };
}

/** Parses each item, dropping malformed ones. */
function tilesOf<T>(items: unknown, parse: (item: unknown) => T | undefined): T[] {
	return Array.isArray(items) ? items.map(parse).filter((item): item is T => item !== undefined) : [];
}

/** FR-005-02: `rights.can_upload`, false when missing. */
function canUploadOf(rights: unknown): boolean {
	return rightOf(rights, "can_upload");
}

/** One of Lychee's `rights` flags, false when missing (FR-005-02, FR-007-02). */
function rightOf(rights: unknown, name: string): boolean {
	return isObject(rights) && rights[name] === true;
}

function isObject(value: unknown): value is Json {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
