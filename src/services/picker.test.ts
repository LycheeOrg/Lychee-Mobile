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
		requestNameAccess: vi.fn<PickerDeps["requestNameAccess"]>(async () => ({ granted: true })),
		nameAccessAsked: vi.fn<PickerDeps["nameAccessAsked"]>(async () => false),
		markNameAccessAsked: vi.fn<PickerDeps["markNameAccessAsked"]>(async () => undefined),
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

describe("original file names on Android (FR-009-05, ADR-009-01)", () => {
	it("asks for photo access once, before the first Android pick", async () => {
		const d = deps("android", "granted");

		await pickForUpload(d);

		expect(d.requestNameAccess).toHaveBeenCalledTimes(1);
		expect(d.markNameAccessAsked).toHaveBeenCalledTimes(1);
		expect(d.requestNameAccess.mock.invocationCallOrder[0]).toBeLessThan(d.pickNative.mock.invocationCallOrder[0]);
	});

	it("doesn't ask again once asked", async () => {
		const d = deps("android", "granted");
		d.nameAccessAsked.mockResolvedValue(true);

		await pickForUpload(d);

		expect(d.requestNameAccess).not.toHaveBeenCalled();
		expect(d.pickNative).toHaveBeenCalled();
	});

	it("picks anyway when access is refused or the request fails (S-009-13)", async () => {
		const refused = deps("android", "granted");
		refused.requestNameAccess.mockResolvedValue({ granted: false });
		const failing = deps("android", "granted");
		failing.requestNameAccess.mockRejectedValue(new Error("boom"));

		expect(await pickForUpload(refused)).toEqual({ kind: "picked", files: [PICKED] });
		expect(await pickForUpload(failing)).toEqual({ kind: "picked", files: [PICKED] });
		expect(failing.markNameAccessAsked).toHaveBeenCalled();
	});

	it("doesn't ask without the location permission, since nothing is picked", async () => {
		const d = deps("android", "denied");

		await pickForUpload(d);

		expect(d.requestNameAccess).not.toHaveBeenCalled();
	});

	it("never asks on iOS, whose picker already gives the original name", async () => {
		const d = deps("ios", "granted");

		await pickForUpload(d);

		expect(d.requestNameAccess).not.toHaveBeenCalled();
	});
});
