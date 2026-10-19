/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { createLycheeHttp, nativeDeps, readJson, type LycheeHttp, type LycheeHttpDeps } from "@/services/lycheeHttp";
import {
	parseAlbumHead,
	parseAlbumPage,
	parseGallerySettings,
	parsePhotoPage,
	parseRootAlbums,
	type AlbumHead,
	type AlbumTile,
	type GallerySettings,
	type Page,
	type PhotoTile,
	type RootAlbums,
} from "@/services/galleryParsers";
import { TIMED_OUT, withTimeout } from "@/services/timeout";

/** NFR-003-01. */
export const GALLERY_TIMEOUT_MS = 10_000;

/** FR-003-04: `Album::head`, `Album::albums` and `Album::photos` arrived in 7.1.0. */
export const MIN_BROWSING_VERSION = "7.1.0";

/** DO-003-06. */
export type GalleryFailure = "unreachable" | "not_found" | "unauthenticated" | "forbidden" | "password_required" | "gallery_locked" | "failed";
export type GalleryResult<T> = { kind: "ok"; value: T } | { kind: GalleryFailure };

export type UnlockFailure = "wrong_password" | "throttled" | "unreachable" | "failed";
export type UnlockResult = { kind: "ok" } | { kind: UnlockFailure };

export type Gallery = {
	root: () => Promise<GalleryResult<RootAlbums>>;
	settings: () => Promise<GalleryResult<GallerySettings>>;
	head: (albumId: string) => Promise<GalleryResult<AlbumHead>>;
	albums: (albumId: string, page: number) => Promise<GalleryResult<Page<AlbumTile>>>;
	photos: (albumId: string, page: number) => Promise<GalleryResult<Page<PhotoTile>>>;
	unlockAlbum: (albumId: string, password: string) => Promise<UnlockResult>;
	unlockGallery: (password: string) => Promise<UnlockResult>;
};

/** Failures named by Lychee's `exception` field, whatever the status. */
const FAILURE_BY_EXCEPTION: Record<string, GalleryFailure> = {
	PasswordRequiredException: "password_required",
	GalleryPasswordRequiredException: "gallery_locked",
};
const FAILURE_BY_STATUS: Record<number, GalleryFailure> = { 401: "unauthenticated", 403: "forbidden", 404: "not_found" };
const UNLOCK_FAILURE_BY_STATUS: Record<number, UnlockFailure> = { 403: "wrong_password", 429: "throttled" };

/**
 * Lychee's v2 browsing API for one server (ADR-003-01), on one shared
 * session (FR-003-07). Results are parsed into the app's types.
 */
export function createGallery(server: string, deps: LycheeHttpDeps = nativeDeps): Gallery {
	const http = createLycheeHttp(server, deps);

	return {
		root: () => load(http, "Albums", {}, parseRootAlbums),
		settings: () => load(http, "Gallery::Init", {}, parseGallerySettings),
		head: (albumId) => load(http, "Album::head", { album_id: albumId }, parseAlbumHead),
		albums: (albumId, page) => load(http, "Album::albums", { album_id: albumId, page }, parseAlbumPage),
		photos: (albumId, page) => load(http, "Album::photos", { album_id: albumId, page }, parsePhotoPage),
		unlockAlbum: (albumId, password) => unlock(http, "Album::unlock", { album_id: albumId, password }),
		unlockGallery: (password) => unlock(http, "Gallery::unlock", { password }),
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

function failureOf(status: number, payload: unknown): GalleryFailure {
	const exception = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>).exception : undefined;
	const byException = typeof exception === "string" ? FAILURE_BY_EXCEPTION[exception] : undefined;
	return byException ?? FAILURE_BY_STATUS[status] ?? "failed";
}
