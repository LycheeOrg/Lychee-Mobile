/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { reactive, readonly } from "vue";
import type { PhotoAlbumsResult } from "@/services/gallery";
import type { GalleryContext } from "@/stores/galleryContext";

export type PhotoAlbumsState = PhotoAlbumsResult | { kind: "loading" };

/**
 * FR-008-06: the albums of each photo opened in the info panel, loaded once
 * per viewer; failures are tried again when the photo is shown again.
 */
export function createPhotoAlbums() {
	const state = reactive({ byPhoto: {} as Record<string, PhotoAlbumsState> });
	const pending = new Map<string, Promise<PhotoAlbumsResult>>();

	async function load(ctx: GalleryContext, photoId: string): Promise<PhotoAlbumsResult> {
		const known = state.byPhoto[photoId];
		if (known !== undefined && (known.kind === "ok" || known.kind === "unsupported")) {
			return known;
		}
		const running = pending.get(photoId);
		if (running !== undefined) {
			return running;
		}
		const request = fetchAlbums(ctx, photoId).finally(() => pending.delete(photoId));
		pending.set(photoId, request);
		state.byPhoto[photoId] = { kind: "loading" };
		const result = await request;
		state.byPhoto[photoId] = result;
		return result;
	}

	return { state: readonly(state), load };
}

/** FR-006-02: one silent login on a 401. */
async function fetchAlbums(ctx: GalleryContext, photoId: string): Promise<PhotoAlbumsResult> {
	const result = await ctx.gallery.photoAlbums(photoId);
	if (result.kind === "unauthenticated" && (await ctx.onUnauthenticated())) {
		return ctx.gallery.photoAlbums(photoId);
	}
	return result;
}

export type PhotoAlbums = ReturnType<typeof createPhotoAlbums>;
