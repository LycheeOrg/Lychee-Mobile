/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import PhotoSlide from "@/components/PhotoSlide.vue";
import type { PhotoTile } from "@/services/galleryParsers";
import { photoTile } from "@/stores/__helpers__/fakeGallery";

function livePhoto(liveUrl: string | null = "https://photos.example.com/live.mov"): PhotoTile {
	const tile = photoTile("p1");
	return { ...tile, variants: { ...tile.variants, medium: { url: "https://photos.example.com/medium.jpg", width: 800, height: 600 } }, liveUrl };
}

function slide(props: { photo?: PhotoTile; active?: boolean; zoomed?: boolean } = {}) {
	return mount(PhotoSlide, {
		props: { photo: props.photo ?? livePhoto(), active: props.active ?? true, useOriginal: false, zoomed: props.zoomed ?? false },
	});
}

describe("PhotoSlide LIVE button (FR-013-01)", () => {
	it("starts the looping clip on the first tap and shows the still on the second (S-013-01)", async () => {
		const wrapper = slide();
		const button = wrapper.get("button.live-badge");
		expect(button.attributes("aria-pressed")).toBe("false");
		expect(wrapper.find("video.live").exists()).toBe(false);

		await button.trigger("click");

		const video = wrapper.get("video.live");
		expect(video.attributes("src")).toBe("https://photos.example.com/live.mov");
		expect(video.attributes()).toHaveProperty("loop");
		expect(button.attributes("aria-pressed")).toBe("true");

		await button.trigger("click");

		expect(wrapper.find("video.live").exists()).toBe(false);
		expect(button.attributes("aria-pressed")).toBe("false");
	});

	it("keeps the still visible until the clip plays (S-013-07)", async () => {
		const wrapper = slide();
		const button = wrapper.get("button.live-badge");

		await button.trigger("click");
		expect(wrapper.get("video.live").classes()).not.toContain("shown");

		await wrapper.get("video.live").trigger("playing");
		expect(wrapper.get("video.live").classes()).toContain("shown");

		await button.trigger("click");
		await button.trigger("click");
		expect(wrapper.get("video.live").classes()).not.toContain("shown");
	});

	it("keeps Swiper from treating the tap as a swipe, tap or double tap", () => {
		expect(slide().get("button.live-badge").classes()).toContain("swiper-no-swiping");
	});

	it("no longer plays on press and hold", async () => {
		const wrapper = slide();

		await wrapper.get(".swiper-zoom-container").trigger("pointerdown");
		await new Promise((resolve) => setTimeout(resolve, 350));
		await nextTick();

		expect(wrapper.find("video.live").exists()).toBe(false);
	});

	it("goes back to the still when the slide stops being active (S-013-02)", async () => {
		const wrapper = slide();
		await wrapper.get("button.live-badge").trigger("click");

		await wrapper.setProps({ active: false });

		expect(wrapper.find("video.live").exists()).toBe(false);
		expect(wrapper.get("button.live-badge").attributes("aria-pressed")).toBe("false");
	});

	it("goes back to the still when the photo is zoomed, and is disabled while zoomed (S-013-03)", async () => {
		const wrapper = slide();
		await wrapper.get("button.live-badge").trigger("click");

		await wrapper.setProps({ zoomed: true });

		expect(wrapper.find("video.live").exists()).toBe(false);
		const button = wrapper.get("button.live-badge");
		expect(button.attributes()).toHaveProperty("disabled");
		await button.trigger("click");
		expect(wrapper.find("video.live").exists()).toBe(false);
	});

	it("goes back to the still when the clip fails (S-013-04)", async () => {
		const wrapper = slide();
		await wrapper.get("button.live-badge").trigger("click");

		await wrapper.get("video.live").trigger("error");

		expect(wrapper.find("video.live").exists()).toBe(false);
		expect(wrapper.get("button.live-badge").attributes("aria-pressed")).toBe("false");
	});

	it("has no button for a photo without a clip", () => {
		expect(
			slide({ photo: livePhoto(null) })
				.find(".live-badge")
				.exists(),
		).toBe(false);
	});
});
