/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import type { GalleryContext } from "@/stores/galleryContext";
import { context, fakeGallery, photoTile } from "@/stores/__helpers__/fakeGallery";

const swiper = vi.hoisted(() => ({ handlers: {} as Record<string, (...args: unknown[]) => void> }));

// Swiper needs layout jsdom lacks; the viewer only needs its events here.
vi.mock("swiper", () => ({
	default: vi.fn(function Swiper(this: Record<string, unknown>, _el: unknown, options: { on: Record<string, (...args: unknown[]) => void> }) {
		swiper.handlers = options.on;
		Object.assign(this, { destroyed: false, destroy: vi.fn(), virtual: { slides: [], update: vi.fn() } });
	}),
}));
vi.mock("swiper/modules", () => ({ Virtual: {}, Zoom: {} }));

const { default: PhotoViewer } = await import("@/components/PhotoViewer.vue");

const ModalStub = defineComponent({
	props: { isOpen: Boolean },
	setup(props, { slots }) {
		return () => (props.isOpen ? h("div", { class: "sheet" }, slots.default?.()) : null);
	},
});

const photos = [photoTile("p1"), photoTile("p2")];

function viewer(props: { infoAllowed?: boolean; ctx?: GalleryContext | null } = {}) {
	const ctx = props.ctx === undefined ? context(fakeGallery({})) : props.ctx;
	return mount(PhotoViewer, {
		props: {
			photos,
			startIndex: 0,
			total: 2,
			hasMore: false,
			loadMore: async () => undefined,
			infoAllowed: props.infoAllowed ?? true,
			mapAllowed: true,
			galleryContext: () => ctx,
		},
		global: { stubs: { PhotoSlide: true, IonModal: ModalStub, IonContent: { template: "<div><slot /></div>" }, PhotoInfoPanel: true } },
	});
}

describe("PhotoViewer info button (FR-008-01)", () => {
	it("shows the button and opens the panel for the photo on screen", async () => {
		const wrapper = viewer();

		await wrapper.get('[aria-label="Info"]').trigger("click");

		expect(wrapper.findComponent({ name: "PhotoInfoPanel" }).props("photo")).toEqual(photos[0]);
	});

	it("has no button when EXIF is disabled on the server (S-008-04)", () => {
		expect(viewer({ infoAllowed: false }).find('[aria-label="Info"]').exists()).toBe(false);
	});

	it("follows the photo on screen while open, loading each one's albums (S-008-02)", async () => {
		const gallery = fakeGallery({});
		const wrapper = viewer({ ctx: context(gallery) });
		await wrapper.get('[aria-label="Info"]').trigger("click");

		swiper.handlers.slideChange?.({ activeIndex: 1 });
		await flushPromises();

		expect(wrapper.findComponent({ name: "PhotoInfoPanel" }).props("photo")).toEqual(photos[1]);
		expect(gallery.photoAlbums.mock.calls.map((call) => call[0])).toEqual(["p1", "p2"]);
	});

	it("loads the map provider when the panel opens", async () => {
		const gallery = fakeGallery({});
		const wrapper = viewer({ ctx: context(gallery) });

		await wrapper.get('[aria-label="Info"]').trigger("click");
		await flushPromises();

		expect(gallery.mapProvider).toHaveBeenCalledTimes(1);
	});

	it("loads nothing before the panel is opened", async () => {
		const gallery = fakeGallery({});
		viewer({ ctx: context(gallery) });
		await flushPromises();

		expect(gallery.photoAlbums).not.toHaveBeenCalled();
		expect(gallery.mapProvider).not.toHaveBeenCalled();
	});
});

describe("PhotoViewer overlay buttons (FR-009-02)", () => {
	it("draws Close and Info as white icons, not Ionic's light colour (dark grey in dark mode)", () => {
		const wrapper = viewer();

		for (const label of ["Close", "Info"]) {
			const button = wrapper.get(`[aria-label="${label}"]`);
			expect(button.attributes("color")).toBeUndefined();
			expect(button.classes()).toContain("overlay-button");
		}
	});
});
