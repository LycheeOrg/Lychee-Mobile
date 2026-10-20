/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { withOriginal, type OriginalMediaPlugin } from "@/services/originalMedia";
import type { UploadResult } from "@/services/upload";

const PICKED = "content://media/picker/0/com.android.providers.media.photopicker/media/1275";
const COPY = "file:///data/user/0/dev.lycheeorg.mobile/cache/uploads/1275.jpg";

function plugin(prepare: OriginalMediaPlugin["prepare"] = async () => ({ path: COPY, location: "present" })) {
	return {
		pick: vi.fn<OriginalMediaPlugin["pick"]>(async () => ({ files: [] })),
		prepare: vi.fn(prepare),
		release: vi.fn<OriginalMediaPlugin["release"]>(async () => undefined),
		saveToGallery: vi.fn<OriginalMediaPlugin["saveToGallery"]>(async () => undefined),
		requestNameAccess: vi.fn<OriginalMediaPlugin["requestNameAccess"]>(async () => ({ granted: false })),
		capture: vi.fn<OriginalMediaPlugin["capture"]>(),
		deleteCapture: vi.fn<OriginalMediaPlugin["deleteCapture"]>(async () => undefined),
		hasCamera: vi.fn<OriginalMediaPlugin["hasCamera"]>(async () => ({ available: true })),
		releaseAccess: vi.fn<OriginalMediaPlugin["releaseAccess"]>(async () => undefined),
	};
}

const rejection = (code: string) => Object.assign(new Error("refused"), { code });

describe("withOriginal (FR-005-06, NFR-005-04)", () => {
	it("uploads the picker's file directly on iOS", async () => {
		const native = plugin();
		const run = vi.fn(async (): Promise<UploadResult> => ({ kind: "done" }));

		expect(await withOriginal("file:///tmp/IMG.HEIC", run, { platform: () => "ios", plugin: native })).toEqual({ kind: "done" });
		expect(run).toHaveBeenCalledWith("file:///tmp/IMG.HEIC");
		expect(native.prepare).not.toHaveBeenCalled();
	});

	it("uploads the unredacted copy on Android and deletes it afterwards", async () => {
		const native = plugin();
		const run = vi.fn(async (): Promise<UploadResult> => ({ kind: "done" }));

		expect(await withOriginal(PICKED, run, { platform: () => "android", plugin: native })).toEqual({ kind: "done" });
		expect(native.prepare).toHaveBeenCalledWith({ uri: PICKED });
		expect(run).toHaveBeenCalledWith(COPY);
		expect(native.release).toHaveBeenCalledWith({ path: COPY });
	});

	it("deletes the copy after a failed upload too", async () => {
		const native = plugin();

		expect(await withOriginal(PICKED, async () => ({ kind: "interrupted" }), { platform: () => "android", plugin: native })).toEqual({
			kind: "interrupted",
		});
		expect(native.release).toHaveBeenCalledWith({ path: COPY });
	});

	it.each([
		["missing", { kind: "done", withoutLocation: true }],
		["present", { kind: "done" }],
		["unknown", { kind: "done" }],
	] as const)("reports a %s location on a finished upload (NFR-005-04, S-005-13)", async (location, expected) => {
		const native = plugin(async () => ({ path: COPY, location }));

		expect(await withOriginal(PICKED, async () => ({ kind: "done" }), { platform: () => "android", plugin: native })).toEqual(expected);
	});

	it("leaves other results alone when the location is missing", async () => {
		const native = plugin(async () => ({ path: COPY, location: "missing" }));

		expect(await withOriginal(PICKED, async () => ({ kind: "skipped" }), { platform: () => "android", plugin: native })).toEqual({
			kind: "skipped",
		});
	});

	it("reports other copy failures as unreadable", async () => {
		const native = plugin(() => Promise.reject(rejection("UNREADABLE")));

		expect(await withOriginal(PICKED, async () => ({ kind: "done" }), { platform: () => "android", plugin: native })).toEqual({
			kind: "unreadable",
		});
	});

	it("ignores a failure to delete the copy", async () => {
		const native = plugin();
		native.release.mockRejectedValueOnce(new Error("gone"));

		expect(await withOriginal(PICKED, async () => ({ kind: "done" }), { platform: () => "android", plugin: native })).toEqual({ kind: "done" });
	});
});
