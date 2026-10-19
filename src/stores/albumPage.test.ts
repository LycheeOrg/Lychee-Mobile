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
