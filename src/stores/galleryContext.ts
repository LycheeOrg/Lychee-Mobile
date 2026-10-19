/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { galleryFor, type Gallery } from "@/services/gallery";
import { accountStore } from "@/stores/account";
import { serverStore } from "@/stores/server";

/** What the browsing models need from the rest of the app, injectable for tests. */
export type GalleryContext = {
	gallery: Gallery;
	/** Whether the account store believed the user was signed in. */
	signedIn: boolean;
	/** FR-003-06: called on a 401 so the account store re-reads the session. */
	onUnauthenticated: () => Promise<void>;
};

/** The context for the stored server, or `null` when there is none. */
export function currentGalleryContext(): GalleryContext | null {
	const saved = serverStore.state.saved;
	if (saved === null) {
		return null;
	}
	return {
		gallery: galleryFor(saved.url),
		signedIn: accountStore.state.status === "signed_in",
		onUnauthenticated: () => accountStore.refresh(saved.url),
	};
}

/** Changes when the album list must reload (FR-003-01, S-003-18). */
export function galleryKey(): string {
	const account = accountStore.state;
	return `${serverStore.state.saved?.url ?? ""}|${account.status}|${account.account?.id ?? ""}`;
}
