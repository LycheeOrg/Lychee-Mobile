/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import {
	DELETE_CONFIRM_TEXT,
	deleteConfirmTitle,
	deleteFailureMessage,
	downloadProgress,
	downloadSummary,
	SAVE_PERMISSION_DENIED,
	selectionTitle,
} from "@/utils/photoActionMessages";

describe("selection and delete messages (FR-007-01, FR-007-03, UI-007-02)", () => {
	it("counts the selection", () => {
		expect(selectionTitle(0)).toBe("Select photos");
		expect(selectionTitle(3)).toBe("3 selected");
	});

	it("names the count in the confirmation (NFR-007-05)", () => {
		expect(deleteConfirmTitle(1)).toBe("Delete this photo?");
		expect(deleteConfirmTitle(3)).toBe("Delete 3 photos?");
		expect(DELETE_CONFIRM_TEXT).toBe("Photos that are also in other albums are only removed from this album. This can't be undone.");
	});

	it.each([
		["forbidden", "You can't delete some of these photos."],
		["failed", "Couldn't delete the photos."],
		["unreachable", "Couldn't reach the server. Nothing was deleted."],
		["timeout", "The server didn't answer. Some photos may have been deleted."],
		["unauthenticated", "Sign in again to delete photos."],
	] as const)("explains a %s delete", (kind, text) => {
		expect(deleteFailureMessage(kind)).toBe(text);
	});
});

describe("download messages (FR-007-04, UI-007-04, UI-007-05)", () => {
	const run = (overrides: Partial<Parameters<typeof downloadSummary>[0]>) => ({
		status: "done" as const,
		total: 5,
		done: 5,
		saved: 5,
		failed: [] as unknown[],
		stopReason: null,
		...overrides,
	});

	it("shows which photo is saving", () => {
		expect(downloadProgress({ total: 5, done: 1, current: { bytes: 58, total: 100 } })).toEqual({ text: "Saving 2 of 5", fraction: 0.58 });
	});

	it("has no fraction while the size is unknown", () => {
		expect(downloadProgress({ total: 1, done: 0, current: { bytes: 58, total: null } })).toEqual({ text: "Saving 1 of 1", fraction: null });
		expect(downloadProgress({ total: 1, done: 0, current: null })).toEqual({ text: "Saving 1 of 1", fraction: null });
	});

	it("never counts past the total", () => {
		expect(downloadProgress({ total: 2, done: 2, current: null }).text).toBe("Saving 2 of 2");
	});

	it("reports a run that saved everything", () => {
		expect(downloadSummary(run({}))).toBe("Saved 5 photos to your library.");
		expect(downloadSummary(run({ total: 1, saved: 1 }))).toBe("Saved 1 photo to your library.");
	});

	it("reports failures", () => {
		expect(downloadSummary(run({ saved: 4, failed: [{}] }))).toBe("Saved 4 of 5. 1 couldn't be saved.");
		expect(downloadSummary(run({ saved: 3, failed: [{}, {}] }))).toBe("Saved 3 of 5. 2 couldn't be saved.");
	});

	it("explains a stopped run (S-007-12)", () => {
		expect(downloadSummary(run({ status: "stopped", stopReason: "permission_denied", saved: 0, failed: [{}] }))).toBe(SAVE_PERMISSION_DENIED);
		expect(SAVE_PERMISSION_DENIED).toBe("Saving needs permission to add to your photos. Allow it in the app's settings.");
		expect(downloadSummary(run({ status: "stopped", stopReason: "unauthenticated", saved: 0, failed: [{}] }))).toBe(
			"Sign in again to save photos.",
		);
	});
});
