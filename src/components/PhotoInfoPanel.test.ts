/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount } from "@vue/test-utils";
import PhotoInfoPanel from "@/components/PhotoInfoPanel.vue";
import { parsePhotoPage, type MapProvider, type PhotoTile } from "@/services/galleryParsers";
import { parsePhotoDetails } from "@/services/photoDetails";
import type { PhotoAlbumsState } from "@/stores/photoAlbums";
import albumPhotos from "@/services/__fixtures__/lychee-7.11.1/album-photos.json";

const photos = parsePhotoPage(albumPhotos)?.items ?? [];
const pixel = photos[0];
const OSM: MapProvider = { layer: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© OpenStreetMap contributors" };
const ALBUMS: PhotoAlbumsState = { kind: "ok", albums: [{ id: "a1", title: "Mallory LaPaglia" }] };

function panel(
	props: { photo?: PhotoTile; albums?: PhotoAlbumsState; mapProvider?: MapProvider | null; mapAllowed?: boolean; platform?: string } = {},
) {
	return mount(PhotoInfoPanel, {
		props: { photo: pixel, albums: ALBUMS, mapProvider: OSM, mapAllowed: true, platform: "android", ...props },
		global: { stubs: { IonIcon: true, IonSpinner: true } },
	});
}

function withDetails(photo: PhotoTile, change: (payload: (typeof albumPhotos.photos)[number]) => object): PhotoTile {
	const payload = albumPhotos.photos.find((raw) => raw.id === photo.id) ?? albumPhotos.photos[0];
	return { ...photo, details: parsePhotoDetails(change(payload)) };
}

describe("PhotoInfoPanel (FR-008-02 … 06)", () => {
	it("shows everything Lychee knows about a Pixel photo (S-008-01)", () => {
		const text = panel().text();

		for (const expected of [
			"About",
			"Beach",
			"3064 x 4080",
			"4.74 MB",
			"Oct 20, 2026, 8:18:59 AM America/Indiana/Indianapolis",
			"Oct 20, 2026, 8:18:13 AM -04:00",
			"At the park",
			"Mallory LaPaglia",
			"Google Pixel 11 Pro",
			"Pixel 11 Pro back camera 6.9mm f/1.68",
			"ƒ / 1.7",
			"7 mm",
			"1/649 sec",
			"ISO 35",
			"40° 1' 40\" N",
			"86° 8' 43\" W",
			"242.8m",
			"16418, Southpark Drive, Westfield",
		]) {
			expect(text).toContain(expected);
		}
	});

	it("leaves out EXIF and location for a photo without them (S-008-03)", () => {
		const text = panel({ photo: photos[2] }).text();

		expect(text).not.toContain("EXIF data");
		expect(text).not.toContain("Location");
		expect(text).toContain("Albums");
	});

	it("shows a video's duration and frame rate (S-008-07)", () => {
		const video = withDetails(photos[1], (raw) => ({ ...raw, preformatted: { ...raw.preformatted, duration: "00:12", fps: "30 fps" } }));

		expect(panel({ photo: video }).text()).toContain("00:12");
		expect(panel({ photo: video }).text()).toContain("30 fps");
	});

	it("marks a changed capture date (S-008-12)", () => {
		const changed = withDetails(pixel, (raw) => ({ ...raw, precomputed: { ...raw.precomputed, is_taken_at_modified: true } }));

		expect(panel({ photo: changed }).get(".taken").text()).toContain("*");
		expect(panel().get(".taken").text()).not.toContain("*");
	});

	it("shows tags and the license", () => {
		const tagged = withDetails(pixel, (raw) => ({
			...raw,
			tags: [{ id: 1, name: "park" }],
			preformatted: { ...raw.preformatted, license: "CC0" },
		}));
		const text = panel({ photo: tagged }).text();

		expect(text).toContain("park");
		expect(text).toContain("License");
		expect(text).toContain("CC0");
	});

	it("shows server text as text, never as HTML (NFR-008-02, S-008-10)", () => {
		const hostile = { ...pixel, details: { ...pixel.details, description: '<img src=x onerror="alert(1)">' } };
		const wrapper = panel({ photo: hostile });

		expect(wrapper.find(".description img").exists()).toBe(false);
		expect(wrapper.get(".description").text()).toBe('<img src=x onerror="alert(1)">');
	});
});

describe("PhotoInfoPanel albums (FR-008-06)", () => {
	it.each([
		[{ kind: "loading" }, "Loading albums"],
		[{ kind: "ok", albums: [] }, "In no album you can see"],
		[{ kind: "failed" }, "Couldn't load albums"],
		[{ kind: "unauthenticated" }, "Couldn't load albums"],
	] as [PhotoAlbumsState, string][])("shows %o as %s (S-008-09)", (albums, text) => {
		expect(panel({ albums }).text()).toContain(text);
	});

	it("leaves the section out on Lychee before 7.4.0 (S-008-08)", () => {
		expect(panel({ albums: { kind: "unsupported" } }).text()).not.toContain("Albums");
	});
});

describe("PhotoInfoPanel map (FR-008-05, ADR-008-01)", () => {
	it("draws the tiles around the point with the attribution", () => {
		const map = panel().get(".static-map");

		expect(map.findAll("img.tile")).toHaveLength(15);
		expect(map.text()).toContain("© OpenStreetMap contributors");
	});

	it("has no map where the album doesn't allow one (S-008-06)", () => {
		const wrapper = panel({ mapAllowed: false });

		expect(wrapper.find(".static-map").exists()).toBe(false);
		expect(wrapper.text()).toContain("40° 1' 40\" N");
	});

	it("has no map without a provider or without decimal coordinates (S-008-05)", () => {
		const hidden = { ...pixel, details: { ...pixel.details, latitude: null, longitude: null } };

		expect(panel({ mapProvider: null }).find(".static-map").exists()).toBe(false);
		expect(panel({ photo: hidden }).find(".static-map").exists()).toBe(false);
	});

	it("opens the phone's maps app from the map or the coordinates (S-008-11)", async () => {
		const wrapper = panel({ platform: "ios" });

		await wrapper.get(".static-map").trigger("click");
		await wrapper.get(".coordinates").trigger("click");

		expect(wrapper.emitted("open")).toEqual([
			["maps://?ll=40.02778,-86.14528&q=40.02778,-86.14528"],
			["maps://?ll=40.02778,-86.14528&q=40.02778,-86.14528"],
		]);
	});
});
