/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { mount } from "@vue/test-utils";
import { nextTick, reactive } from "vue";
import UploadRing from "@/components/UploadRing.vue";
import type { EntryState, QueueEntry } from "@/stores/uploadQueue";
import { uploadSheet } from "@/stores/uploadSheet";

const entry = (id: number, state: EntryState, sent = 0): QueueEntry => ({
	id,
	file: { path: `p${id}`, name: `f${id}`, mimeType: "image/jpeg", size: 100, modifiedAt: null },
	albumId: null,
	state,
	sent,
	result: null,
});

function ring(state: { entries: QueueEntry[]; runIds: number[] }) {
	return mount(UploadRing, { props: { queue: state }, global: { stubs: { IonIcon: true, IonButton: { template: "<button><slot /></button>" } } } });
}

beforeEach(() => {
	vi.useFakeTimers();
	uploadSheet.open = false;
});

afterEach(() => {
	vi.useRealTimers();
});

describe("UploadRing (FR-012-01)", () => {
	it("is hidden with nothing to show", () => {
		expect(ring({ entries: [], runIds: [] }).find("button").exists()).toBe(false);
	});

	it("shows the progress circle while uploading and opens the sheet on tap (S-012-01)", async () => {
		const wrapper = ring({ entries: [entry(1, "uploading", 50)], runIds: [1] });

		expect(wrapper.get('[aria-label="Uploads"]').find("circle.progress").attributes("stroke-dashoffset")).toBeDefined();
		await wrapper.get("button").trigger("click");

		expect(uploadSheet.open).toBe(true);
	});

	it("shows a check for 3 s when the run ends without failures", async () => {
		const state = reactive({ entries: [entry(1, "uploading", 50)], runIds: [1] });
		const wrapper = ring(state);

		state.entries[0].state = "done";
		await nextTick();
		expect(wrapper.find(".done").exists()).toBe(true);

		vi.advanceTimersByTime(3000);
		await nextTick();
		expect(wrapper.find("button").exists()).toBe(false);
	});

	it("shows a warning while failed files remain (S-012-05)", () => {
		expect(
			ring({ entries: [entry(1, "failed")], runIds: [1] })
				.find(".failed")
				.exists(),
		).toBe(true);
	});
});
