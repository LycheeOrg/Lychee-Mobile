/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { persistPicked, releasePending, type PendingFilesDeps } from "@/services/pendingFiles";
import type { PickedFile } from "@/services/picker";

const picked = (name: string, path = `file:///tmp/${name}`): PickedFile => ({ path, name, mimeType: "image/heic", size: 100, modifiedAt: 1 });

function deps(platform: string) {
	let counter = 0;
	return {
		platform: () => platform,
		makeDir: vi.fn<PendingFilesDeps["makeDir"]>(async () => undefined),
		move: vi.fn<PendingFilesDeps["move"]>(async (_from: string, to: string) => `file:///Library/${to}`),
		deleteFile: vi.fn<PendingFilesDeps["deleteFile"]>(async () => undefined),
		deleteCapture: vi.fn<PendingFilesDeps["deleteCapture"]>(async () => undefined),
		releaseAccess: vi.fn<PendingFilesDeps["releaseAccess"]>(async () => undefined),
		unique: () => `u${++counter}`,
	};
}

describe("persistPicked (FR-012-04)", () => {
	it("keeps Android files as they are; their access was kept when picking", async () => {
		const d = deps("android");
		const files = [picked("PXL_1.jpg", "content://media/picker/0/1")];

		expect(await persistPicked(files, d)).toEqual([{ file: files[0], cleanup: "grant" }]);
		expect(d.move).not.toHaveBeenCalled();
	});

	it("moves iOS's temporary copies into app storage", async () => {
		const d = deps("ios");

		expect(await persistPicked([picked("IMG_1.HEIC"), picked("IMG_2.HEIC")], d)).toEqual([
			{ file: { ...picked("IMG_1.HEIC"), path: "file:///Library/pending/u1-IMG_1.HEIC" }, cleanup: "copy" },
			{ file: { ...picked("IMG_2.HEIC"), path: "file:///Library/pending/u2-IMG_2.HEIC" }, cleanup: "copy" },
		]);
		expect(d.makeDir).toHaveBeenCalledWith("pending");
		expect(d.move).toHaveBeenCalledWith("file:///tmp/IMG_1.HEIC", "pending/u1-IMG_1.HEIC");
	});

	it("keeps the temporary path when a move fails, still cleaned up after upload", async () => {
		const d = deps("ios");
		d.move.mockRejectedValue(new Error("no space"));

		expect(await persistPicked([picked("IMG_1.HEIC")], d)).toEqual([{ file: picked("IMG_1.HEIC"), cleanup: "copy" }]);
	});

	it("keeps a safe file name in the copy's path", async () => {
		const d = deps("ios");

		await persistPicked([picked("My photo/1.HEIC")], d);

		expect(d.move).toHaveBeenCalledWith("file:///tmp/My photo/1.HEIC", "pending/u1-My_photo_1.HEIC");
	});
});

describe("releasePending (FR-012-04)", () => {
	it.each([
		["capture", "deleteCapture"],
		["copy", "deleteFile"],
		["grant", "releaseAccess"],
	] as const)("cleans up a %s with %s", async (cleanup, call) => {
		const d = deps("ios");

		await releasePending({ file: picked("x.jpg", "file:///x.jpg"), albumId: null, server: "s", cleanup }, d);

		expect(d[call]).toHaveBeenCalledWith("file:///x.jpg");
	});

	it("treats an entry without a cleanup kind as a taken photo (Feature 011)", async () => {
		const d = deps("android");

		await releasePending({ file: picked("x.jpg", "file:///x.jpg"), albumId: null, server: "s" }, d);

		expect(d.deleteCapture).toHaveBeenCalledWith("file:///x.jpg");
	});
});
