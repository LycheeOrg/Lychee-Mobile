/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { reactive, readonly } from "vue";
import type { GalleryFailure, GalleryResult, UnlockFailure } from "@/services/gallery";
import type { AlbumHead, AlbumTile, Page, PhotoTile } from "@/services/galleryParsers";
import type { GalleryContext } from "@/stores/galleryContext";

export type AlbumPageStatus = "loading" | "ready" | "password" | "sensitive" | "sign_in" | "failed";

/** Albums whose sensitive-content warning was accepted in this run (FR-003-09). */
export const acceptedSensitiveAlbums = new Set<string>();

/**
 * One album: its head, then sub-album pages, then photo pages (FR-003-02),
 * with album unlock (FR-003-05), sign-in handoff (FR-003-06) and the
 * sensitive-content warning (FR-003-09).
 */
export function createAlbumPage(albumId: string, accepted: Set<string> = acceptedSensitiveAlbums) {
	const state = reactive({
		status: "loading" as AlbumPageStatus,
		failure: null as GalleryFailure | null,
		sessionEnded: false,
		title: "",
		albums: [] as AlbumTile[],
		photos: [] as PhotoTile[],
		nextAlbumsPage: null as number | null,
		nextPhotosPage: null as number | null,
		hasMore: false,
		loadingMore: false,
		moreFailed: false,
		unlocking: false,
		unlockFailure: null as UnlockFailure | null,
	});
	// Bumped by every load, so pages requested before it are dropped.
	let generation = 0;

	async function load(ctx: GalleryContext): Promise<void> {
		const current = ++generation;
		Object.assign(state, { status: "loading", failure: null, albums: [], photos: [], moreFailed: false, loadingMore: false });
		const result = await ctx.gallery.head(albumId);
		if (current !== generation) {
			return;
		}
		if (result.kind !== "ok") {
			await fail(ctx, result.kind);
			return;
		}
		start(result.value);
		if (result.value.nsfwWarning && !accepted.has(albumId)) {
			state.status = "sensitive";
			return;
		}
		await loadFirstPages(ctx, current);
	}

	function start(head: AlbumHead): void {
		state.title = head.title;
		state.nextAlbumsPage = head.hasSubAlbums ? 1 : null;
		state.nextPhotosPage = 1;
		updateHasMore();
	}

	async function loadFirstPages(ctx: GalleryContext, current: number): Promise<void> {
		const failures = [state.nextAlbumsPage === null ? null : await loadAlbums(ctx, current), await loadPhotos(ctx, current)];
		if (current !== generation) {
			return;
		}
		const failure = failures.find((kind) => kind !== null && kind !== undefined);
		if (failure !== undefined && failure !== null) {
			await fail(ctx, failure);
			return;
		}
		state.status = "ready";
	}

	async function loadMore(ctx: GalleryContext): Promise<void> {
		if (!state.hasMore || state.loadingMore) {
			return;
		}
		const current = generation;
		state.loadingMore = true;
		state.moreFailed = false;
		const failure = state.nextAlbumsPage !== null ? await loadAlbums(ctx, current) : await loadPhotos(ctx, current);
		if (current !== generation) {
			return;
		}
		state.loadingMore = false;
		if (failure === "unauthenticated") {
			await fail(ctx, failure);
		} else if (failure !== null) {
			state.moreFailed = true;
		}
	}

	/** Loads the next sub-album page; returns the failure, or `null`. */
	async function loadAlbums(ctx: GalleryContext, current: number): Promise<GalleryFailure | null> {
		const result = await ctx.gallery.albums(albumId, state.nextAlbumsPage ?? 1);
		return apply(result, current, (page) => {
			state.albums = [...state.albums, ...page.items];
			state.nextAlbumsPage = nextPage(page);
		});
	}

	/** Loads the next photo page; returns the failure, or `null`. */
	async function loadPhotos(ctx: GalleryContext, current: number): Promise<GalleryFailure | null> {
		const result = await ctx.gallery.photos(albumId, state.nextPhotosPage ?? 1);
		return apply(result, current, (page) => {
			state.photos = [...state.photos, ...page.items];
			state.nextPhotosPage = nextPage(page);
		});
	}

	function apply<T>(result: GalleryResult<Page<T>>, current: number, append: (page: Page<T>) => void): GalleryFailure | null {
		if (current !== generation) {
			return null;
		}
		if (result.kind !== "ok") {
			return result.kind;
		}
		append(result.value);
		updateHasMore();
		return null;
	}

	async function fail(ctx: GalleryContext, kind: GalleryFailure): Promise<void> {
		if (kind === "password_required") {
			state.status = "password";
			return;
		}
		if (kind === "unauthenticated") {
			state.sessionEnded = ctx.signedIn;
			state.status = "sign_in";
			await ctx.onUnauthenticated();
			return;
		}
		state.status = "failed";
		state.failure = kind;
	}

	async function unlock(ctx: GalleryContext, password: string): Promise<void> {
		state.unlocking = true;
		state.unlockFailure = null;
		const result = await ctx.gallery.unlockAlbum(albumId, password);
		state.unlocking = false;
		if (result.kind !== "ok") {
			state.unlockFailure = result.kind;
			return;
		}
		await load(ctx);
	}

	async function continueSensitive(ctx: GalleryContext): Promise<void> {
		accepted.add(albumId);
		state.status = "loading";
		await loadFirstPages(ctx, generation);
	}

	function updateHasMore(): void {
		state.hasMore = state.nextAlbumsPage !== null || state.nextPhotosPage !== null;
	}

	return { state: readonly(state), load, loadMore, unlock, continueSensitive };
}

function nextPage(page: Page<unknown>): number | null {
	return page.page < page.lastPage ? page.page + 1 : null;
}
