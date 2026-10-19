/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { Capacitor } from "@capacitor/core";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import { OriginalMedia, type NativePickedFile } from "@/services/originalMedia";

/** DO-005-01: a file picked for upload. */
export type PickedFile = { path: string; name: string; mimeType: string; size: number; modifiedAt: number | null };

export type PickOutcome = { kind: "picked"; files: PickedFile[] } | { kind: "cancelled" | "permission_denied" | "failed" };

/** The parts of the plugin used here, injectable for tests. */
export type PickerDeps = {
	platform: () => string;
	checkPermissions: typeof FilePicker.checkPermissions;
	requestPermissions: typeof FilePicker.requestPermissions;
	pickMedia: typeof FilePicker.pickMedia;
	/** Android picking through the app's own plugin (Q-005-05). */
	pickNative: () => Promise<{ files: NativePickedFile[] }>;
};

export const nativePickerDeps: PickerDeps = {
	platform: () => Capacitor.getPlatform(),
	checkPermissions: () => FilePicker.checkPermissions(),
	requestPermissions: (options) => FilePicker.requestPermissions(options),
	pickMedia: (options) => FilePicker.pickMedia(options),
	pickNative: () => OriginalMedia.pick(),
};

const CANCELLED = /cancel/i;
/**
 * FR-005-01, NFR-005-04: opens the system photo picker for several photos and
 * videos, untranscoded. On Android the media location permission is required
 * first, and the picker is launched by the app's own plugin so it offers
 * "Include location" (Q-005-05); without the permission nothing is picked.
 */
export async function pickForUpload(deps: PickerDeps = nativePickerDeps): Promise<PickOutcome> {
	const android = deps.platform() === "android";
	if (android && !(await hasMediaLocation(deps))) {
		return { kind: "permission_denied" };
	}
	try {
		const { files } = android ? await deps.pickNative() : await deps.pickMedia({ limit: 0, skipTranscoding: true });
		return { kind: "picked", files: files.flatMap(toPickedFile) };
	} catch (error) {
		return { kind: isCancelled(error) ? "cancelled" : "failed" };
	}
}

function isCancelled(error: unknown): boolean {
	const { code, message } = typeof error === "object" && error !== null ? (error as { code?: unknown; message?: unknown }) : {};
	return code === "CANCELLED" || (typeof message === "string" && CANCELLED.test(message));
}

async function hasMediaLocation(deps: PickerDeps): Promise<boolean> {
	const current = await deps.checkPermissions();
	if (current.accessMediaLocation === "granted") {
		return true;
	}
	const requested = await deps.requestPermissions({ permissions: ["accessMediaLocation"] });
	return requested.accessMediaLocation === "granted";
}

function toPickedFile(file: { path?: string; name: string; mimeType: string; size: number; modifiedAt?: number }): PickedFile[] {
	if (file.path === undefined || file.path === "") {
		return [];
	}
	return [{ path: file.path, name: file.name, mimeType: file.mimeType, size: file.size, modifiedAt: file.modifiedAt ?? null }];
}
