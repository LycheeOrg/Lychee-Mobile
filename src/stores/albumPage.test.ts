/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { createAlbumPage } from "@/stores/albumPage";
import { albumTile, context, fakeGallery, head, ok, page, photoTile } from "@/stores/__helpers__/fakeGallery";

describe("album page load (FR-003-02)", () => {
	it("loads the head, the first sub-album page and the first photo page (S-003-03)", async () => {
		const gallery = fakeGallery({
			head: [ok(head({ hasSubAlbums: true }))],
			albums: [ok(page([albumTile("2024")], 1, 1))],
			photos: [ok(page([photoTile("p1")], 1, 2))],
		});
		const album = createAlbumPage("a1", new Set());

		await album.load(context(gallery));

		expect(album.state.status).toBe("ready");
		expect(album.state.title).toBe("Holidays");
		expect(album.state.albums.map((a) => a.id)).toEqual(["2024"]);
		expect(album.state.photos.map((p) => p.id)).toEqual(["p1"]);
		expect(album.state.hasMore).toBe(true);
		expect(album.state.photoTotal).toBe(1);
		expect(gallery.albums).toHaveBeenCalledWith("a1", 1);
		expect(gallery.photos).toHaveBeenCalledWith("a1", 1);
	});

	it("skips sub-albums for albums without them (S-003-04)", async () => {
		const gallery = fakeGallery({ head: [ok(head({ kind: "smart" }))], photos: [ok(page([photoTile("p1")], 1, 1))] });
		const album = createAlbumPage("recent", new Set());

		await album.load(context(gallery));

		expect(gallery.albums).not.toHaveBeenCalled();
		expect(album.state.hasMore).toBe(false);
	});

	it("loads the remaining sub-album pages before more photos", async () => {
		const gallery = fakeGallery({
			head: [ok(head({ hasSubAlbums: true }))],
			albums: [ok(page([albumTile("s1")], 1, 2)), ok(page([albumTile("s2")], 2, 2))],
			photos: [ok(page([photoTile("p1")], 1, 2)), ok(page([photoTile("p2")], 2, 2))],
		});
		const album = createAlbumPage("a1", new Set());
		const ctx = context(gallery);
		await album.load(ctx);

		await album.loadMore(ctx);
		expect(album.state.albums.map((a) => a.id)).toEqual(["s1", "s2"]);
		expect(album.state.photos.map((p) => p.id)).toEqual(["p1"]);

		await album.loadMore(ctx);
		expect(album.state.photos.map((p) => p.id)).toEqual(["p1", "p2"]);
		expect(album.state.hasMore).toBe(false);
		expect(gallery.photos).toHaveBeenLastCalledWith("a1", 2);
	});

	it.each([
		["not_found", "failed"],
		["forbidden", "failed"],
		["unreachable", "failed"],
		["password_required", "password"],
	] as const)("maps a head failure %s to %s (S-003-07, S-003-13)", async (kind, status) => {
		const album = createAlbumPage("a1", new Set());

		await album.load(context(fakeGallery({ head: [{ kind }] })));

		expect(album.state.status).toBe(status);
		expect(album.state.failure).toBe(status === "failed" ? kind : null);
	});

	it("fails the first load when the first page fails", async () => {
		const album = createAlbumPage("a1", new Set());

		await album.load(context(fakeGallery({ head: [ok(head())], photos: [{ kind: "unreachable" }] })));

		expect(album.state.status).toBe("failed");
		expect(album.state.failure).toBe("unreachable");
	});

	it("hands an ended session to the account store (S-003-08)", async () => {
		const ctx = context(fakeGallery({ head: [{ kind: "unauthenticated" }] }), true);
		const album = createAlbumPage("a1", new Set());

		await album.load(ctx);

		expect(ctx.onUnauthenticated).toHaveBeenCalled();
		expect(album.state.status).toBe("sign_in");
		expect(album.state.sessionEnded).toBe(true);
	});
});

