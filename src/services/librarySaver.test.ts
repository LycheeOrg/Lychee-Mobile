/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { createLibrarySaver, type LibrarySaverDeps } from "@/services/librarySaver";
import type { DownloadFile } from "@/services/download";

const PATH = "file:///cache/downloads/p1.jpg";
const photo: DownloadFile = { ext: "jpg", name: "Beach.jpg", mimeType: "image/jpeg", save: "photo" };
const video: DownloadFile = { ext: "mov", name: "Clip.mov", mimeType: "video/quicktime", save: "video" };
const rejection = (code: string) => Object.assign(new Error(code), { code });

function deps(platform: string, overrides: Partial<{ savePhoto: unknown; saveVideo: unknown; saveToGallery: unknown }> = {}) {
	const savePhoto = vi.fn<LibrarySaverDeps["media"]["savePhoto"]>(async () => ({ filePath: "x" }));
	const saveVideo = vi.fn<LibrarySaverDeps["media"]["saveVideo"]>(async () => ({ filePath: "x" }));
	const saveToGallery = vi.fn<LibrarySaverDeps["gallery"]["saveToGallery"]>(async () => undefined);
	for (const [name, error] of Object.entries(overrides)) {
		({ savePhoto, saveVideo, saveToGallery } as Record<string, ReturnType<typeof vi.fn>>)[name].mockRejectedValue(error);
	}
	return { platform: () => platform, media: { savePhoto, saveVideo }, gallery: { saveToGallery } };
}

describe("library saver on iOS (NC-007-02)", () => {
	it("saves a photo into the camera roll without an album", async () => {
		const d = deps("ios");

		expect(await createLibrarySaver(d)(PATH, photo)).toBe("saved");
		expect(d.media.savePhoto).toHaveBeenCalledWith({ path: PATH });
		expect(d.gallery.saveToGallery).not.toHaveBeenCalled();
	});

	it("saves a video as a video", async () => {
		const d = deps("ios");

		await createLibrarySaver(d)(PATH, video);

		expect(d.media.saveVideo).toHaveBeenCalledWith({ path: PATH });
	});

	it("reports a denied library permission (S-007-12)", async () => {
		expect(await createLibrarySaver(deps("ios", { savePhoto: rejection("accessDenied") }))(PATH, photo)).toBe("permission_denied");
	});

	it("reports other errors as unsaveable", async () => {
		expect(await createLibrarySaver(deps("ios", { saveVideo: rejection("filesystemError") }))(PATH, video)).toBe("unsaveable");
	});
});

describe("library saver on Android (NC-007-04)", () => {
	it("saves through the app's own plugin with the name and type", async () => {
		const d = deps("android");

		expect(await createLibrarySaver(d)(PATH, video)).toBe("saved");
		expect(d.gallery.saveToGallery).toHaveBeenCalledWith({ path: PATH, name: "Clip.mov", mimeType: "video/quicktime" });
		expect(d.media.saveVideo).not.toHaveBeenCalled();
	});

	it("reports a denied storage permission (S-007-14)", async () => {
		expect(await createLibrarySaver(deps("android", { saveToGallery: rejection("PERMISSION_DENIED") }))(PATH, photo)).toBe("permission_denied");
	});

	it("reports other errors as unsaveable", async () => {
		expect(await createLibrarySaver(deps("android", { saveToGallery: rejection("UNSAVEABLE") }))(PATH, photo)).toBe("unsaveable");
	});
});

describe("library saver elsewhere", () => {
	it("can't save in a browser", async () => {
		expect(await createLibrarySaver(deps("web"))(PATH, photo)).toBe("unsaveable");
	});
});
