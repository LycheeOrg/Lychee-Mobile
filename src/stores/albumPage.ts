/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { reactive, readonly } from "vue";
import type { DeleteResult, GalleryFailure, GalleryResult, UnlockFailure } from "@/services/gallery";
import type { AlbumHead, AlbumKind, AlbumTile, Page, PhotoTile } from "@/services/galleryParsers";
import type { GalleryContext } from "@/stores/galleryContext";
import { createPhotoSelection } from "@/stores/photoSelection";

export type AlbumPageStatus = "loading" | "ready" | "password" | "sensitive" | "sign_in" | "failed";

/** Albums whose sensitive-content warning was accepted in this run (FR-003-09). */
export const acceptedSensitiveAlbums = new Set<string>();

/**
 * One album: its head, then sub-album pages, then photo pages (FR-003-02),
 * with album unlock (FR-003-05), sign-in handoff (FR-003-06) and the
 * sensitive-content warning (FR-003-09), and deleting selected photos
 * (FR-007-03).
 */
export function createAlbumPage(albumId: string, accepted: Set<string> = acceptedSensitiveAlbums) {
	const state = reactive({
		status: "loading" as AlbumPageStatus,
		failure: null as GalleryFailure | null,
		sessionEnded: false,
		title: "",
		kind: "album" as AlbumKind,
		canUpload: false,
		canDownload: false,
		canDelete: false,
		mapAllowed: false,
		canEdit: false,
		albums: [] as AlbumTile[],
		photos: [] as PhotoTile[],
		photoTotal: 0,
		nextAlbumsPage: null as number | null,
		nextPhotosPage: null as number | null,
		hasMore: false,
		loadingMore: false,
		moreFailed: false,
		unlocking: false,
		unlockFailure: null as UnlockFailure | null,
		deleting: false,
	});
	const selection = createPhotoSelection();
	// Bumped by every load, so pages requested before it are dropped.
	let generation = 0;
	// Length of the first photo page, to find the next page after a delete (S-007-19).
	let photoPageSize = 0;

	/** `retried`: already loaded again after a silent login (FR-006-02). */
	async function load(ctx: GalleryContext, retried = false): Promise<void> {
		const current = ++generation;
		selection.clear();
		Object.assign(state, { status: "loading", failure: null, albums: [], photos: [], photoTotal: 0, moreFailed: false, loadingMore: false });
		const result = await ctx.gallery.head(albumId);
		if (current !== generation) {
			return;
		}
		if (result.kind !== "ok") {
			await failOrRetry(ctx, result.kind, retried);
			return;
		}
		start(result.value);
		if (result.value.nsfwWarning && !accepted.has(albumId)) {
			state.status = "sensitive";
			return;
		}
		await loadFirstPages(ctx, current, retried);
	}

	/** FR-006-02: a 401 gets one silent login and one more load. */
	async function failOrRetry(ctx: GalleryContext, kind: GalleryFailure, retried: boolean): Promise<void> {
		if (kind === "unauthenticated" && !retried && (await ctx.onUnauthenticated())) {
			await load(ctx, true);
			return;
		}
		await fail(ctx, kind);
	}

	function start(head: AlbumHead): void {
		state.title = head.title;
		state.kind = head.kind;
		state.canUpload = head.canUpload;
		state.canDownload = head.canDownload;
		state.canDelete = head.canDelete;
		state.mapAllowed = head.mapAllowed;
		state.canEdit = head.canEdit;
		state.nextAlbumsPage = head.hasSubAlbums ? 1 : null;
		state.nextPhotosPage = 1;
		updateHasMore();
	}

	async function loadFirstPages(ctx: GalleryContext, current: number, retried = false): Promise<void> {
		const failures = [state.nextAlbumsPage === null ? null : await loadAlbums(ctx, current), await loadPhotos(ctx, current)];
		if (current !== generation) {
			return;
		}
		const failure = failures.find((kind) => kind !== null && kind !== undefined);
		if (failure !== undefined && failure !== null) {
			await failOrRetry(ctx, failure, retried);
			return;
		}
		state.status = "ready";
	}

	async function loadMore(ctx: GalleryContext, retried = false): Promise<void> {
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
		if (failure === "unauthenticated" && !retried && (await ctx.onUnauthenticated())) {
			await loadMore(ctx, true);
		} else if (failure === "unauthenticated") {
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
			if (page.page === 1) {
				photoPageSize = page.items.length;
			}
			// A page fetched again after a delete repeats photos already shown.
			const shown = new Set(state.photos.map((photo) => photo.id));
			state.photos = [...state.photos, ...page.items.filter((photo) => !shown.has(photo.id))];
			state.photoTotal = page.total;
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

	/** FR-007-03: one silent login on a 401; a timeout reloads, as photos may be gone. */
	async function deleteSelected(ctx: GalleryContext): Promise<DeleteResult["kind"]> {
		const ids = selection.ids();
		if (ids.length === 0) {
			return "ok";
		}
		state.deleting = true;
		let result = await ctx.gallery.deletePhotos(ids, albumId);
		if (result.kind === "unauthenticated" && (await ctx.onUnauthenticated())) {
			result = await ctx.gallery.deletePhotos(ids, albumId);
		}
		state.deleting = false;
		if (result.kind === "ok") {
			removePhotos(ids);
		} else if (result.kind === "unauthenticated") {
			await fail(ctx, "unauthenticated");
		} else if (result.kind === "timeout") {
			await load(ctx);
		}
		return result.kind;
	}

	/** Later server pages moved up by the deleted photos, so the next page is recomputed (S-007-19). */
	function removePhotos(ids: string[]): void {
		const gone = new Set(ids);
		const before = state.photos.length;
		state.photos = state.photos.filter((photo) => !gone.has(photo.id));
		state.photoTotal = Math.max(0, state.photoTotal - (before - state.photos.length));
		if (state.nextPhotosPage !== null && photoPageSize > 0) {
			state.nextPhotosPage = Math.floor(state.photos.length / photoPageSize) + 1;
		}
		selection.clear();
	}

	function updateHasMore(): void {
		state.hasMore = state.nextAlbumsPage !== null || state.nextPhotosPage !== null;
	}

	return { state: readonly(state), selection, load, loadMore, unlock, continueSensitive, deleteSelected };
}

function nextPage(page: Page<unknown>): number | null {
	return page.page < page.lastPage ? page.page + 1 : null;
}
