/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { createLycheeHttp, nativeDeps, readJson, type LycheeHttp, type LycheeHttpDeps } from "@/services/lycheeHttp";
import {
	parseAlbumHead,
	parseAlbumPage,
	parseGallerySettings,
	parseMapProvider,
	parsePhotoAlbums,
	parsePhotoPage,
	parseRootAlbums,
	type AlbumHead,
	type AlbumTile,
	type GallerySettings,
	type MapProvider,
	type Page,
	type PhotoAlbum,
	type PhotoTile,
	type RootAlbums,
} from "@/services/galleryParsers";
import { TIMED_OUT, withTimeout } from "@/services/timeout";

/** NFR-003-01. */
export const GALLERY_TIMEOUT_MS = 10_000;

/** FR-007-03: deleting many photos can take longer than browsing. */
export const DELETE_TIMEOUT_MS = 30_000;

/** FR-010-03: the first try plus five retries while the server's album lock is busy (409), as the web client does. */
export const CREATE_ALBUM_ATTEMPTS = 6;

/** FR-003-04: `Album::head`, `Album::albums` and `Album::photos` arrived in 7.1.0. */
export const MIN_BROWSING_VERSION = "7.1.0";

/** DO-003-06. */
export type GalleryFailure = "unreachable" | "not_found" | "unauthenticated" | "forbidden" | "password_required" | "gallery_locked" | "failed";
export type GalleryResult<T> = { kind: "ok"; value: T } | { kind: GalleryFailure };

export type UnlockFailure = "wrong_password" | "throttled" | "unreachable" | "failed";
export type UnlockResult = { kind: "ok" } | { kind: UnlockFailure };

/** DO-007-03: `timeout` is kept apart because the photos may have been deleted. */
export type DeleteResult = { kind: "ok" | "unauthenticated" | "forbidden" | "failed" | "unreachable" | "timeout" };

/** FR-007-04: what file-transfer needs to fetch one photo's original. */
export type DownloadRequest = { url: string; headers: Record<string, string> };

/** DO-008-03: `unsupported` is Lychee before 7.4.0 (404). */
export type PhotoAlbumsResult = { kind: "ok"; albums: readonly PhotoAlbum[] } | { kind: "unsupported" | "unauthenticated" | "failed" };

/** DO-010-03. */
export type CreateAlbumResult =
	| { kind: "ok"; id: string }
	| { kind: "invalid"; message: string }
	| { kind: "busy" | "unauthenticated" | "forbidden" | "unreachable" | "failed" };

export type Gallery = {
	root: () => Promise<GalleryResult<RootAlbums>>;
	settings: () => Promise<GalleryResult<GallerySettings>>;
	head: (albumId: string) => Promise<GalleryResult<AlbumHead>>;
	albums: (albumId: string, page: number) => Promise<GalleryResult<Page<AlbumTile>>>;
	photos: (albumId: string, page: number) => Promise<GalleryResult<Page<PhotoTile>>>;
	unlockAlbum: (albumId: string, password: string) => Promise<UnlockResult>;
	unlockGallery: (password: string) => Promise<UnlockResult>;
	/** FR-007-03: `fromId` is the album or `"unsorted"`. */
	deletePhotos: (photoIds: string[], fromId: string) => Promise<DeleteResult>;
	downloadRequest: (photoId: string, fromId: string) => Promise<DownloadRequest>;
	/** FR-008-06. */
	photoAlbums: (photoId: string) => Promise<PhotoAlbumsResult>;
	/** API-008-03: loaded once per server; `null` when it can't be read. */
	mapProvider: () => Promise<MapProvider | null>;
	/** FR-010-03: `parentId` null creates a top-level album. */
	createAlbum: (title: string, parentId: string | null) => Promise<CreateAlbumResult>;
};