describe("album page more and refresh (FR-003-02, S-003-06)", () => {
	it("keeps the tiles when a later page fails, and retries it", async () => {
		const gallery = fakeGallery({
			head: [ok(head())],
			photos: [ok(page([photoTile("p1")], 1, 2)), { kind: "unreachable" }, ok(page([photoTile("p2")], 2, 2))],
		});
		const album = createAlbumPage("a1", new Set());
		const ctx = context(gallery);
		await album.load(ctx);

		await album.loadMore(ctx);
		expect(album.state.moreFailed).toBe(true);
		expect(album.state.photos.map((p) => p.id)).toEqual(["p1"]);
		expect(album.state.status).toBe("ready");

		await album.loadMore(ctx);
		expect(album.state.moreFailed).toBe(false);
		expect(album.state.photos.map((p) => p.id)).toEqual(["p1", "p2"]);
		expect(gallery.photos).toHaveBeenLastCalledWith("a1", 2);
	});

	it("does nothing when there is nothing more", async () => {
		const gallery = fakeGallery({ head: [ok(head())], photos: [ok(page([photoTile("p1")], 1, 1))] });
		const album = createAlbumPage("a1", new Set());
		const ctx = context(gallery);
		await album.load(ctx);

		await album.loadMore(ctx);

		expect(gallery.photos).toHaveBeenCalledTimes(1);
	});

	it("reloads from the first page", async () => {
		const gallery = fakeGallery({
			head: [ok(head()), ok(head())],
			photos: [ok(page([photoTile("p1")], 1, 2)), ok(page([photoTile("p2")], 2, 2)), ok(page([photoTile("p1b")], 1, 1))],
		});
		const album = createAlbumPage("a1", new Set());
		const ctx = context(gallery);
		await album.load(ctx);
		await album.loadMore(ctx);

		await album.load(ctx);

		expect(album.state.photos.map((p) => p.id)).toEqual(["p1b"]);
	});

	it("drops a page that arrives after a reload started", async () => {
		let release: (value: unknown) => void = () => undefined;
		const gallery = fakeGallery({
			head: [ok(head()), ok(head())],
			photos: [ok(page([photoTile("p1")], 1, 2)), ok(page([photoTile("fresh")], 1, 1))],
		});
		const slow = ok(page([photoTile("stale")], 2, 2));
		const album = createAlbumPage("a1", new Set());
		const ctx = context(gallery);
		await album.load(ctx);
		gallery.photos.mockImplementationOnce(() => new Promise((resolve) => (release = () => resolve(slow))));

		const more = album.loadMore(ctx);
		await album.load(ctx);
		release(undefined);
		await more;

		expect(album.state.photos.map((p) => p.id)).toEqual(["fresh"]);
	});
});

describe("album unlock (FR-003-05, S-003-13, NFR-003-05)", () => {
	it("unlocks and loads the album", async () => {
		const gallery = fakeGallery({
			head: [{ kind: "password_required" }, ok(head())],
			photos: [ok(page([photoTile("p1")], 1, 1))],
			unlock: [{ kind: "ok" }],
		});
		const album = createAlbumPage("a1", new Set());
		const ctx = context(gallery);
		await album.load(ctx);

		await album.unlock(ctx, "family-secret");

		expect(gallery.unlockAlbum).toHaveBeenCalledWith("a1", "family-secret");
		expect(album.state.status).toBe("ready");
	});

	it("keeps the prompt on a wrong password", async () => {
		const ctx = context(fakeGallery({ head: [{ kind: "password_required" }], unlock: [{ kind: "wrong_password" }] }));
		const album = createAlbumPage("a1", new Set());
		await album.load(ctx);

		await album.unlock(ctx, "family-secret");

		expect(album.state.status).toBe("password");
		expect(album.state.unlockFailure).toBe("wrong_password");
		expect(JSON.stringify(album.state)).not.toContain("family-secret");
	});
});

describe("sensitive album warning (FR-003-09, S-003-16)", () => {
	it("warns before loading, and remembers Continue for that album", async () => {
		const seen = new Set<string>();
		const gallery = fakeGallery({
			head: [ok(head({ nsfwWarning: true })), ok(head({ nsfwWarning: true }))],
			photos: [ok(page([photoTile("p1")], 1, 1)), ok(page([photoTile("p1")], 1, 1))],
		});
		const ctx = context(gallery);
		const first = createAlbumPage("a1", seen);

		await first.load(ctx);
		expect(first.state.status).toBe("sensitive");
		expect(gallery.photos).not.toHaveBeenCalled();

		await first.continueSensitive(ctx);
		expect(first.state.status).toBe("ready");

		const again = createAlbumPage("a1", seen);
		await again.load(ctx);
		expect(again.state.status).toBe("ready");
	});
});

describe("photo total (DO-004-02, FR-004-07)", () => {
	it("takes the album's photo count from the photo pages", async () => {
		const gallery = fakeGallery({ head: [ok(head())], photos: [ok(page([photoTile("p1")], 1, 3, 250))] });
		const album = createAlbumPage("a1", new Set());

		await album.load(context(gallery));

		expect(album.state.photoTotal).toBe(250);
	});
});

