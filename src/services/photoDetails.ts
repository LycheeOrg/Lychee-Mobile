/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

/**
 * DO-008-01: what the info panel shows about a photo, read from Lychee's
 * `preformatted` and `precomputed` data (7.2.0+ shape, FR-008-07). Strings are
 * as the server formatted them; missing values are empty.
 */
export type PhotoDetails = {
	resolution: string;
	filesize: string;
	duration: string;
	fps: string;
	createdAt: string;
	takenAt: string | null;
	takenAtModified: boolean;
	/** Plain text (NFR-008-02). */
	description: string;
	tags: readonly string[];
	license: string;
	hasExif: boolean;
	make: string;
	model: string;
	lens: string;
	aperture: string;
	focal: string;
	shutter: string;
	iso: string;
	hasLocation: boolean;
	/** Decimal degrees for the map; null when the server hides GPS. */
	latitude: number | null;
	longitude: number | null;
	latitudeText: string;
	longitudeText: string;
	altitudeText: string;
	address: string;
};

type Json = Record<string, unknown>;

/** Elements whose text is code, not content. */
const NON_TEXT = "script, style, noscript, template";
/** Elements that end a line of text. */
const BLOCKS = "p, div, li, blockquote, pre, h1, h2, h3, h4, h5, h6, tr";

export function parsePhotoDetails(payload: unknown): PhotoDetails {
	const photo = isObject(payload) ? payload : {};
	const formatted = isObject(photo.preformatted) ? photo.preformatted : {};
	const computed = isObject(photo.precomputed) ? photo.precomputed : {};
	const text = (key: string) => textOf(formatted[key]);
	return {
		resolution: text("resolution"),
		filesize: text("filesize"),
		duration: text("duration"),
		fps: text("fps"),
		createdAt: text("created_at"),
		takenAt: text("taken_at") === "" ? null : text("taken_at"),
		takenAtModified: computed.is_taken_at_modified === true,
		description: htmlToText(text("description")),
		tags: Array.isArray(photo.tags) ? photo.tags.map((tag) => (isObject(tag) ? textOf(tag.name) : "")).filter((name) => name !== "") : [],
		license: text("license"),
		hasExif: computed.has_exif === true,
		make: text("make"),
		model: text("model"),
		lens: text("lens"),
		aperture: text("aperture"),
		focal: text("focal"),
		shutter: text("shutter"),
		iso: text("iso"),
		hasLocation: computed.has_location === true,
		latitude: numberOf(computed.latitude),
		longitude: numberOf(computed.longitude),
		latitudeText: text("latitude"),
		longitudeText: text("longitude"),
		altitudeText: text("altitude"),
		address: text("location"),
	};
}

/**
 * NFR-008-02: the text of server HTML. `DOMParser` documents are inert, so
 * nothing in them runs or loads; code elements are dropped and blocks end lines.
 */
export function htmlToText(html: string): string {
	if (html === "") {
		return "";
	}
	const body = new DOMParser().parseFromString(html, "text/html").body;
	body.querySelectorAll(NON_TEXT).forEach((element) => element.remove());
	body.querySelectorAll("br").forEach((element) => element.replaceWith("\n"));
	body.querySelectorAll(BLOCKS).forEach((element) => element.append("\n"));
	return (body.textContent ?? "")
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line !== "")
		.join("\n");
}

function textOf(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function numberOf(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isObject(value: unknown): value is Json {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
