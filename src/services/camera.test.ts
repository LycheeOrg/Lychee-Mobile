/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { cameraAvailable, captureName, deleteCapture, takePhoto, type CameraDeps } from "@/services/camera";

const TAKEN = {
	path: "file:///files/captures/IMG_20261020_181342.jpg",
	name: "IMG_20261020_181342.jpg",
	mimeType: "image/jpeg",
	size: 2048,
	modifiedAt: 1760998422000,
};
const NOW = new Date(2026, 9, 20, 18, 13, 42);

function plugin() {
	return {
		capture: vi.fn<CameraDeps["ios"]["capture"]>(async () => TAKEN),
		deleteCapture: vi.fn<CameraDeps["ios"]["deleteCapture"]>(async () => undefined),
		hasCamera: vi.fn<CameraDeps["ios"]["hasCamera"]>(async () => ({ available: true })),
	};
}

function deps(platform: string) {
	return { platform: () => platform, android: plugin(), ios: plugin(), now: () => NOW };
}

describe("captureName (FR-011-02)", () => {
	it("names a photo by its local capture time", () => {
		expect(captureName(new Date(2026, 0, 5, 7, 3, 9))).toBe("IMG_20260105_070309.jpg");
	});
});

describe("takePhoto (FR-011-02)", () => {
	it.each(["android", "ios"] as const)("opens the %s camera and returns the photo", async (platform) => {
		const d = deps(platform);

		expect(await takePhoto(d)).toEqual({ kind: "taken", file: TAKEN });
		expect(d[platform].capture).toHaveBeenCalledWith({ name: "IMG_20261020_181342.jpg" });
	});

	it("has no camera in a browser", async () => {
		expect(await takePhoto(deps("web"))).toEqual({ kind: "no_camera" });
	});

	it.each([
		["CANCELLED", "cancelled"],
		["NO_CAMERA", "no_camera"],
		["PERMISSION_DENIED", "permission_denied"],
		["BOOM", "failed"],
	])("maps %s to %s (S-011-06, S-011-07)", async (code, kind) => {
		const d = deps("ios");
		d.ios.capture.mockRejectedValue(Object.assign(new Error(code), { code }));

		expect(await takePhoto(d)).toEqual({ kind });
	});

	it("defaults a missing date to now", async () => {
		const d = deps("ios");
		d.ios.capture.mockResolvedValue({ ...TAKEN, modifiedAt: undefined });

		expect(await takePhoto(d)).toEqual({ kind: "taken", file: { ...TAKEN, modifiedAt: NOW.getTime() } });
	});
});

describe("cameraAvailable (FR-011-01)", () => {
	it("asks the platform's plugin", async () => {
		const d = deps("ios");
		d.ios.hasCamera.mockResolvedValue({ available: false });

		expect(await cameraAvailable(deps("android"))).toBe(true);
		expect(await cameraAvailable(d)).toBe(false);
	});

	it("is false in a browser or when the plugin fails", async () => {
		const d = deps("android");
		d.android.hasCamera.mockRejectedValue(new Error("not implemented"));

		expect(await cameraAvailable(deps("web"))).toBe(false);
		expect(await cameraAvailable(d)).toBe(false);
	});
});

describe("deleteCapture (FR-011-04)", () => {
	it.each(["android", "ios"] as const)("deletes the %s copy through its plugin", async (platform) => {
		const d = deps(platform);

		await deleteCapture("file:///captures/IMG_1.jpg", d);

		expect(d[platform].deleteCapture).toHaveBeenCalledWith({ path: "file:///captures/IMG_1.jpg" });
	});
});
