/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { Capacitor, registerPlugin } from "@capacitor/core";
import type { UploadResult } from "@/services/upload";

/** NC-005-03: the app's own Android plugin (`OriginalMediaPlugin.java`). */
export type NativePickedFile = { path: string; name: string; mimeType: string; size: number; modifiedAt?: number };

export type OriginalMediaPlugin = {
	/** Android: the system photo picker, asked to offer "Include location" and keep original formats (Q-005-05). */
	pick: () => Promise<{ files: NativePickedFile[] }>;
	/** Copies the original into the app cache and reports whether it carries a location (NFR-005-04). */
	prepare: (options: { uri: string }) => Promise<{ path: string; location: "present" | "missing" | "unknown" }>;
	release: (options: { path: string }) => Promise<void>;
};

export const OriginalMedia = registerPlugin<OriginalMediaPlugin>("OriginalMedia");

type OriginalDeps = { platform: () => string; plugin: OriginalMediaPlugin };

const nativeDeps: OriginalDeps = { platform: () => Capacitor.getPlatform(), plugin: OriginalMedia };

/**
 * FR-005-06, NFR-005-04: runs `upload` on the original file. On Android the
 * picked URI is first copied into the app cache (unredacted when the user
 * turned on "Include location" in the picker) and the copy deleted afterwards;
 * a finished upload whose copy has no location is marked `withoutLocation`
 * (Q-005-06). iOS's picker already hands over a copy of the original.
 */
export async function withOriginal(
	path: string,
	upload: (path: string) => Promise<UploadResult>,
	deps: OriginalDeps = nativeDeps,
): Promise<UploadResult> {
	if (deps.platform() !== "android") {
		return upload(path);
	}
	let copy: { path: string; location: string };
	try {
		copy = await deps.plugin.prepare({ uri: path });
	} catch {
		return { kind: "unreadable" };
	}
	try {
		const result = await upload(copy.path);
		return result.kind === "done" && copy.location === "missing" ? { kind: "done", withoutLocation: true } : result;
	} finally {
		await deps.plugin.release({ path: copy.path }).catch(() => undefined);
	}
}