describe("upload right (FR-005-02)", () => {
	it("exposes the album's kind and upload right", async () => {
		const gallery = fakeGallery({ head: [ok(head({ kind: "smart", canUpload: true }))], photos: [ok(page([], 1, 1))] });
		const album = createAlbumPage("unsorted", new Set());

		await album.load(context(gallery));

		expect(album.state.kind).toBe("smart");
		expect(album.state.canUpload).toBe(true);
	});
});

describe("silent login (FR-006-02, S-006-02)", () => {
	it("loads the album again once after a successful silent login", async () => {
		const gallery = fakeGallery({ head: [{ kind: "unauthenticated" }, ok(head())], photos: [ok(page([photoTile("p1")], 1, 1))] });
		const ctx = context(gallery, true, true);
		const album = createAlbumPage("a1", new Set());

		await album.load(ctx);

		expect(album.state.status).toBe("ready");
		expect(album.state.photos.map((p) => p.id)).toEqual(["p1"]);
	});

	it("retries a later page once after a successful silent login", async () => {
		const gallery = fakeGallery({
			head: [ok(head())],
			photos: [ok(page([photoTile("p1")], 1, 2)), { kind: "unauthenticated" }, ok(page([photoTile("p2")], 2, 2))],
		});
		const ctx = context(gallery, true, true);
		const album = createAlbumPage("a1", new Set());
		await album.load(ctx);

		await album.loadMore(ctx);

		expect(album.state.photos.map((p) => p.id)).toEqual(["p1", "p2"]);
		expect(album.state.status).toBe("ready");
		expect(ctx.onUnauthenticated).toHaveBeenCalledTimes(1);
	});

	it("asks to sign in when the silent login fails", async () => {
		const ctx = context(fakeGallery({ head: [{ kind: "unauthenticated" }] }), true, false);
		const album = createAlbumPage("a1", new Set());

		await album.load(ctx);

		expect(album.state.status).toBe("sign_in");
	});
});

