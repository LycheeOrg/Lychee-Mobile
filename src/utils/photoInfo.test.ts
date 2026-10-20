/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { cameraLine, mapsUrl, mapTiles, TILE_SIZE } from "@/utils/photoInfo";

const OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

describe("cameraLine (FR-008-04)", () => {
	it("joins make and model", () => {
		expect(cameraLine("Google", "Pixel 11 Pro")).toBe("Google Pixel 11 Pro");
	});

	it("leaves out a make the model already starts with", () => {
		expect(cameraLine("Canon", "Canon EOS R5")).toBe("Canon EOS R5");
		expect(cameraLine("NIKON CORPORATION", "NIKON Z 6")).toBe("NIKON CORPORATION NIKON Z 6");
	});

	it("uses whichever is present", () => {
		expect(cameraLine("", "Pixel 11 Pro")).toBe("Pixel 11 Pro");
		expect(cameraLine("Google", "")).toBe("Google");
		expect(cameraLine("", "")).toBe("");
	});
});

describe("mapsUrl (FR-008-05, S-008-11)", () => {
	it("uses geo: on Android", () => {
		expect(mapsUrl("android", 40.02778, -86.14528)).toBe("geo:40.02778,-86.14528?q=40.02778,-86.14528");
	});

	it("uses Apple Maps on iOS", () => {
		expect(mapsUrl("ios", 40.02778, -86.14528)).toBe("maps://?ll=40.02778,-86.14528&q=40.02778,-86.14528");
	});

	it("uses OpenStreetMap elsewhere", () => {
		expect(mapsUrl("web", 40.02778, -86.14528)).toBe("https://www.openstreetmap.org/?mlat=40.02778&mlon=-86.14528#map=15/40.02778/-86.14528");
	});
});

describe("mapTiles (FR-008-05, ADR-008-01)", () => {
	it("puts the point at the centre of the middle tile at 0,0 zoom 1", () => {
		const centre = mapTiles(OSM, 0, 0, 1).find((tile) => tile.left === 0 && tile.top === 0);

		expect(centre?.url).toBe("https://tile.openstreetmap.org/1/1/1.png");
	});

	it("covers five columns and three rows around the point", () => {
		expect(mapTiles(OSM, 40.02778, -86.14528, 15)).toHaveLength(15);
	});

	it("places the tile holding the point so that the point lands at the centre", () => {
		const tiles = mapTiles(OSM, 40.02778, -86.14528, 15);
		const holding = tiles.filter((tile) => tile.left <= 0 && tile.left + TILE_SIZE > 0 && tile.top <= 0 && tile.top + TILE_SIZE > 0);

		expect(holding).toHaveLength(1);
		expect(holding[0].url).toBe("https://tile.openstreetmap.org/15/8542/12401.png");
	});

	it("fills Lychee's subdomain placeholder and trims the template", () => {
		const tiles = mapTiles(" https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png ", 0, 0, 1);

		expect(tiles.every((tile) => tile.url.startsWith("https://a.tile.openstreetmap.fr/osmfr/1/"))).toBe(true);
	});

	it("wraps around the date line and skips rows beyond the poles", () => {
		const tiles = mapTiles(OSM, 85, 179.9, 2);

		expect(tiles.some((tile) => tile.url.endsWith("/2/0/0.png"))).toBe(true);
		expect(tiles.every((tile) => !tile.url.includes("/-1."))).toBe(true);
		expect(tiles).toHaveLength(10);
	});
});
