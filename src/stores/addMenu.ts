/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import type { CreateAlbumResult } from "@/services/gallery";
import type { AlbumKind } from "@/services/galleryParsers";
import type { GalleryContext } from "@/stores/galleryContext";
import { createFailureMessage, titleProblemMessage } from "@/utils/albumMessages";
import { uploadTargetFor, type UploadTarget } from "@/stores/uploadQueue";

/** DO-010-01: what the "+" menu offers; `parentId: null` creates at the top level. */
export type AddMenu = { upload: UploadTarget | null; createIn: { parentId: string | null } | null };

/** FR-010-02: the album list uploads into Unsorted and creates top-level albums. */
export function addMenuForRoot(rights: { canUpload: boolean; canEdit: boolean }): AddMenu {
	return { upload: rights.canUpload ? { albumId: null } : null, createIn: rights.canEdit ? { parentId: null } : null };
}

/**
 * FR-010-02: an album page uploads as before (FR-005-02) and creates
 * sub-albums only in regular albums the user may edit, as the server requires.
 */
export function addMenuFor(album: { id: string; kind: AlbumKind; canUpload: boolean; canEdit: boolean }): AddMenu {
	return {
		upload: uploadTargetFor(album),
		createIn: album.kind === "album" && album.canEdit ? { parentId: album.id } : null,
	};
}

/** FR-010-01: the "+" shows only when it offers something. */
export function hasItems(menu: AddMenu): boolean {
	return menu.upload !== null || menu.createIn !== null;
}

/** Lychee's `TitleRule`: at most 100 characters. */
export const MAX_TITLE_LENGTH = 100;

/** FR-010-03: why a title can't be used, or `null`. */
export function titleProblem(title: string): "empty" | "too_long" | null {
	const trimmed = title.trim();
	if (trimmed === "") {
		return "empty";
	}
	return trimmed.length > MAX_TITLE_LENGTH ? "too_long" : null;
}

/** FR-010-03: creates the album; a 401 gets one silent sign-in (FR-009-03). */
export async function createAlbumIn(ctx: GalleryContext, parentId: string | null, title: string): Promise<CreateAlbumResult> {
	const result = await ctx.gallery.createAlbum(title.trim(), parentId);
	if (result.kind === "unauthenticated" && (await ctx.onUnauthenticated())) {
		return ctx.gallery.createAlbum(title.trim(), parentId);
	}
	return result;
}

/** The title dialog: resolves the typed title, or `null` on Cancel. */
export type AskTitle = (initial: string, message: string | null) => Promise<string | null>;

/**
 * FR-010-03: asks for a title until it is valid and the album is created;
 * after a problem the dialog opens again with the typed title and the
 * message. Resolves the new album's ID, or `null` when cancelled.
 */
export async function promptForAlbum(deps: { ask: AskTitle; create: (title: string) => Promise<CreateAlbumResult> }): Promise<string | null> {
	let title = "";
	let message: string | null = null;
	for (;;) {
		const typed = await deps.ask(title, message);
		if (typed === null) {
			return null;
		}
		title = typed;
		const problem = titleProblem(typed);
		if (problem !== null) {
			message = titleProblemMessage(problem);
			continue;
		}
		const result = await deps.create(typed);
		if (result.kind === "ok") {
			return result.id;
		}
		message = createFailureMessage(result);
	}
}
