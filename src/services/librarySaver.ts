/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { Capacitor } from "@capacitor/core";
import { Media, type MediaPlugin } from "@capacitor-community/media";
import type { DownloadFile } from "@/services/download";
import { OriginalMedia, type OriginalMediaPlugin } from "@/services/originalMedia";

export type LibrarySaverDeps = {
	platform: () => string;
	media: Pick<MediaPlugin, "savePhoto" | "saveVideo">;
	gallery: Pick<OriginalMediaPlugin, "saveToGallery">;
};

const nativeDeps: LibrarySaverDeps = { platform: () => Capacitor.getPlatform(), media: Media, gallery: OriginalMedia };

/** The media plugin's (iOS) and the app plugin's (Android) codes for a refused permission. */
const DENIED_CODES = new Set(["accessDenied", "PERMISSION_DENIED"]);

/**
 * ADR-007-01: adds a downloaded file to the photo library. iOS uses the media
 * plugin's camera roll save (add-only access); Android the app's own
 * `MediaStore` save, so files outlive the app (Q-007-07).
 */
export function createLibrarySaver(deps: LibrarySaverDeps = nativeDeps) {
	return async (path: string, file: DownloadFile): Promise<"saved" | "permission_denied" | "unsaveable"> => {
		try {
			const platform = deps.platform();
			if (platform === "ios") {
				await (file.save === "video" ? deps.media.saveVideo({ path }) : deps.media.savePhoto({ path }));
			} else if (platform === "android") {
				await deps.gallery.saveToGallery({ path, name: file.name, mimeType: file.mimeType });
			} else {
				return "unsaveable";
			}
			return "saved";
		} catch (error) {
			return DENIED_CODES.has(codeOf(error)) ? "permission_denied" : "unsaveable";
		}
	};
}

function codeOf(error: unknown): string {
	const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
	return typeof code === "string" ? code : "";
}
