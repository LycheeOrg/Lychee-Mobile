/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

/** Web map tiles are 256 px squares. */
export const TILE_SIZE = 256;
/** ADR-008-01: a few hundred metres across on a phone. */
export const MAP_ZOOM = 15;

/** A tile and where its top-left corner sits relative to the photo's point. */
export type MapTile = { url: string; left: number; top: number };

/** FR-008-04: "Google Pixel 11 Pro"; the make is left out when the model starts with it. */
export function cameraLine(make: string, model: string): string {
	if (make === "" || model.toLowerCase().startsWith(make.toLowerCase())) {
		return model;
	}
	return model === "" ? make : `${make} ${model}`;
}

/** FR-008-05: the phone's maps app at a point; Capacitor hands these URLs to the OS (NC-008-01). */
export function mapsUrl(platform: string, latitude: number, longitude: number): string {
	const point = `${latitude},${longitude}`;
	if (platform === "android") {
		return `geo:${point}?q=${point}`;
	}
	if (platform === "ios") {
		return `maps://?ll=${point}&q=${point}`;
	}
	return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${MAP_ZOOM}/${latitude}/${longitude}`;
}

/**
 * ADR-008-01: five columns and three rows of tiles around a point, from a
 * Leaflet-style template (`{s}`, `{z}`, `{x}`, `{y}`), in Web Mercator.
 */
export function mapTiles(layer: string, latitude: number, longitude: number, zoom = MAP_ZOOM): MapTile[] {
	const count = 2 ** zoom;
	const x = ((longitude + 180) / 360) * count;
	const radians = (latitude * Math.PI) / 180;
	const y = ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * count;
	const column = Math.floor(x);
	const row = Math.floor(y);
	const tiles: MapTile[] = [];
	for (let dy = -1; dy <= 1; dy++) {
		for (let dx = -2; dx <= 2; dx++) {
			const tileRow = row + dy;
			if (tileRow < 0 || tileRow >= count) {
				continue;
			}
			const tileColumn = (((column + dx) % count) + count) % count;
			tiles.push({
				url: tileUrl(layer, zoom, tileColumn, tileRow),
				left: (column + dx - x) * TILE_SIZE,
				top: (tileRow - y) * TILE_SIZE,
			});
		}
	}
	return tiles;
}

function tileUrl(layer: string, zoom: number, x: number, y: number): string {
	return layer.trim().replace("{s}", "a").replace("{z}", String(zoom)).replace("{x}", String(x)).replace("{y}", String(y)).replace("{r}", "");
}
