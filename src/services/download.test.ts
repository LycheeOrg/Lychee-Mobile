/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { downloadFileOf, transferFailure } from "@/services/download";
import type { PhotoKind, PhotoTile } from "@/services/galleryParsers";
import { photoTile } from "@/stores/__helpers__/fakeGallery";

const S = "https://photos.example.com/uploads/original/7a/8b";

function photo(overrides: { title?: string; kind?: PhotoKind; mimeType?: string | null; original?: string | null }): PhotoTile {
	const base = photoTile("p1");
	const original = overrides.original === undefined ? `${S}/7a8b.jpeg` : overrides.original;
	return {
		...base,
		title: overrides.title ?? "Beach",
		kind: overrides.kind ?? "photo",
		mimeType: overrides.mimeType === undefined ? "image/jpeg" : overrides.mimeType,
		variants: { ...base.variants, original: original === null ? null : { url: original, width: 1, height: 1 } },
	};
}

describe("downloadFileOf (FR-007-06)", () => {
	it("takes the extension of the stored original", () => {
		expect(downloadFileOf(photo({}))).toEqual({ ext: "jpeg", name: "Beach.jpeg", mimeType: "image/jpeg", save: "photo" });
	});

	it("ignores a signed URL's query and lowercases the extension", () => {
		expect(downloadFileOf(photo({ original: `${S}/7a8b.HEIC?expires=1&signature=x`, mimeType: "image/heic" }))).toMatchObject({
			ext: "heic",
			mimeType: "image/heic",
		});
	});

	it("uses the stored JPEG of a converted RAW photo, not its camera type", () => {
		expect(downloadFileOf(photo({ kind: "raw", mimeType: "image/x-canon-cr2", original: `${S}/7a8b.jpg` }))).toEqual({
			ext: "jpg",
			name: "Beach.jpg",
			mimeType: "image/jpeg",
			save: "photo",
		});
	});

	it.each([
		["image/jpeg", "jpg"],
		["image/heic", "heic"],
		["image/heif", "heif"],
		["image/png", "png"],
		["image/gif", "gif"],
		["image/webp", "webp"],
		["video/mp4", "mp4"],
		["video/quicktime", "mov"],
	])("falls back to the type %s → %s without an original URL", (mimeType, ext) => {
		expect(downloadFileOf(photo({ original: null, mimeType }))).toMatchObject({ ext, mimeType });
	});

	it("falls back to the type when the URL has no extension", () => {
		expect(downloadFileOf(photo({ original: `${S}/7a8b`, mimeType: "image/png" }))?.ext).toBe("png");
	});

	it("saves videos as videos", () => {
		expect(downloadFileOf(photo({ kind: "video", mimeType: "video/quicktime", original: `${S}/clip.mov` }))).toMatchObject({
			save: "video",
			mimeType: "video/quicktime",
		});
	});

	it("keeps the type for an extension it doesn't know", () => {
		expect(downloadFileOf(photo({ original: `${S}/7a8b.avif`, mimeType: "image/avif" }))).toMatchObject({ ext: "avif", mimeType: "image/avif" });
	});

	it("gives up without an original URL or a known type (S-007-18)", () => {
		expect(downloadFileOf(photo({ original: null, mimeType: "image/x-canon-cr2" }))).toBeNull();
		expect(downloadFileOf(photo({ original: null, mimeType: null }))).toBeNull();
	});

	it("replaces characters that don't belong in file names", () => {
		expect(downloadFileOf(photo({ title: "Trip: Rome/Day 1 *best*" }))?.name).toBe("Trip_ Rome_Day 1 _best_.jpeg");
	});

	it("names an untitled photo by its id", () => {
		expect(downloadFileOf(photo({ title: "  " }))?.name).toBe("p1.jpeg");
	});

	it("doesn't repeat an extension already in the title", () => {
		expect(downloadFileOf(photo({ title: "IMG_0001.JPEG" }))?.name).toBe("IMG_0001.JPEG");
	});
});

describe("transferFailure (FR-007-04)", () => {
	const rejected = (code: string, httpStatus?: number) => Object.assign(new Error("failed"), { code, data: { code, httpStatus } });

	it.each([
		[401, "unauthenticated"],
		[403, "forbidden"],
		[404, "not_found"],
		[500, "unsaveable"],
	])("maps HTTP %i to %s", (status, kind) => {
		expect(transferFailure(rejected("OS-PLUG-FLTR-0010", status))).toBe(kind);
	});

	it.each(["OS-PLUG-FLTR-0008", "OS-PLUG-FLTR-0011"])("maps %s (connection or transfer) to interrupted", (code) => {
		expect(transferFailure(rejected(code))).toBe("interrupted");
	});

	it("maps anything else to unsaveable", () => {
		expect(transferFailure(new Error("boom"))).toBe("unsaveable");
		expect(transferFailure("boom")).toBe("unsaveable");
	});
});