/** Failures named by Lychee's `exception` field, whatever the status. */
const FAILURE_BY_EXCEPTION: Record<string, GalleryFailure> = {
	PasswordRequiredException: "password_required",
	GalleryPasswordRequiredException: "gallery_locked",
};
const FAILURE_BY_STATUS: Record<number, GalleryFailure> = { 401: "unauthenticated", 403: "forbidden", 404: "not_found" };
const DELETE_FAILURE_BY_STATUS: Record<number, DeleteResult["kind"]> = { 401: "unauthenticated", 403: "forbidden" };
const CREATE_FAILURE_BY_STATUS: Record<number, "busy" | "unauthenticated" | "forbidden"> = { 409: "busy", 401: "unauthenticated", 403: "forbidden" };
const ALBUMS_FAILURE_BY_STATUS: Record<number, "unsupported" | "unauthenticated"> = { 404: "unsupported", 401: "unauthenticated" };
const UNLOCK_FAILURE_BY_STATUS: Record<number, UnlockFailure> = { 403: "wrong_password", 429: "throttled" };

/**
 * Lychee's v2 browsing API for one server (ADR-003-01), on one shared
 * session (FR-003-07). Results are parsed into the app's types.
 */
export function createGallery(server: string, deps: LycheeHttpDeps = nativeDeps): Gallery {
	const http = createLycheeHttp(server, deps);
	let provider: MapProvider | null = null;

	return {
		root: () => load(http, "Albums", {}, parseRootAlbums),
		settings: () => load(http, "Gallery::Init", {}, parseGallerySettings),
		head: (albumId) => load(http, "Album::head", { album_id: albumId }, parseAlbumHead),
		albums: (albumId, page) => load(http, "Album::albums", { album_id: albumId, page }, parseAlbumPage),
		photos: (albumId, page) => load(http, "Album::photos", { album_id: albumId, page }, parsePhotoPage),
		unlockAlbum: (albumId, password) => unlock(http, "Album::unlock", { album_id: albumId, password }),
		unlockGallery: (password) => unlock(http, "Gallery::unlock", { password }),
		deletePhotos: (photoIds, fromId) => deletePhotos(http, photoIds, fromId),
		downloadRequest: async (photoId, fromId) => {
			const cookie = await http.cookieHeader();
			const headers: Record<string, string> = cookie === "" ? {} : { Cookie: cookie };
			return {
				url: http.apiUrl("Zip", { photo_ids: photoId, variant: "ORIGINAL", from_id: fromId }),
				headers,
			};
		},
		photoAlbums: (photoId) => photoAlbums(http, photoId),
		createAlbum: (title, parentId) => createAlbum(http, title, parentId),
		async mapProvider() {
			if (provider === null) {
				const result = await load(http, "Map::provider", {}, parseMapProvider);
				provider = result.kind === "ok" ? result.value : null;
			}
			return provider;
		},
	};
}

let shared: { server: string; gallery: Gallery } | undefined;

/** The app-wide gallery for `server`, replaced when the server changes. */
export function galleryFor(server: string): Gallery {
	if (shared?.server !== server) {
		shared = { server, gallery: createGallery(server) };
	}
	return shared.gallery;
}

async function load<T>(
	http: LycheeHttp,
	path: string,
	query: Record<string, string | number>,
	parse: (payload: unknown) => T | undefined,
): Promise<GalleryResult<T>> {
	try {
		const result = await withTimeout(async (signal): Promise<GalleryResult<T>> => {
			const response = await http.get(path, signal, query);
			const payload = await readJson(response);
			if (!response.ok) {
				return { kind: failureOf(response.status, payload) };
			}
			const value = parse(payload);
			return value === undefined ? { kind: "failed" } : { kind: "ok", value };
		}, GALLERY_TIMEOUT_MS);
		return result === TIMED_OUT ? { kind: "unreachable" } : result;
	} catch {
		return { kind: "unreachable" };
	}
}

