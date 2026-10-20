/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { parseAlbumHead, parseAlbumPage, parseGallerySettings, parsePhotoPage, parseRootAlbums } from "@/services/galleryParsers";
import albums from "@/services/__fixtures__/lychee-7.11.1/albums.json";
import albumHead from "@/services/__fixtures__/lychee-7.11.1/album-head.json";
import albumHeadSmart from "@/services/__fixtures__/lychee-7.11.1/album-head-smart.json";
import albumAlbums from "@/services/__fixtures__/lychee-7.11.1/album-albums.json";
import albumPhotos from "@/services/__fixtures__/lychee-7.11.1/album-photos.json";
import galleryInit from "@/services/__fixtures__/lychee-7.11.1/gallery-init.json";

const S = "https://photos.example.com/uploads";

describe("parseRootAlbums (FR-003-01, DO-003-03)", () => {
	it("keeps the non-empty sections in display order", () => {
		const root = parseRootAlbums(albums);

		expect(root?.sections.map((section) => section.key)).toEqual(["smart", "albums", "shared", "tags"]);
	});

	it("puts pinned albums first and people last", () => {
		const tile = albums.albums[0];
		const root = parseRootAlbums({ ...albums, pinned_albums: [tile], person_albums: [{ ...tile, id: "person1", is_person_album: true }] });

		expect(root?.sections.map((section) => section.key)).toEqual(["pinned", "smart", "albums", "shared", "tags", "people"]);
	});

	it("reads album tiles (DO-003-01)", () => {
		const [holidays, family, party] = parseRootAlbums(albums)?.sections.find((section) => section.key === "albums")?.albums ?? [];

		expect(holidays).toEqual({
			id: "a1Bc2De3Fg4Hi5Jk6Lm7No8P",
			title: "Holidays",
			thumb: {
				src: `${S}/thumb/3c/4d/3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f.jpeg`,
				src2x: `${S}/thumb2x/3c/4d/3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f@2x.jpeg`,
			},
			photoCount: 128,
			isLocked: false,
			isNsfw: false,
		});
		expect(family).toMatchObject({ thumb: null, photoCount: null, isLocked: true });
		expect(party).toMatchObject({ isNsfw: true, thumb: { src2x: null } });
	});

	it("gives smart albums no count", () => {
		const recent = parseRootAlbums(albums)?.sections[0].albums[0];

		expect(recent).toMatchObject({ id: "recent", photoCount: null });
	});

	it("is empty when every section is empty", () => {
		const empty = { ...albums, smart_albums: [], tag_albums: [], albums: [], shared_albums: [] };

		expect(parseRootAlbums(empty)).toEqual({ sections: [], canUpload: false });
	});

	it("skips malformed tiles", () => {
		const root = parseRootAlbums({ ...albums, albums: [{ title: "no id" }, albums.albums[0]] });

		expect(root?.sections.find((section) => section.key === "albums")?.albums.map((album) => album.id)).toEqual(["a1Bc2De3Fg4Hi5Jk6Lm7No8P"]);
	});

	it.each([null, "html", [], { smart_albums: [] }])("rejects %o", (payload) => {
		expect(parseRootAlbums(payload)).toBeUndefined();
	});
});

describe("parseAlbumHead (DO-003-04)", () => {
	it("reads a regular album with sub-albums", () => {
		expect(parseAlbumHead(albumHead)).toEqual({
			id: "a1Bc2De3Fg4Hi5Jk6Lm7No8P",
			title: "Holidays",
			kind: "album",
			hasSubAlbums: true,
			nsfwWarning: false,
			canUpload: false,
			canDownload: true,
			canDelete: false,
		});
	});

	it("reads a regular album without sub-albums", () => {
		const head = { ...albumHead, resource: { ...albumHead.resource, has_albums: false, num_children: 0 } };

		expect(parseAlbumHead(head)?.hasSubAlbums).toBe(false);
	});

	it("reads a smart album", () => {
		expect(parseAlbumHead(albumHeadSmart)).toEqual({
			id: "recent",
			title: "Recent",
			kind: "smart",
			hasSubAlbums: false,
			nsfwWarning: false,
			canUpload: false,
			canDownload: true,
			canDelete: false,
		});
	});

	it.each([
		["is_tag_album", "tag"],
		["is_person_album", "person"],
	])("reads %s as %s", (flag, kind) => {
		const head = { config: albumHeadSmart.config, resource: { id: "x", title: "X", [flag]: true } };

		expect(parseAlbumHead(head)).toMatchObject({ kind, hasSubAlbums: false });
	});

	it("reads the NSFW warning", () => {
		const head = { ...albumHead, config: { ...albumHead.config, is_nsfw_warning_visible: true } };

		expect(parseAlbumHead(head)?.nsfwWarning).toBe(true);
	});

	it.each([null, {}, { config: {}, resource: { title: "no id" } }])("rejects %o", (payload) => {
		expect(parseAlbumHead(payload)).toBeUndefined();
	});
});

describe("parseAlbumPage (DO-003-05)", () => {
	it("reads sub-album tiles and the page numbers", () => {
		const page = parseAlbumPage(albumAlbums);

		expect(page?.items.map((album) => album.title)).toEqual(["2024", "Private"]);
		expect(page).toMatchObject({ page: 1, lastPage: 2, total: 31 });
	});

	it("rejects a payload without data", () => {
		expect(parseAlbumPage({ current_page: 1, last_page: 1 })).toBeUndefined();
	});
});

