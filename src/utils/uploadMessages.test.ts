/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import {
	captureFailureMessage,
	DISCARD_PHOTO,
	entryStatus,
	PERMISSION_DENIED,
	pickFailureMessage,
	uploadResultMessage,
} from "@/utils/uploadMessages";
import type { QueueEntry } from "@/stores/uploadQueue";

const entry = (overrides: Partial<QueueEntry>): QueueEntry => ({
	id: 1,
	file: { path: "p", name: "IMG.HEIC", mimeType: "image/heic", size: 200, modifiedAt: null },
	albumId: "a1",
	state: "waiting",
	sent: 0,
	result: null,
	...overrides,
});

describe("uploadResultMessage (FR-005-03)", () => {
	it.each([
		[{ kind: "done" }, "Uploaded"],
		[{ kind: "skipped" }, "Already in the gallery"],
		[{ kind: "empty" }, "Empty file"],
		[{ kind: "quota" }, "Your storage quota is full"],
		[{ kind: "too_large" }, "Too large for this server"],
		[{ kind: "rejected", message: "The photo has been rejected" }, "The photo has been rejected"],
		[{ kind: "interrupted" }, "Upload interrupted"],
		[{ kind: "unreadable" }, "Couldn't read this file"],
		[{ kind: "unauthenticated" }, "Sign in again to upload"],
		[{ kind: "failed" }, "Upload failed"],
	] as const)("%o", (result, message) => {
		expect(uploadResultMessage(result)).toBe(message);
	});
});

describe("entryStatus (FR-005-04)", () => {
	it("shows waiting and progress", () => {
		expect(entryStatus(entry({}))).toBe("Waiting");
		expect(entryStatus(entry({ state: "uploading", sent: 50 }))).toBe("25%");
	});

	it("notes an upload without GPS data (NFR-005-04)", () => {
		expect(entryStatus(entry({ state: "done", result: { kind: "done", withoutLocation: true } }))).toBe("Uploaded without GPS data");
	});

	it("shows the result once finished", () => {
		expect(entryStatus(entry({ state: "skipped", result: { kind: "skipped" } }))).toBe("Already in the gallery");
		expect(entryStatus(entry({ state: "failed", result: { kind: "interrupted" } }))).toBe("Upload interrupted");
	});
});

describe("pickFailureMessage (FR-005-01)", () => {
	it("explains the Android permission", () => {
		expect(pickFailureMessage("permission_denied")).toBe(PERMISSION_DENIED);
		expect(PERMISSION_DENIED).toBe(
			"Uploading needs access to photo locations, so your photos keep their GPS data. Allow it in the app's settings.",
		);
	});

	it("reports a picker failure", () => {
		expect(pickFailureMessage("failed")).toBe("Couldn't open your photos.");
	});
});

describe("camera messages (FR-011-02, FR-011-06)", () => {
	it.each([
		["no_camera", "No camera app found."],
		["permission_denied", "Taking photos needs camera access. Allow it in the app's settings."],
		["failed", "Couldn't take the photo."],
	] as const)("explains %s", (kind, text) => {
		expect(captureFailureMessage(kind)).toBe(text);
	});

	it("warns before deleting a photo that isn't in Lychee yet", () => {
		expect(DISCARD_PHOTO).toBe("Delete this photo from the phone? It isn't in Lychee yet.");
	});
});
