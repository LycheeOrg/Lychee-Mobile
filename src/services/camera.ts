/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { Capacitor, registerPlugin } from "@capacitor/core";
import { OriginalMedia, type NativePickedFile } from "@/services/originalMedia";
import type { PickedFile } from "@/services/picker";

/** NC-011-01, NC-011-02: what both platforms' capture code offers (ADR-011-01). */
export type CapturePlugin = {
	/** Opens the camera; the photo is written to the app's capture folder under `name` (made unique). */
	capture: (options: { name: string }) => Promise<NativePickedFile>;
	deleteCapture: (options: { path: string }) => Promise<void>;
	hasCamera: () => Promise<{ available: boolean }>;
};

/** NC-011-02: the app's own iOS plugin (`OriginalCameraPlugin.swift`). */
export const OriginalCamera = registerPlugin<CapturePlugin>("OriginalCamera");

export type CameraDeps = { platform: () => string; android: CapturePlugin; ios: CapturePlugin; now: () => Date };

const nativeDeps: CameraDeps = { platform: () => Capacitor.getPlatform(), android: OriginalMedia, ios: OriginalCamera, now: () => new Date() };

export type CaptureFailure = "cancelled" | "no_camera" | "permission_denied" | "failed";
export type CaptureOutcome = { kind: "taken"; file: PickedFile } | { kind: CaptureFailure };

const OUTCOME_BY_CODE: Record<string, CaptureFailure> = {
	CANCELLED: "cancelled",
	NO_CAMERA: "no_camera",
	PERMISSION_DENIED: "permission_denied",
};

/** FR-011-02: `IMG_yyyyMMdd_HHmmss.jpg` in local time, like the platforms' cameras. */
export function captureName(date: Date): string {
	const two = (value: number) => String(value).padStart(2, "0");
	const day = `${date.getFullYear()}${two(date.getMonth() + 1)}${two(date.getDate())}`;
	return `IMG_${day}_${two(date.getHours())}${two(date.getMinutes())}${two(date.getSeconds())}.jpg`;
}

/** FR-011-02: takes one photo with the phone's camera. */
export async function takePhoto(deps: CameraDeps = nativeDeps): Promise<CaptureOutcome> {
	const plugin = pluginFor(deps);
	if (plugin === null) {
		return { kind: "no_camera" };
	}
	const now = deps.now();
	try {
		const file = await plugin.capture({ name: captureName(now) });
		return { kind: "taken", file: { ...file, modifiedAt: file.modifiedAt ?? now.getTime() } };
	} catch (error) {
		const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
		return { kind: (typeof code === "string" ? OUTCOME_BY_CODE[code] : undefined) ?? "failed" };
	}
}

/** FR-011-01: whether Take photo can be offered. */
export async function cameraAvailable(deps: CameraDeps = nativeDeps): Promise<boolean> {
	try {
		return (await pluginFor(deps)?.hasCamera())?.available === true;
	} catch {
		return false;
	}
}

/** FR-011-04: removes a taken photo's file once Lychee has it, or when discarded. */
export async function deleteCapture(path: string, deps: CameraDeps = nativeDeps): Promise<void> {
	await pluginFor(deps)?.deleteCapture({ path });
}

function pluginFor(deps: CameraDeps): CapturePlugin | null {
	const platform = deps.platform();
	if (platform === "android") {
		return deps.android;
	}
	return platform === "ios" ? deps.ios : null;
}
