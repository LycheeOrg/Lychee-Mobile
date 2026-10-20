/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { deleteCapture } from "@/services/camera";
import { OriginalMedia } from "@/services/originalMedia";
import type { PickedFile } from "@/services/picker";
import type { Cleanup, PendingCapture } from "@/stores/pendingCaptures";

/** What keeping and releasing pending files needs from the device (ADR-012-01). */
export type PendingFilesDeps = {
	platform: () => string;
	/** Creates a folder in the app's Library (iOS). */
	makeDir: (path: string) => Promise<void>;
	/** Moves a file into the app's Library; resolves its new URI. */
	move: (from: string, to: string) => Promise<string>;
	deleteFile: (path: string) => Promise<void>;
	deleteCapture: (path: string) => Promise<void>;
	/** Android: gives back the persistable access taken when picking. */
	releaseAccess: (uri: string) => Promise<void>;
	unique: () => string;
};

const PENDING_FOLDER = "pending";

const nativeDeps: PendingFilesDeps = {
	platform: () => Capacitor.getPlatform(),
	makeDir: async (path) => {
		await Filesystem.mkdir({ path, directory: Directory.Library, recursive: true }).catch(() => undefined);
	},
	move: async (from, to) => {
		await Filesystem.rename({ from, to, toDirectory: Directory.Library });
		return (await Filesystem.getUri({ path: to, directory: Directory.Library })).uri;
	},
	deleteFile: async (path) => {
		await Filesystem.deleteFile({ path });
	},
	deleteCapture: (path) => deleteCapture(path),
	releaseAccess: async (uri) => {
		await OriginalMedia.releaseAccess({ uri });
	},
	unique: () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
};

/**
 * FR-012-04: makes picked files survive the app being closed. Android keeps
 * the read access `OriginalMedia.pick()` took; iOS moves the picker's
 * temporary copy into `Library/pending/`.
 */
export async function persistPicked(files: PickedFile[], deps: PendingFilesDeps = nativeDeps): Promise<{ file: PickedFile; cleanup: Cleanup }[]> {
	if (deps.platform() !== "ios") {
		return files.map((file) => ({ file, cleanup: "grant" }));
	}
	await deps.makeDir(PENDING_FOLDER);
	const kept: { file: PickedFile; cleanup: Cleanup }[] = [];
	for (const file of files) {
		const target = `${PENDING_FOLDER}/${deps.unique()}-${file.name.replace(/[^\p{L}\p{N}._-]/gu, "_")}`;
		const path = await deps.move(file.path, target).catch(() => file.path);
		kept.push({ file: { ...file, path }, cleanup: "copy" });
	}
	return kept;
}

/** FR-011-04, FR-012-04: cleans up after a file that left the pending list. */
export async function releasePending(item: PendingCapture, deps: PendingFilesDeps = nativeDeps): Promise<void> {
	const cleanup = item.cleanup ?? "capture";
	if (cleanup === "capture") {
		await deps.deleteCapture(item.file.path);
	} else if (cleanup === "copy") {
		await deps.deleteFile(item.file.path);
	} else {
		await deps.releaseAccess(item.file.path);
	}
}
