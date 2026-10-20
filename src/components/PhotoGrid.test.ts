/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import PhotoGrid from "@/components/PhotoGrid.vue";
import { photoTile } from "@/stores/__helpers__/fakeGallery";

const photos = [photoTile("p1"), photoTile("p2")];

function grid(props: { selecting?: boolean; selected?: string[]; selectable?: boolean } = {}) {
	return mount(PhotoGrid, {
		props: { photos, selecting: false, selected: [], selectable: true, ...props },
		global: { stubs: { ThumbImage: true, IonIcon: true } },
	});
}

const tile = (wrapper: ReturnType<typeof grid>, id: string) => wrapper.get(`[data-photo-id="${id}"]`);

/** test-utils can't set `clientX` on jsdom's events, so pointer events are dispatched directly. */
function pointer(wrapper: ReturnType<typeof grid>, id: string, type: string, x = 5, y = 5): Promise<void> {
	tile(wrapper, id).element.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
	return nextTick();
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("PhotoGrid selection (FR-007-01)", () => {
	it("opens the viewer on a tap outside selection mode (FR-004-01)", async () => {
		const wrapper = grid();

		await pointer(wrapper, "p2", "pointerdown", 5, 5);
		await pointer(wrapper, "p2", "pointerup");
		await tile(wrapper, "p2").trigger("click");

		expect(wrapper.emitted("open")).toEqual([[1]]);
		expect(wrapper.emitted("hold")).toBeUndefined();
	});

	it("selects a photo held for 500 ms, without opening it (S-007-01)", async () => {
		const wrapper = grid();

		await pointer(wrapper, "p1", "pointerdown", 5, 5);
		vi.advanceTimersByTime(499);
		expect(wrapper.emitted("hold")).toBeUndefined();
		vi.advanceTimersByTime(1);
		await pointer(wrapper, "p1", "pointerup");
		await tile(wrapper, "p1").trigger("click");

		expect(wrapper.emitted("hold")).toEqual([["p1"]]);
		expect(wrapper.emitted("open")).toBeUndefined();
		expect(wrapper.emitted("toggle")).toBeUndefined();
	});

	it("doesn't hold when the finger moves, as when scrolling", async () => {
		const wrapper = grid();

		await pointer(wrapper, "p1", "pointerdown", 5, 5);
		await pointer(wrapper, "p1", "pointermove", 5, 40);
		vi.advanceTimersByTime(600);

		expect(wrapper.emitted("hold")).toBeUndefined();
	});

	it("doesn't hold where selection isn't offered (S-007-03)", async () => {
		const wrapper = grid({ selectable: false });

		await pointer(wrapper, "p1", "pointerdown", 5, 5);
		vi.advanceTimersByTime(600);

		expect(wrapper.emitted("hold")).toBeUndefined();
	});

	it("toggles instead of opening in selection mode (S-007-02)", async () => {
		const wrapper = grid({ selecting: true });

		await tile(wrapper, "p2").trigger("click");

		expect(wrapper.emitted("toggle")).toEqual([["p2"]]);
		expect(wrapper.emitted("open")).toBeUndefined();
	});

	it("marks selected photos", () => {
		const wrapper = grid({ selecting: true, selected: ["p1"] });

		expect(tile(wrapper, "p1").classes()).toContain("selected");
		expect(tile(wrapper, "p1").attributes("aria-pressed")).toBe("true");
		expect(tile(wrapper, "p2").attributes("aria-pressed")).toBe("false");
		expect(tile(wrapper, "p1").find(".check").exists()).toBe(true);
		expect(tile(wrapper, "p2").find(".check").exists()).toBe(false);
	});

	it("has no pressed state outside selection mode", () => {
		expect(tile(grid(), "p1").attributes("aria-pressed")).toBeUndefined();
	});
});
