/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { createPhotoAlbums } from "@/stores/photoAlbums";
import { context, fakeGallery } from "@/stores/__helpers__/fakeGallery";
import type { PhotoAlbumsResult } from "@/services/gallery";

const albums: PhotoAlbumsResult = { kind: "ok", albums: [{ id: "a1", title: "Holidays" }] };

function gallery(results: PhotoAlbumsResult[]) {
	const g = fakeGallery({});
	g.photoAlbums.mockImplementation(async () => results.shift() ?? { kind: "failed" });
	return g;
}

describe("photo albums loader (FR-008-06)", () => {
	it("loads a photo's albums once and keeps them", async () => {
		const g = gallery([albums]);
		const loader = createPhotoAlbums();

		expect(await loader.load(context(g), "p1")).toEqual(albums);
		expect(await loader.load(context(g), "p1")).toEqual(albums);

		expect(g.photoAlbums).toHaveBeenCalledTimes(1);
		expect(loader.state.byPhoto.p1).toEqual(albums);
	});

	it("signs in silently once on a 401", async () => {
		const g = gallery([{ kind: "unauthenticated" }, albums]);
		const ctx = context(g, true, true);

		expect(await createPhotoAlbums().load(ctx, "p1")).toEqual(albums);
		expect(ctx.onUnauthenticated).toHaveBeenCalledTimes(1);
	});

	it("gives up when the silent login fails", async () => {
		const g = gallery([{ kind: "unauthenticated" }]);

		expect(await createPhotoAlbums().load(context(g, true, false), "p1")).toEqual({ kind: "unauthenticated" });
	});

	it("tries a failed photo again next time", async () => {
		const g = gallery([{ kind: "failed" }, albums]);
		const loader = createPhotoAlbums();

		await loader.load(context(g), "p1");

		expect(await loader.load(context(g), "p1")).toEqual(albums);
	});

	it("shares one request between overlapping loads", async () => {
		const g = gallery([albums]);
		const loader = createPhotoAlbums();

		await Promise.all([loader.load(context(g), "p1"), loader.load(context(g), "p1")]);

		expect(g.photoAlbums).toHaveBeenCalledTimes(1);
	});

	it("marks a photo as loading while its request runs", async () => {
		const g = fakeGallery({});
		let answer: (result: PhotoAlbumsResult) => void = () => undefined;
		g.photoAlbums.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
		const loader = createPhotoAlbums();

		const loading = loader.load(context(g), "p1");
		await vi.waitFor(() => expect(loader.state.byPhoto.p1).toEqual({ kind: "loading" }));
		answer(albums);
		await loading;

		expect(loader.state.byPhoto.p1).toEqual(albums);
	});
});