describe("delete selected photos (FR-007-03)", () => {
	async function loaded(albumId: string, gallery: ReturnType<typeof fakeGallery>, ctx = context(gallery)) {
		const album = createAlbumPage(albumId, new Set());
		await album.load(ctx);
		return album;
	}

	it("clears the selection on every load (S-007-15)", async () => {
		const gallery = fakeGallery({
			head: [ok(head()), ok(head())],
			photos: [ok(page([photoTile("p1")], 1, 1)), ok(page([photoTile("p1")], 1, 1))],
		});
		const album = await loaded("a1", gallery);
		album.selection.start("p1");

		await album.load(context(gallery));

		expect(album.selection.state.active).toBe(false);
	});

	it("deletes from this album and drops the photos from the grid (S-007-05)", async () => {
		const gallery = fakeGallery({
			head: [ok(head())],
			photos: [ok(page([photoTile("p1"), photoTile("p2"), photoTile("p3")], 1, 1))],
			deletes: [{ kind: "ok" }],
		});
		const album = await loaded("a1", gallery);
		album.selection.start("p1");
		album.selection.toggle("p3");

		expect(await album.deleteSelected(context(gallery))).toBe("ok");

		expect(gallery.deletePhotos).toHaveBeenCalledWith(["p1", "p3"], "a1");
		expect(album.state.photos.map((p) => p.id)).toEqual(["p2"]);
		expect(album.state.photoTotal).toBe(1);
		expect(album.selection.state.active).toBe(false);
	});

	it("deletes from Unsorted with its id (S-007-06)", async () => {
		const gallery = fakeGallery({
			head: [ok(head({ id: "unsorted", kind: "smart" }))],
			photos: [ok(page([photoTile("p1")], 1, 1))],
			deletes: [{ kind: "ok" }],
		});
		const album = await loaded("unsorted", gallery);
		album.selection.start("p1");

		await album.deleteSelected(context(gallery));

		expect(gallery.deletePhotos).toHaveBeenCalledWith(["p1"], "unsorted");
	});

	it("signs in silently once and deletes again (S-007-08)", async () => {
		const gallery = fakeGallery({
			head: [ok(head())],
			photos: [ok(page([photoTile("p1"), photoTile("p2")], 1, 1))],
			deletes: [{ kind: "unauthenticated" }, { kind: "ok" }],
		});
		const ctx = context(gallery, true, true);
		const album = await loaded("a1", gallery, ctx);
		album.selection.start("p1");

		expect(await album.deleteSelected(ctx)).toBe("ok");

		expect(ctx.onUnauthenticated).toHaveBeenCalledTimes(1);
		expect(gallery.deletePhotos).toHaveBeenCalledTimes(2);
		expect(album.state.photos.map((p) => p.id)).toEqual(["p2"]);
	});

	it("hands over to sign-in when the silent login fails", async () => {
		const gallery = fakeGallery({ head: [ok(head())], photos: [ok(page([photoTile("p1")], 1, 1))], deletes: [{ kind: "unauthenticated" }] });
		const ctx = context(gallery, true, false);
		const album = await loaded("a1", gallery, ctx);
		album.selection.start("p1");

		expect(await album.deleteSelected(ctx)).toBe("unauthenticated");

		expect(album.state.status).toBe("sign_in");
		expect(album.state.sessionEnded).toBe(true);
	});

	it.each(["forbidden", "failed", "unreachable"] as const)("keeps photos and selection when the delete is %s (S-007-07)", async (kind) => {
		const gallery = fakeGallery({ head: [ok(head())], photos: [ok(page([photoTile("p1")], 1, 1))], deletes: [{ kind }] });
		const album = await loaded("a1", gallery);
		album.selection.start("p1");

		expect(await album.deleteSelected(context(gallery))).toBe(kind);

		expect(album.state.photos.map((p) => p.id)).toEqual(["p1"]);
		expect(album.selection.ids()).toEqual(["p1"]);
	});

	it("reloads the album after a timeout, since photos may be gone (S-007-09)", async () => {
		const gallery = fakeGallery({
			head: [ok(head()), ok(head())],
			photos: [ok(page([photoTile("p1"), photoTile("p2")], 1, 1)), ok(page([photoTile("p2")], 1, 1))],
			deletes: [{ kind: "timeout" }],
		});
		const album = await loaded("a1", gallery);
		album.selection.start("p1");

		expect(await album.deleteSelected(context(gallery))).toBe("timeout");

		expect(gallery.head).toHaveBeenCalledTimes(2);
		expect(album.state.photos.map((p) => p.id)).toEqual(["p2"]);
	});

	it("does nothing with no photo selected", async () => {
		const gallery = fakeGallery({ head: [ok(head())], photos: [ok(page([photoTile("p1")], 1, 1))] });
		const album = await loaded("a1", gallery);
		album.selection.start();

		expect(await album.deleteSelected(context(gallery))).toBe("ok");

		expect(gallery.deletePhotos).not.toHaveBeenCalled();
	});

	it("steps back a page so photos that moved up still load, once each (S-007-19)", async () => {
		const gallery = fakeGallery({
			head: [ok(head())],
			photos: [
				ok(page([photoTile("p1"), photoTile("p2")], 1, 3, 6)),
				ok(page([photoTile("p3"), photoTile("p4")], 2, 3, 6)),
				// After deleting p1 the server's pages are p2 p3 | p4 p5 | p6.
				ok(page([photoTile("p4"), photoTile("p5")], 2, 3, 5)),
				ok(page([photoTile("p6")], 3, 3, 5)),
			],
			deletes: [{ kind: "ok" }],
		});
		const ctx = context(gallery);
		const album = await loaded("a1", gallery, ctx);
		await album.loadMore(ctx);
		album.selection.start("p1");

		await album.deleteSelected(ctx);
		await album.loadMore(ctx);
		await album.loadMore(ctx);

		expect(gallery.photos.mock.calls.map((call) => call[1])).toEqual([1, 2, 2, 3]);
		expect(album.state.photos.map((p) => p.id)).toEqual(["p2", "p3", "p4", "p5", "p6"]);
		expect(album.state.hasMore).toBe(false);
	});
});

describe("map switch (FR-008-05)", () => {
	it("keeps whether the album allows a map", async () => {
		const album = createAlbumPage("a1", new Set());

		await album.load(context(fakeGallery({ head: [ok(head({ mapAllowed: true }))], photos: [ok(page([photoTile("p1")], 1, 1))] })));

		expect(album.state.mapAllowed).toBe(true);
	});
});

describe("album creation right (FR-010-02)", () => {
	it("keeps whether sub-albums may be created", async () => {
		const album = createAlbumPage("a1", new Set());

		await album.load(context(fakeGallery({ head: [ok(head({ canEdit: true }))], photos: [ok(page([photoTile("p1")], 1, 1))] })));

		expect(album.state.canEdit).toBe(true);
	});
});
