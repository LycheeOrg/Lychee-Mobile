/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { htmlToText, parsePhotoDetails } from "@/services/photoDetails";
import albumPhotos from "@/services/__fixtures__/lychee-7.11.1/album-photos.json";

const pixel = albumPhotos.photos[0];

describe("parsePhotoDetails (DO-008-01)", () => {
	it("reads a Pixel photo with EXIF and GPS (S-008-01)", () => {
		expect(parsePhotoDetails(pixel)).toEqual({
			resolution: "3064 x 4080",
			filesize: "4.74 MB",
			duration: "",
			fps: "",
			createdAt: "Oct 20, 2026, 8:18:59 AM America/Indiana/Indianapolis",
			takenAt: "Oct 20, 2026, 8:18:13 AM -04:00",
			takenAtModified: false,
			description: "At the park",
			tags: [],
			license: "",
			hasExif: true,
			make: "Google",
			model: "Pixel 11 Pro",
			lens: "Pixel 11 Pro back camera 6.9mm f/1.68",
			aperture: "1.7",
			focal: "7 mm",
			shutter: "1/649 sec",
			iso: "ISO 35",
			hasLocation: true,
			latitude: 40.02778,
			longitude: -86.14528,
			latitudeText: "40° 1' 40\" N",
			longitudeText: "86° 8' 43\" W",
			altitudeText: "242.8m",
			address: "16418, Southpark Drive, Westfield, Hamilton County, Indiana, 46074, United States",
		});
	});

	it("reads a video's duration and fps (S-008-07)", () => {
		const video = albumPhotos.photos[1];
		const details = parsePhotoDetails({ ...video, preformatted: { ...video.preformatted, duration: "00:12", fps: "30 fps" } });

		expect(details).toMatchObject({ duration: "00:12", fps: "30 fps" });
	});

	it("reads tags, license and a changed capture date (S-008-12)", () => {
		const photo = {
			...pixel,
			tags: [
				{ id: 1, name: "park" },
				{ id: 2, name: "dog" },
			],
			preformatted: { ...pixel.preformatted, license: "CC0" },
			precomputed: { ...pixel.precomputed, is_taken_at_modified: true },
		};

		expect(parsePhotoDetails(photo)).toMatchObject({ tags: ["park", "dog"], license: "CC0", takenAtModified: true });
	});

	it("gives empty values for a photo without EXIF or GPS (S-008-03)", () => {
		const details = parsePhotoDetails(albumPhotos.photos[2]);

		expect(details).toMatchObject({ make: "", model: "", latitude: null, longitude: null, latitudeText: "", address: "", hasLocation: false });
	});

	it("leaves GPS out when the server hides it (S-008-05)", () => {
		const hidden = {
			...pixel,
			preformatted: { ...pixel.preformatted, latitude: null, longitude: null, altitude: null, location: null },
			precomputed: { ...pixel.precomputed, latitude: null, longitude: null, altitude: null },
		};

		expect(parsePhotoDetails(hidden)).toMatchObject({ latitude: null, longitude: null, latitudeText: "", altitudeText: "", address: "" });
	});

	it("reads what a Lychee 7.1.x photo provides (FR-008-07, S-008-08)", () => {
		const { make, model, focal, location, ...preformatted } = pixel.preformatted;
		const { latitude, longitude, altitude, ...precomputed } = pixel.precomputed;
		void [make, model, focal, location, latitude, longitude, altitude];

		expect(parsePhotoDetails({ ...pixel, make: "Google", preformatted, precomputed })).toMatchObject({
			make: "",
			model: "",
			focal: "",
			address: "",
			latitude: null,
			lens: "Pixel 11 Pro back camera 6.9mm f/1.68",
			latitudeText: "40° 1' 40\" N",
		});
	});

	it("survives a photo without preformatted or precomputed data", () => {
		expect(parsePhotoDetails({ id: "x" })).toMatchObject({ resolution: "", createdAt: "", takenAt: null, hasExif: false, tags: [] });
	});
});

describe("htmlToText (NFR-008-02, S-008-10)", () => {
	it("keeps the words and the paragraph breaks", () => {
		expect(htmlToText("<p>First <em>line</em></p><p>Second<br>third</p>")).toBe("First line\nSecond\nthird");
	});

	it("runs nothing and loads nothing from hostile markup", () => {
		const text = htmlToText('<img src="x" onerror="window.hacked = true"><script>window.hacked = true</script><style>p{}</style>Hello');

		expect(text).toBe("Hello");
		expect((window as unknown as { hacked?: boolean }).hacked).toBeUndefined();
	});

	it("gives an empty string for nothing", () => {
		expect(htmlToText("")).toBe("");
	});
});
