/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { addMenuFor, addMenuForRoot, createAlbumIn, hasItems, promptForAlbum, titleProblem } from "@/stores/addMenu";
import type { CreateAlbumResult } from "@/services/gallery";
import { context, fakeGallery } from "@/stores/__helpers__/fakeGallery";
import type { AlbumKind } from "@/services/galleryParsers";

const album = (kind: AlbumKind, id = "a1", canUpload = true, canEdit = true) => ({ id, kind, canUpload, canEdit });

describe("addMenuForRoot (FR-010-02)", () => {
	it("offers both on the album list with both rights (S-010-01)", () => {
		expect(addMenuForRoot({ canUpload: true, canEdit: true })).toEqual({ upload: { albumId: null }, createIn: { parentId: null } });
	});

	it("follows each right on its own", () => {
		expect(addMenuForRoot({ canUpload: false, canEdit: true })).toEqual({ upload: null, createIn: { parentId: null } });
		expect(addMenuForRoot({ canUpload: true, canEdit: false })).toEqual({ upload: { albumId: null }, createIn: null });
	});
});

describe("addMenuFor (FR-010-02)", () => {
	it("uploads into and creates inside a regular album (S-010-03)", () => {
		expect(addMenuFor(album("album"))).toEqual({ upload: { albumId: "a1" }, createIn: { parentId: "a1" } });
	});

	it("offers only upload without edit rights (S-010-04)", () => {
		expect(addMenuFor(album("album", "a1", true, false))).toEqual({ upload: { albumId: "a1" }, createIn: null });
	});

	it.each<[AlbumKind, string]>([
		["smart", "recent"],
		["smart", "unsorted"],
		["tag", "t1"],
		["person", "p1"],
	])("never creates inside a %s album (%s) (S-010-05)", (kind, id) => {
		expect(addMenuFor(album(kind, id)).createIn).toBeNull();
	});

	it("keeps Unsorted's upload rule (FR-005-02)", () => {
		expect(addMenuFor(album("smart", "unsorted")).upload).toEqual({ albumId: null });
	});
});

describe("hasItems (FR-010-01, S-010-06)", () => {
	it("hides the + when nothing is allowed", () => {
		expect(hasItems({ upload: null, createIn: null })).toBe(false);
		expect(hasItems({ upload: { albumId: null }, createIn: null })).toBe(true);
		expect(hasItems({ upload: null, createIn: { parentId: null } })).toBe(true);
	});
});

describe("titleProblem (FR-010-03, S-010-07)", () => {
	it("accepts 1 to 100 characters after trimming", () => {
		expect(titleProblem(" Summer 2026 ")).toBeNull();
		expect(titleProblem("x".repeat(100))).toBeNull();
	});

	it("rejects an empty or blank title", () => {
		expect(titleProblem("")).toBe("empty");
		expect(titleProblem("   ")).toBe("empty");
	});

	it("rejects more than 100 characters", () => {
		expect(titleProblem("x".repeat(101))).toBe("too_long");
	});
});

describe("createAlbumIn (FR-010-03)", () => {
	it("creates with the trimmed title", async () => {
		const gallery = fakeGallery({});
		gallery.createAlbum.mockResolvedValue({ kind: "ok", id: "n1" });

		expect(await createAlbumIn(context(gallery), "a1", " Summer ")).toEqual({ kind: "ok", id: "n1" });
		expect(gallery.createAlbum).toHaveBeenCalledWith("Summer", "a1");
	});

	it("signs in silently once on a 401 and creates again (FR-009-03)", async () => {
		const gallery = fakeGallery({});
		gallery.createAlbum.mockResolvedValueOnce({ kind: "unauthenticated" }).mockResolvedValueOnce({ kind: "ok", id: "n1" });
		const ctx = context(gallery, true, true);

		expect(await createAlbumIn(ctx, null, "Summer")).toEqual({ kind: "ok", id: "n1" });
		expect(ctx.onUnauthenticated).toHaveBeenCalledTimes(1);
	});

	it("reports a 401 the silent login can't fix", async () => {
		const gallery = fakeGallery({});
		gallery.createAlbum.mockResolvedValue({ kind: "unauthenticated" });

		expect(await createAlbumIn(context(gallery, true, false), null, "Summer")).toEqual({ kind: "unauthenticated" });
	});
});

describe("promptForAlbum (FR-010-03)", () => {
	/** Answers the title dialog from `titles` in order; `null` is Cancel. */
	function dialog(titles: (string | null)[]) {
		return vi.fn(async (_initial: string, _message: string | null) => (titles.length > 0 ? (titles.shift() ?? null) : null));
	}

	it("creates and returns the new album's id (S-010-02)", async () => {
		const ask = dialog(["Summer 2026"]);
		const create = vi.fn(async (): Promise<CreateAlbumResult> => ({ kind: "ok", id: "n1" }));

		expect(await promptForAlbum({ ask, create })).toBe("n1");
		expect(ask).toHaveBeenCalledWith("", null);
		expect(create).toHaveBeenCalledWith("Summer 2026");
	});

	it("returns null on Cancel without creating", async () => {
		const create = vi.fn(async (): Promise<CreateAlbumResult> => ({ kind: "ok", id: "n1" }));

		expect(await promptForAlbum({ ask: dialog([null]), create })).toBeNull();
		expect(create).not.toHaveBeenCalled();
	});

	it("asks again with the message for a bad title (S-010-07)", async () => {
		const ask = dialog(["  ", "x".repeat(101), "Summer"]);
		const create = vi.fn(async (): Promise<CreateAlbumResult> => ({ kind: "ok", id: "n1" }));

		expect(await promptForAlbum({ ask, create })).toBe("n1");
		expect(ask.mock.calls.map((call) => call[1])).toEqual([null, "Enter a title.", "Album titles can be at most 100 characters."]);
		expect(create).toHaveBeenCalledTimes(1);
	});

	it("asks again with the typed title and the failure (S-010-09)", async () => {
		const ask = dialog(["Summer", "Summer!"]);
		const results: CreateAlbumResult[] = [{ kind: "forbidden" }, { kind: "ok", id: "n1" }];
		const create = vi.fn(async (): Promise<CreateAlbumResult> => results.shift() ?? { kind: "failed" });

		expect(await promptForAlbum({ ask, create })).toBe("n1");
		expect(ask.mock.calls[1]).toEqual(["Summer", "You can't create albums here."]);
	});
});
