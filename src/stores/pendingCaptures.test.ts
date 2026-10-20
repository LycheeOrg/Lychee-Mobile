/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { reactive } from "vue";
import { createPendingCaptures, type PendingCapture, type PendingCapturesDeps } from "@/stores/pendingCaptures";
import type { PickedFile } from "@/services/picker";
import type { EntryState, QueueEntry } from "@/stores/uploadQueue";

const A = "https://a.example.com";
const B = "https://b.example.com";

const photo = (name: string): PickedFile => ({ path: `file:///files/captures/${name}`, name, mimeType: "image/jpeg", size: 100, modifiedAt: 1 });
const pending = (name: string, server = A, albumId: string | null = "a1"): PendingCapture => ({ file: photo(name), albumId, server });

function setup(stored: PendingCapture[] = [], server: string | null = A) {
	const entries = reactive([] as QueueEntry[]);
	let nextId = 1;
	const queue = {
		state: { entries },
		add: vi.fn((files: PickedFile[], albumId: string | null) => {
			for (const file of files) {
				entries.push({ id: nextId++, file, albumId, state: "waiting", sent: 0, result: null });
			}
		}),
		retry: vi.fn(),
		remove: vi.fn(),
	};
	let saved = [...stored];
	const deps = {
		load: vi.fn(async () => saved),
		save: vi.fn(async (list: PendingCapture[]) => {
			saved = list;
		}),
		release: vi.fn(async (_item: PendingCapture) => undefined),
		queue,
		server: () => server,
	} satisfies PendingCapturesDeps;
	const entry = (name: string, state: EntryState, id = nextId++): QueueEntry => ({
		id,
		file: photo(name),
		albumId: "a1",
		state,
		sent: 0,
		result: null,
	});
	return { store: createPendingCaptures(deps), deps, queue, entries, entry, saved: () => saved };
}

describe("pending captures (FR-011-04, Q-011-04)", () => {
	it("records a taken photo and keeps it across launches", async () => {
		const { store, saved } = setup();

		await store.record(pending("IMG_1.jpg"));

		expect(saved()).toEqual([pending("IMG_1.jpg")]);
		expect(await setup(saved()).store.list()).toEqual([pending("IMG_1.jpg")]);
	});

	it.each<EntryState>(["done", "skipped"])("deletes the copy once Lychee accepted it (%s, S-011-09)", async (state) => {
		const { store, deps, entry, saved } = setup([pending("IMG_1.jpg")]);

		await store.settled(entry("IMG_1.jpg", state));

		expect(deps.release).toHaveBeenCalledWith(pending("IMG_1.jpg"));
		expect(saved()).toEqual([]);
	});

	it("keeps the copy when the upload failed (S-011-10)", async () => {
		const { store, deps, entry, saved } = setup([pending("IMG_1.jpg")]);

		await store.settled(entry("IMG_1.jpg", "failed"));

		expect(deps.release).not.toHaveBeenCalled();
		expect(saved()).toHaveLength(1);
	});

	it("ignores files that aren't taken photos", async () => {
		const { store, deps, entry } = setup([pending("IMG_1.jpg")]);

		await store.settled(entry("other.jpg", "done"));

		expect(deps.release).not.toHaveBeenCalled();
	});

	it("queues pending photos of the current server after launch (S-011-11)", async () => {
		const { store, queue } = setup([pending("IMG_1.jpg"), pending("IMG_2.jpg", B), pending("IMG_3.jpg", A, null)]);

		await store.resume();

		expect(queue.add.mock.calls).toEqual([
			[[photo("IMG_1.jpg")], "a1"],
			[[photo("IMG_3.jpg")], null],
		]);
	});

	it("retries a failed row instead of adding it twice, and leaves running ones alone", async () => {
		const { store, queue, entries, entry } = setup([pending("IMG_1.jpg"), pending("IMG_2.jpg"), pending("IMG_3.jpg")]);
		entries.push(entry("IMG_1.jpg", "failed", 41), entry("IMG_2.jpg", "uploading", 42), entry("IMG_3.jpg", "waiting", 43));

		await store.resume();

		expect(queue.retry).toHaveBeenCalledWith(41);
		expect(queue.retry).toHaveBeenCalledTimes(1);
		expect(queue.add).not.toHaveBeenCalled();
	});

	it("does nothing without a server", async () => {
		const { store, queue } = setup([pending("IMG_1.jpg")], null);

		await store.resume();

		expect(queue.add).not.toHaveBeenCalled();
	});

	it("discards a stuck photo: file, entry and queue row (FR-011-06, S-011-12)", async () => {
		const { store, deps, queue, entries, entry, saved } = setup([pending("IMG_1.jpg")]);
		entries.push(entry("IMG_1.jpg", "failed", 7));

		await store.discard("file:///files/captures/IMG_1.jpg");

		expect(deps.release).toHaveBeenCalledWith(pending("IMG_1.jpg"));
		expect(queue.remove).toHaveBeenCalledWith(7);
		expect(saved()).toEqual([]);
	});

	it("knows which paths are taken photos", async () => {
		const { store } = setup([pending("IMG_1.jpg")]);
		await store.list();

		expect(store.isPending("file:///files/captures/IMG_1.jpg")).toBe(true);
		expect(store.isPending("file:///other.jpg")).toBe(false);
	});

	it("knows each pending file's cleanup; older entries are taken photos (FR-012-04)", async () => {
		const picked: PendingCapture = { ...pending("PXL_1.jpg"), cleanup: "grant" };
		const { store } = setup([pending("IMG_1.jpg"), picked]);
		await store.list();

		expect(store.cleanupOf("file:///files/captures/IMG_1.jpg")).toBe("capture");
		expect(store.cleanupOf("file:///files/captures/PXL_1.jpg")).toBe("grant");
		expect(store.cleanupOf("file:///other.jpg")).toBeNull();
	});
});