async function unlock(http: LycheeHttp, path: string, body: Record<string, string>): Promise<UnlockResult> {
	try {
		const response = await withTimeout((signal) => http.post(path, body, signal), GALLERY_TIMEOUT_MS);
		if (response === TIMED_OUT) {
			return { kind: "unreachable" };
		}
		return response.ok ? { kind: "ok" } : { kind: UNLOCK_FAILURE_BY_STATUS[response.status] ?? "failed" };
	} catch {
		return { kind: "unreachable" };
	}
}

async function deletePhotos(http: LycheeHttp, photoIds: string[], fromId: string): Promise<DeleteResult> {
	try {
		const response = await withTimeout((signal) => http.delete("Photo", { photo_ids: photoIds, from_id: fromId }, signal), DELETE_TIMEOUT_MS);
		if (response === TIMED_OUT) {
			return { kind: "timeout" };
		}
		return { kind: response.ok ? "ok" : (DELETE_FAILURE_BY_STATUS[response.status] ?? "failed") };
	} catch {
		return { kind: "unreachable" };
	}
}

async function createAlbum(http: LycheeHttp, title: string, parentId: string | null): Promise<CreateAlbumResult> {
	for (let attempt = 1; attempt <= CREATE_ALBUM_ATTEMPTS; attempt++) {
		const result = await createAlbumOnce(http, title, parentId);
		if (result.kind !== "busy") {
			return result;
		}
	}
	return { kind: "busy" };
}

async function createAlbumOnce(http: LycheeHttp, title: string, parentId: string | null): Promise<CreateAlbumResult> {
	try {
		const result = await withTimeout(async (signal): Promise<CreateAlbumResult> => {
			const response = await http.post("Album", { title, parent_id: parentId }, signal);
			const text = await response.text();
			const payload = parseJson(text);
			if (response.ok) {
				const id = albumIdOf(payload, text);
				return id === null ? { kind: "failed" } : { kind: "ok", id };
			}
			if (response.status === 422) {
				return { kind: "invalid", message: messageOf(payload) };
			}
			return { kind: CREATE_FAILURE_BY_STATUS[response.status] ?? "failed" };
		}, GALLERY_TIMEOUT_MS);
		return result === TIMED_OUT ? { kind: "unreachable" } : result;
	} catch {
		return { kind: "unreachable" };
	}
}

/** Lychee album IDs: 24 URL-safe characters (`RandomID`); a little slack for other formats. */
const ALBUM_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * FR-010-03: `AlbumController::createAlbum` returns the ID as a bare string,
 * which Laravel sends as plain text, not JSON; accept both.
 */
function albumIdOf(payload: unknown, text: string): string | null {
	const id = typeof payload === "string" ? payload : text.trim();
	return ALBUM_ID.test(id) ? id : null;
}

function parseJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

function messageOf(payload: unknown): string {
	const message = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>).message : undefined;
	return typeof message === "string" ? message : "";
}

async function photoAlbums(http: LycheeHttp, photoId: string): Promise<PhotoAlbumsResult> {
	try {
		const result = await withTimeout(async (signal): Promise<PhotoAlbumsResult> => {
			const response = await http.get(`Photo/${encodeURIComponent(photoId)}/albums`, signal);
			if (!response.ok) {
				return { kind: ALBUMS_FAILURE_BY_STATUS[response.status] ?? "failed" };
			}
			const albums = parsePhotoAlbums(await readJson(response));
			return albums === undefined ? { kind: "failed" } : { kind: "ok", albums };
		}, GALLERY_TIMEOUT_MS);
		return result === TIMED_OUT ? { kind: "failed" } : result;
	} catch {
		return { kind: "failed" };
	}
}

function failureOf(status: number, payload: unknown): GalleryFailure {
	const exception = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>).exception : undefined;
	const byException = typeof exception === "string" ? FAILURE_BY_EXCEPTION[exception] : undefined;
	return byException ?? FAILURE_BY_STATUS[status] ?? "failed";
}
