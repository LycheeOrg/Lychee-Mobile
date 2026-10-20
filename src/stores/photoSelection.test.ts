/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { createPhotoSelection } from "@/stores/photoSelection";

describe("photo selection (FR-007-01, DO-007-01)", () => {
	it("starts outside selection mode", () => {
		const selection = createPhotoSelection();

		expect(selection.state.active).toBe(false);
		expect(selection.count()).toBe(0);
	});

	it("enters the mode empty from the Select button", () => {
		const selection = createPhotoSelection();

		selection.start();

		expect(selection.state.active).toBe(true);
		expect(selection.count()).toBe(0);
	});

	it("enters the mode with the long-pressed photo (S-007-01)", () => {
		const selection = createPhotoSelection();

		selection.start("p1");

		expect(selection.state.active).toBe(true);
		expect(selection.isSelected("p1")).toBe(true);
	});

	it("toggles photos and counts them (S-007-02)", () => {
		const selection = createPhotoSelection();
		selection.start("p1");

		selection.toggle("p2");
		selection.toggle("p3");
		selection.toggle("p1");

		expect(selection.ids()).toEqual(["p2", "p3"]);
		expect(selection.count()).toBe(2);
	});

	it("ignores toggles outside the mode", () => {
		const selection = createPhotoSelection();

		selection.toggle("p1");

		expect(selection.count()).toBe(0);
	});

	it("leaves the mode and forgets the photos on clear", () => {
		const selection = createPhotoSelection();
		selection.start("p1");

		selection.clear();

		expect(selection.state.active).toBe(false);
		expect(selection.count()).toBe(0);
	});
});
