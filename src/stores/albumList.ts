/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { reactive, readonly } from "vue";
import { MIN_BROWSING_VERSION, type GalleryFailure, type UnlockFailure } from "@/services/gallery";
import type { AlbumSection } from "@/services/galleryParsers";
import type { GalleryContext } from "@/stores/galleryContext";
import { DEFAULT_SETTINGS, sensitiveDisplay, showsSensitive, visibleSections, type SensitiveDisplay } from "@/stores/sensitive";
import { meetsMinimumVersion } from "@/utils/version";

export type AlbumListStatus = "loading" | "ready" | "too_old" | "gallery_locked" | "sign_in" | "failed";

/**
 * The root album list (FR-003-01) with the version gate (FR-003-04), the
 * gallery password (FR-003-05), sign-in handoff (FR-003-06) and sensitive
 * albums (FR-003-09). Passwords are passed through, never kept (NFR-003-05).
 */
export function createAlbumList(display: SensitiveDisplay = sensitiveDisplay) {
	const state = reactive({
		status: "loading" as AlbumListStatus,
		failure: null as GalleryFailure | null,
		sessionEnded: false,
		sections: [] as AlbumSection[],
		canUpload: false,
		canEdit: false,
		unlocking: false,
		unlockFailure: null as UnlockFailure | null,
	});

	/** `retried`: already loaded again after a silent login (FR-006-02). */
	async function load(ctx: GalleryContext, version: string | null, retried = false): Promise<void> {
		state.failure = null;
		if (!meetsMinimumVersion(version, MIN_BROWSING_VERSION)) {
			state.status = "too_old";
			return;
		}
		state.status = "loading";
		const [root, settings] = await Promise.all([ctx.gallery.root(), ctx.gallery.settings()]);
		display.settings = settings.kind === "ok" ? settings.value : { ...DEFAULT_SETTINGS };
		if (root.kind === "ok") {
			state.sections = root.value.sections;
			state.canUpload = root.value.canUpload;
			state.canEdit = root.value.canEdit;
			state.status = "ready";
			return;
		}
		if (root.kind === "unauthenticated" && !retried && (await ctx.onUnauthenticated())) {
			await load(ctx, version, true);
			return;
		}
		await fail(ctx, root.kind);
	}

	async function fail(ctx: GalleryContext, kind: GalleryFailure): Promise<void> {
		if (kind === "gallery_locked") {
			state.status = "gallery_locked";
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
		const result = await ctx.gallery.unlockGallery(password);
		state.unlocking = false;
		if (result.kind !== "ok") {
			state.unlockFailure = result.kind;
			return;
		}
		await load(ctx, null);
	}

	function revealSensitive(): void {
		display.revealed = true;
	}

	function view() {
		return visibleSections(state.sections, showsSensitive(display));
	}

	return { state: readonly(state), load, unlock, revealSensitive, view };
}
