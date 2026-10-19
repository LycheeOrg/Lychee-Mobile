/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { pickForUpload, type PickerDeps } from "@/services/picker";

const PICKED = { path: "content://media/picker/0/1", name: "PXL_1.jpg", mimeType: "image/jpeg", size: 2048, modifiedAt: 1760000000000 };

// The plugin types its states with the DOM's global `PermissionState`.
function deps(platform: "android" | "ios", permission: PermissionState, afterRequest: PermissionState = permission) {
	const status = (state: PermissionState) => ({ accessMediaLocation: state, readExternalStorage: "granted" as PermissionState });
	return {
		platform: () => platform,
		checkPermissions: vi.fn<PickerDeps["checkPermissions"]>(async () => status(permission)),
		requestPermissions: vi.fn<PickerDeps["requestPermissions"]>(async () => status(afterRequest)),
		pickMedia: vi.fn<PickerDeps["pickMedia"]>(async () => ({ files: [PICKED] })),
		pickNative: vi.fn<PickerDeps["pickNative"]>(async () => ({ files: [PICKED] })),
	};
}

describe("pickForUpload (FR-005-01, NFR-005-04)", () => {
	it("picks originals on iOS, several at once, without transcoding", async () => {
		const d = deps("ios", "granted");

		expect(await pickForUpload(d)).toEqual({ kind: "picked", files: [PICKED] });
		expect(d.pickMedia).toHaveBeenCalledWith({ limit: 0, skipTranscoding: true });
		expect(d.pickNative).not.toHaveBeenCalled();
	});

	it("picks through the app's own picker launch on Android, which asks for location (Q-005-05)", async () => {
		const d = deps("android", "granted");

		expect(await pickForUpload(d)).toEqual({ kind: "picked", files: [PICKED] });
		expect(d.pickNative).toHaveBeenCalled();
		expect(d.pickMedia).not.toHaveBeenCalled();
	});

	it("reports a cancelled Android picker", async () => {
		const d = deps("android", "granted");
		d.pickNative.mockRejectedValueOnce(Object.assign(new Error("pick canceled."), { code: "CANCELLED" }));

		expect(await pickForUpload(d)).toEqual({ kind: "cancelled" });
	});

	it("reports a missing Android picker as a failure", async () => {
		const d = deps("android", "granted");
		d.pickNative.mockRejectedValueOnce(Object.assign(new Error("No system photo picker."), { code: "UNAVAILABLE" }));

		expect(await pickForUpload(d)).toEqual({ kind: "failed" });
	});

	it("asks for the media location permission on Android when needed", async () => {
		const d = deps("android", "prompt", "granted");

		expect((await pickForUpload(d)).kind).toBe("picked");
		expect(d.requestPermissions).toHaveBeenCalledWith({ permissions: ["accessMediaLocation"] });
	});

	it("refuses to pick on Android without the permission (S-005-09)", async () => {
		const d = deps("android", "prompt", "denied");

		expect(await pickForUpload(d)).toEqual({ kind: "permission_denied" });
		expect(d.pickNative).not.toHaveBeenCalled();
	});

	it("doesn't ask for permissions on iOS", async () => {
		const d = deps("ios", "denied");

		expect((await pickForUpload(d)).kind).toBe("picked");
		expect(d.checkPermissions).not.toHaveBeenCalled();
	});

	it("reports a cancelled picker", async () => {
		const d = deps("ios", "granted");
		d.pickMedia.mockRejectedValueOnce(new Error("pickFiles canceled."));

		expect(await pickForUpload(d)).toEqual({ kind: "cancelled" });
	});

	it("reports a picker error", async () => {
		const d = deps("ios", "granted");
		d.pickMedia.mockRejectedValueOnce(new Error("something else"));

		expect(await pickForUpload(d)).toEqual({ kind: "failed" });
	});

	it("drops files without a path and defaults a missing date", async () => {
		const d = deps("ios", "granted");
		d.pickMedia.mockResolvedValueOnce({
			files: [
				{ ...PICKED, path: undefined },
				{ ...PICKED, modifiedAt: undefined },
			],
		});

		expect(await pickForUpload(d)).toEqual({ kind: "picked", files: [{ ...PICKED, modifiedAt: null }] });
	});
});