describe("parsePhotoPage (DO-003-02)", () => {
	it("reads photo tiles with their kinds and thumbnails", () => {
		const page = parsePhotoPage(albumPhotos);

		expect(page?.items).toEqual([
			expect.objectContaining({
				id: "g7Hi8Jk9Lm0No1Pq2Rs3Tu4V",
				title: "Beach",
				kind: "photo",
				thumb: {
					src: `${S}/thumb/7a/8b/7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d.jpeg`,
					src2x: `${S}/thumb2x/7a/8b/7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d@2x.jpeg`,
				},
			}),
			expect.objectContaining({ title: "Waves", kind: "video" }),
			expect.objectContaining({ title: "Sparkler", kind: "live" }),
			expect.objectContaining({ id: "j0Kl1Mn2Op3Qr4St5Uv6Wx7Y", title: "IMG_0001", kind: "raw", thumb: null }),
		]);
		expect(page).toMatchObject({ page: 1, lastPage: 2, total: 104 });
	});

	it("reads every size variant for the viewer (DO-004-01)", () => {
		const beach = parsePhotoPage(albumPhotos)?.items[0];
		const h = "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d";

		expect(beach?.variants).toEqual({
			medium2x: null,
			medium: { url: `${S}/medium/7a/8b/${h}.jpeg`, width: 1440, height: 1080 },
			original: { url: `${S}/original/7a/8b/${h}.jpeg`, width: 4000, height: 3000 },
			small2x: { url: `${S}/small2x/7a/8b/${h}@2x.jpeg`, width: 960, height: 720 },
			small: { url: `${S}/small/7a/8b/${h}.jpeg`, width: 480, height: 360 },
			thumb2x: { url: `${S}/thumb2x/7a/8b/${h}@2x.jpeg`, width: 400, height: 400 },
			thumb: { url: `${S}/thumb/7a/8b/${h}.jpeg`, width: 200, height: 200 },
		});
		expect(beach?.liveUrl).toBeNull();
	});

	it("keeps a variant without a URL as null (no full-photo access)", () => {
		const photo = albumPhotos.photos[0];
		const downgraded = { ...photo, size_variants: { ...photo.size_variants, original: { ...photo.size_variants.original, url: null } } };

		expect(parsePhotoPage({ ...albumPhotos, photos: [downgraded] })?.items[0].variants.original).toBeNull();
	});

	it("reads the live photo clip", () => {
		const sparkler = parsePhotoPage(albumPhotos)?.items[2];

		expect(sparkler?.liveUrl).toBe(`${S}/original/9c/0d/9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f.mov`);
	});

	it("uses the thumb alone when there is no 2x variant", () => {
		const photo = { ...albumPhotos.photos[0], size_variants: { ...albumPhotos.photos[0].size_variants, thumb2x: null } };

		expect(parsePhotoPage({ ...albumPhotos, photos: [photo] })?.items[0].thumb?.src2x).toBeNull();
	});

	it("rejects a payload without photos", () => {
		expect(parsePhotoPage({ data: [], current_page: 1, last_page: 1 })).toBeUndefined();
	});
});

describe("parseGallerySettings (DO-003-07)", () => {
	it("reads the NSFW settings", () => {
		expect(parseGallerySettings(galleryInit)).toEqual({ nsfwVisible: true, nsfwBlurred: false });
	});

	it("reads hidden and blurred", () => {
		expect(parseGallerySettings({ ...galleryInit, are_nsfw_visible: false, is_nsfw_background_blurred: true })).toEqual({
			nsfwVisible: false,
			nsfwBlurred: true,
		});
	});

	it("rejects a payload without the flags", () => {
		expect(parseGallerySettings({})).toBeUndefined();
	});
});

describe("upload rights (FR-005-02)", () => {
	it("reads the root's upload right", () => {
		expect(parseRootAlbums(albums)?.canUpload).toBe(false);
		expect(parseRootAlbums({ ...albums, rights: { ...albums.rights, can_upload: true } })?.canUpload).toBe(true);
	});

	it("reads an album's upload right", () => {
		expect(parseAlbumHead(albumHead)?.canUpload).toBe(false);
		const writable = { ...albumHead, resource: { ...albumHead.resource, rights: { ...albumHead.resource.rights, can_upload: true } } };
		expect(parseAlbumHead(writable)?.canUpload).toBe(true);
	});

	it("treats missing rights as no upload", () => {
		expect(parseRootAlbums({ ...albums, rights: undefined })?.canUpload).toBe(false);
	});
});

describe("download and delete rights (FR-007-02, DO-007-02)", () => {
	const withRights = (rights: Record<string, boolean>) => ({
		...albumHead,
		resource: { ...albumHead.resource, rights: { ...albumHead.resource.rights, ...rights } },
	});

	it("reads an album's download and delete rights", () => {
		expect(parseAlbumHead(withRights({ can_download: false, can_delete: true }))).toMatchObject({ canDownload: false, canDelete: true });
	});

	it("treats missing rights as neither", () => {
		const head = { ...albumHead, resource: { ...albumHead.resource, rights: undefined } };

		expect(parseAlbumHead(head)).toMatchObject({ canDownload: false, canDelete: false });
	});
});

describe("photo MIME type (FR-007-06, DO-007-02)", () => {
	it("reads each photo's type", () => {
		expect(parsePhotoPage(albumPhotos)?.items.map((photo) => photo.mimeType)).toEqual([
			"image/jpeg",
			"video/mp4",
			"image/jpeg",
			"image/x-canon-cr2",
		]);
	});

	it("keeps a missing type as null", () => {
		const photo = { ...albumPhotos.photos[0], type: undefined };

		expect(parsePhotoPage({ ...albumPhotos, photos: [photo] })?.items[0].mimeType).toBeNull();
	});
});
