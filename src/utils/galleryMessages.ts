/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import type { GalleryFailure, UnlockFailure } from "@/services/gallery";
import type { SectionKey } from "@/services/galleryParsers";

const UNREACHABLE = "Can't reach this server.";

export const EMPTY_LIST = "No albums to show.";
export const EMPTY_ALBUM = "This album is empty.";
export const LOAD_MORE_FAILED = "Couldn't load more.";
export const TOO_OLD = "Album browsing needs Lychee 7.1 or newer.";
export const ALBUM_PASSWORD = "This album needs a password.";
export const GALLERY_PASSWORD = "This gallery needs a password.";
export const SENSITIVE_WARNING = "This album may contain sensitive content.";

const SECTION_TITLES: Record<SectionKey, string> = {
	pinned: "Pinned",
	smart: "Smart albums",
	albums: "Albums",
	shared: "Shared with me",
	tags: "Tag albums",
	people: "People",
};

const ALBUM_FAILURES: Partial<Record<GalleryFailure, string>> = {
	unreachable: UNREACHABLE,
	not_found: "This album no longer exists.",
	forbidden: "You don't have access to this album.",
};

const UNLOCK_FAILURES: Record<UnlockFailure, string> = {
	wrong_password: "Wrong password.",
	throttled: "Too many attempts. Try again later.",
	unreachable: UNREACHABLE,
	failed: "Unlocking failed. Try again.",
};

/** FR-003-01: the album list's failure line. */
export function listFailureMessage(kind: GalleryFailure): string {
	return kind === "unreachable" ? UNREACHABLE : "Couldn't load the albums.";
}

/** FR-003-02: an album page's failure line. */
export function albumFailureMessage(kind: GalleryFailure): string {
	return ALBUM_FAILURES[kind] ?? "Couldn't load this album.";
}

export function sectionTitle(key: SectionKey): string {
	return SECTION_TITLES[key];
}

/** FR-003-05. */
export function unlockFailureMessage(kind: UnlockFailure): string {
	return UNLOCK_FAILURES[kind];
}

/** FR-003-06. */
export function signInNeededMessage(sessionEnded: boolean): string {
	return sessionEnded ? "Your session ended. Sign in again." : "Sign in to see these albums.";
}

/** FR-003-09. */
export function hiddenSensitiveMessage(count: number): string {
	return `${count} sensitive ${count === 1 ? "album" : "albums"} hidden`;
}
