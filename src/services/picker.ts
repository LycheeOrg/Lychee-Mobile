/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
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
	/** FR-009-05: Android photo and video read access, for the camera's file names. */
	requestNameAccess: () => Promise<{ granted: boolean }>;
	nameAccessAsked: () => Promise<boolean>;
	markNameAccessAsked: () => Promise<void>;
};

/** FR-009-05: the app asks for name access only once (ADR-009-01). */
const NAME_ACCESS_ASKED = "media_names_asked";

export const nativePickerDeps: PickerDeps = {
	platform: () => Capacitor.getPlatform(),
	checkPermissions: () => FilePicker.checkPermissions(),
	requestPermissions: (options) => FilePicker.requestPermissions(options),
	pickMedia: (options) => FilePicker.pickMedia(options),
	pickNative: () => OriginalMedia.pick(),
	requestNameAccess: () => OriginalMedia.requestNameAccess(),
	nameAccessAsked: async () => (await Preferences.get({ key: NAME_ACCESS_ASKED })).value === "true",
	markNameAccessAsked: () => Preferences.set({ key: NAME_ACCESS_ASKED, value: "true" }),
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
	if (android) {
		await askForNamesOnce(deps);
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

/** FR-009-05: the answer only decides whether names are looked up; it never blocks a pick. */
async function askForNamesOnce(deps: PickerDeps): Promise<void> {
	if (await deps.nameAccessAsked()) {
		return;
	}
	await deps.requestNameAccess().catch(() => undefined);
	await deps.markNameAccessAsked();
}

function toPickedFile(file: { path?: string; name: string; mimeType: string; size: number; modifiedAt?: number }): PickedFile[] {
	if (file.path === undefined || file.path === "") {
		return [];
	}
	return [{ path: file.path, name: file.name, mimeType: file.mimeType, size: file.size, modifiedAt: file.modifiedAt ?? null }];
}
