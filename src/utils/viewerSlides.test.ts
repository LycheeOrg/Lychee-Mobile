/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { counterText, shouldLoadMore } from "@/utils/viewerSlides";

describe("counterText (FR-004-07)", () => {
	it("counts from one", () => {
		expect(counterText(11, 104)).toBe("12 of 104");
	});

	it("never shows a total below what is loaded", () => {
		expect(counterText(4, 0, 5)).toBe("5 of 5");
	});
});

describe("shouldLoadMore (FR-004-02, S-004-02, S-004-03)", () => {
	it("loads when within three of the last loaded photo", () => {
		expect(shouldLoadMore(96, 100, true)).toBe(true);
		expect(shouldLoadMore(99, 100, true)).toBe(true);
	});

	it("waits further from the end", () => {
		expect(shouldLoadMore(95, 100, true)).toBe(false);
	});

	it("never loads when the album has no more", () => {
		expect(shouldLoadMore(99, 100, false)).toBe(false);
	});
});
