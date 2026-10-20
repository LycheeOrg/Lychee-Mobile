/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { ringState } from "@/utils/uploadRing";
import type { EntryState, QueueEntry } from "@/stores/uploadQueue";

const entry = (id: number, state: EntryState, size: number, sent = 0): QueueEntry => ({
	id,
	file: { path: `p${id}`, name: `f${id}`, mimeType: "image/jpeg", size, modifiedAt: null },
	albumId: null,
	state,
	sent,
	result: null,
});

describe("ringState (FR-012-01)", () => {
	it("is hidden with nothing queued", () => {
		expect(ringState({ entries: [], runIds: [] })).toEqual({ kind: "hidden" });
	});

	it("shows the run's progress by bytes (S-012-01)", () => {
		const entries = [entry(1, "done", 100), entry(2, "uploading", 200, 50), entry(3, "waiting", 100), entry(9, "done", 1000)];

		expect(ringState({ entries, runIds: [1, 2, 3] })).toEqual({ kind: "progress", fraction: 0.375 });
	});

	it("counts failed and skipped files of the run as finished", () => {
		const entries = [entry(1, "failed", 100), entry(2, "skipped", 100), entry(3, "uploading", 200, 100)];

		expect(ringState({ entries, runIds: [1, 2, 3] })).toEqual({ kind: "progress", fraction: 0.75 });
	});

	it("shows a warning while failed files remain after the run (S-012-05)", () => {
		expect(ringState({ entries: [entry(1, "done", 100), entry(2, "failed", 100)], runIds: [1, 2] })).toEqual({ kind: "failed" });
	});

	it("is hidden once everything finished", () => {
		expect(ringState({ entries: [entry(1, "done", 100), entry(2, "skipped", 100)], runIds: [1, 2] })).toEqual({ kind: "hidden" });
	});

	it("has no fraction problem with empty files", () => {
		expect(ringState({ entries: [entry(1, "uploading", 0)], runIds: [1] })).toEqual({ kind: "progress", fraction: 0 });
	});
});
