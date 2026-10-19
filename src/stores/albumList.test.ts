/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { createAlbumList } from "@/stores/albumList";
import { createSensitiveDisplay, visibleAlbums, visibleSections } from "@/stores/sensitive";
import { albumTile, context, fakeGallery, ok } from "@/stores/__helpers__/fakeGallery";
import type { AlbumSection } from "@/services/galleryParsers";

const SECTIONS: AlbumSection[] = [
	{ key: "smart", albums: [albumTile("recent")] },
	{ key: "albums", albums: [albumTile("holidays"), albumTile("party", { isNsfw: true })] },
	{ key: "shared", albums: [albumTile("secret", { isNsfw: true })] },
];
const SHOWN = { nsfwVisible: true, nsfwBlurred: false };
const HIDDEN = { nsfwVisible: false, nsfwBlurred: true };

describe("visibleSections (FR-003-09)", () => {
	it("keeps everything when sensitive albums are visible", () => {
		expect(visibleSections(SECTIONS, true)).toEqual({ sections: SECTIONS, hiddenCount: 0 });
	});

	it("does the same for a plain list of tiles", () => {
		expect(visibleAlbums(SECTIONS[1].albums, false)).toEqual({ albums: [SECTIONS[1].albums[0]], hiddenCount: 1 });
	});

	it("hides sensitive albums, drops emptied sections and counts them", () => {
		const result = visibleSections(SECTIONS, false);

		expect(result.sections.map((section) => section.key)).toEqual(["smart", "albums"]);
		expect(result.sections[1].albums.map((album) => album.id)).toEqual(["holidays"]);
		expect(result.hiddenCount).toBe(2);
	});
});

describe("album list load (FR-003-01)", () => {
	it("loads the sections and the gallery settings (S-003-01)", async () => {
		const display = createSensitiveDisplay();
		const list = createAlbumList(display);
		const gallery = fakeGallery({ root: [ok({ sections: SECTIONS, canUpload: false })], settings: [ok(SHOWN)] });

		await list.load(context(gallery), "7.11.1");

		expect(list.state.status).toBe("ready");
		expect(list.state.sections).toEqual(SECTIONS);
		expect(display.settings).toEqual(SHOWN);
	});

	it("is loading while the calls run", async () => {
		const list = createAlbumList();
		const pending = list.load(context(fakeGallery({ root: [ok({ sections: [], canUpload: false })] })), null);

		expect(list.state.status).toBe("loading");
		await pending;
		expect(list.state.status).toBe("ready");
	});

	it("falls back to showing everything unblurred when the settings fail", async () => {
		const display = createSensitiveDisplay();
		display.settings = HIDDEN;
		const list = createAlbumList(display);

		await list.load(context(fakeGallery({ root: [ok({ sections: SECTIONS, canUpload: false })] })), null);

		expect(display.settings).toEqual(SHOWN);
	});

	it("stops before any call on a server older than 7.1.0 (S-003-12)", async () => {
		const list = createAlbumList();
		const gallery = fakeGallery({});

		await list.load(context(gallery), "6.10.2");

		expect(list.state.status).toBe("too_old");
		expect(gallery.root).not.toHaveBeenCalled();
	});

	it.each(["unreachable", "failed", "forbidden"] as const)("reports %s (S-003-05)", async (kind) => {
		const list = createAlbumList();

		await list.load(context(fakeGallery({ root: [{ kind }] })), null);

		expect(list.state.status).toBe("failed");
		expect(list.state.failure).toBe(kind);
	});

	it("asks for the gallery password (S-003-14)", async () => {
		const list = createAlbumList();

		await list.load(context(fakeGallery({ root: [{ kind: "gallery_locked" }] })), null);

		expect(list.state.status).toBe("gallery_locked");
	});

	it("hands an ended session to the account store (S-003-08, FR-003-06)", async () => {
		const list = createAlbumList();
		const ctx = context(fakeGallery({ root: [{ kind: "unauthenticated" }] }), true);

		await list.load(ctx, null);

		expect(ctx.onUnauthenticated).toHaveBeenCalled();
		expect(list.state.status).toBe("sign_in");
		expect(list.state.sessionEnded).toBe(true);
	});

	it("tells a guest that sign-in is required", async () => {
		const list = createAlbumList();

		await list.load(context(fakeGallery({ root: [{ kind: "unauthenticated" }] }), false), null);

		expect(list.state.sessionEnded).toBe(false);
	});
});

describe("album list unlock (FR-003-05, NFR-003-05)", () => {
	it("unlocks the gallery and loads it", async () => {
		const list = createAlbumList();
		const gallery = fakeGallery({ root: [{ kind: "gallery_locked" }, ok({ sections: SECTIONS, canUpload: false })], unlock: [{ kind: "ok" }] });
		const ctx = context(gallery);
		await list.load(ctx, null);

		await list.unlock(ctx, "family-secret");

		expect(gallery.unlockGallery).toHaveBeenCalledWith("family-secret");
		expect(list.state.status).toBe("ready");
	});

	it.each(["wrong_password", "throttled", "unreachable", "failed"] as const)("keeps the prompt on %s", async (kind) => {
		const list = createAlbumList();
		const ctx = context(fakeGallery({ root: [{ kind: "gallery_locked" }], unlock: [{ kind }] }));
		await list.load(ctx, null);

		await list.unlock(ctx, "family-secret");

		expect(list.state.status).toBe("gallery_locked");
		expect(list.state.unlockFailure).toBe(kind);
		expect(list.state.unlocking).toBe(false);
		expect(JSON.stringify(list.state)).not.toContain("family-secret");
	});
});

describe("sensitive albums (FR-003-09, S-003-15)", () => {
	it("hides sensitive albums when the server says so, until revealed", async () => {
		const display = createSensitiveDisplay();
		const list = createAlbumList(display);
		await list.load(context(fakeGallery({ root: [ok({ sections: SECTIONS, canUpload: false })], settings: [ok(HIDDEN)] })), null);

		expect(list.view().hiddenCount).toBe(2);

		list.revealSensitive();

		expect(display.revealed).toBe(true);
		expect(list.view().hiddenCount).toBe(0);
		expect(list.view().sections).toEqual(SECTIONS);
	});
});

describe("upload right (FR-005-02)", () => {
	it("exposes the root's upload right", async () => {
		const list = createAlbumList(createSensitiveDisplay());

		await list.load(context(fakeGallery({ root: [ok({ sections: SECTIONS, canUpload: true })] })), null);

		expect(list.state.canUpload).toBe(true);
	});
});
