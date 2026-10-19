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
	/**
	 * FR-003-06, FR-006-02: called on a 401. Logs in again with the stored
	 * credentials; `true` means the call may be sent again once, `false` that
	 * the account store re-read the session and the user must sign in.
	 */
	onUnauthenticated: () => Promise<boolean>;
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
		onUnauthenticated: () => recoverSession(saved.url),
	};
}

/** Changes when the album list must reload (FR-003-01, S-003-18). */
export function galleryKey(): string {
	const account = accountStore.state;
	return `${serverStore.state.saved?.url ?? ""}|${account.status}|${account.account?.id ?? ""}`;
}

/** FR-006-02: silent login; otherwise re-read the account for the sign-in message. */
export async function recoverSession(server: string): Promise<boolean> {
	if (await accountStore.reauthenticate(server)) {
		return true;
	}
	await accountStore.refresh(server);
	return false;
}
