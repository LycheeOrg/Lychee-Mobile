/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { displayVariant, videoPoster, videoSource, zoomVariant } from "@/utils/photoVariant";
import type { Variant, Variants } from "@/services/galleryParsers";

const v = (name: string): Variant => ({ url: `https://photos.example.com/${name}.jpeg`, width: 100, height: 100 });
const ALL: Variants = {
	medium2x: v("medium2x"),
	medium: v("medium"),
	original: v("original"),
	small2x: v("small2x"),
	small: v("small"),
	thumb2x: v("thumb2x"),
	thumb: v("thumb"),
};
const NONE: Variants = { medium2x: null, medium: null, original: null, small2x: null, small: null, thumb2x: null, thumb: null };

describe("displayVariant (FR-004-03)", () => {
	it("prefers medium2x on high-density screens", () => {
		expect(displayVariant(ALL, 3)?.url).toContain("medium2x");
	});

	it("uses medium on a 1x screen", () => {
		expect(displayVariant(ALL, 1)?.url).toContain("/medium.jpeg");
	});

	it("falls back to medium when there is no medium2x", () => {
		expect(displayVariant({ ...ALL, medium2x: null }, 2)?.url).toContain("/medium.jpeg");
	});

	it.each([
		[{ ...NONE, original: v("original"), small: v("small") }, "original"],
		[{ ...NONE, small2x: v("small2x"), small: v("small") }, "small2x"],
		[{ ...NONE, small: v("small"), thumb: v("thumb") }, "small"],
		[{ ...NONE, thumb2x: v("thumb2x") }, "thumb2x"],
		[{ ...NONE, thumb: v("thumb") }, "thumb"],
	])("falls back in order (%#)", (variants, expected) => {
		expect(displayVariant(variants, 2)?.url).toContain(`/${expected}.jpeg`);
	});

	it("has nothing to show without variants (S-004-07)", () => {
		expect(displayVariant(NONE, 2)).toBeNull();
	});
});

describe("zoomVariant (FR-004-03, S-004-08)", () => {
	it("is the original", () => {
		expect(zoomVariant(ALL)?.url).toContain("original");
	});

	it("is nothing without original access", () => {
		expect(zoomVariant({ ...ALL, original: null })).toBeNull();
	});
});

describe("video sources (FR-004-05)", () => {
	it("plays the original with the small image as poster", () => {
		expect(videoSource(ALL)).toContain("original");
		expect(videoPoster(ALL)).toContain("/small.jpeg");
	});

	it("falls back to the thumb as poster, or none", () => {
		expect(videoPoster({ ...NONE, thumb: v("thumb") })).toContain("thumb");
		expect(videoPoster(NONE)).toBeUndefined();
	});

	it("has no source without the original", () => {
		expect(videoSource(NONE)).toBeNull();
	});
});
