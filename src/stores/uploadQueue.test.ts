/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { createUploadQueue, uploadTargetFor } from "@/stores/uploadQueue";
import type { PickedFile } from "@/services/picker";
import type { UploadResult } from "@/services/upload";

const file = (name: string, size = 100): PickedFile => ({ path: `file:///${name}`, name, mimeType: "image/jpeg", size, modifiedAt: null });

/** An uploader answering from `results` in order, reporting full progress. */
function uploader(results: UploadResult[]) {
	return vi.fn(async (picked: PickedFile, _albumId: string | null, onProgress: (sent: number) => void): Promise<UploadResult> => {
		onProgress(picked.size);
		return results.shift() ?? { kind: "done" };
	});
}

async function settle(queue: ReturnType<typeof createUploadQueue>): Promise<void> {
	await queue.whenIdle();
}

describe("uploadTargetFor (FR-005-02, S-005-07, S-005-08)", () => {
	it("uploads into an album the user may upload to", () => {
		expect(uploadTargetFor({ id: "a1", kind: "album", canUpload: true })).toEqual({ albumId: "a1" });
	});

	it("offers no upload without the right", () => {
		expect(uploadTargetFor({ id: "a1", kind: "album", canUpload: false })).toBeNull();
	});

	it("uploads Unsorted with an empty album id", () => {
		expect(uploadTargetFor({ id: "unsorted", kind: "smart", canUpload: true })).toEqual({ albumId: null });
	});

	it("offers no upload into other smart albums", () => {
		expect(uploadTargetFor({ id: "recent", kind: "smart", canUpload: true })).toBeNull();
	});
});

describe("upload queue (FR-005-04, FR-005-05)", () => {
	it("uploads files one at a time, in order", async () => {
		const upload = uploader([]);
		const queue = createUploadQueue({ upload, onUnauthenticated: vi.fn() });

		queue.add([file("a"), file("b")], "a1");
		await settle(queue);

		expect(upload.mock.calls.map((call) => [call[0].name, call[1]])).toEqual([
			["a", "a1"],
			["b", "a1"],
		]);
		expect(queue.state.entries.map((entry) => [entry.file.name, entry.state, entry.sent])).toEqual([
			["a", "done", 100],
			["b", "done", 100],
		]);
	});

	it("never runs two uploads at once", async () => {
		let running = 0;
		let most = 0;
		const upload = vi.fn(async (): Promise<UploadResult> => {
			running += 1;
			most = Math.max(most, running);
			await Promise.resolve();
			running -= 1;
			return { kind: "done" };
		});
		const queue = createUploadQueue({ upload, onUnauthenticated: vi.fn() });

		queue.add([file("a"), file("b")], "a1");
		queue.add([file("c")], "a1");
		await settle(queue);

		expect(most).toBe(1);
		expect(upload).toHaveBeenCalledTimes(3);
	});

	it("records skipped and failed files and keeps going (S-005-03, S-005-04)", async () => {
		const queue = createUploadQueue({
			upload: uploader([{ kind: "skipped" }, { kind: "rejected", message: "nope" }, { kind: "done" }]),
			onUnauthenticated: vi.fn(),
		});

		queue.add([file("a"), file("b"), file("c")], "a1");
		await settle(queue);

		expect(queue.state.entries.map((entry) => entry.state)).toEqual(["skipped", "failed", "done"]);
		expect(queue.state.entries[1].result).toEqual({ kind: "rejected", message: "nope" });
	});

	it("counts the files left", async () => {
		const queue = createUploadQueue({ upload: uploader([]), onUnauthenticated: vi.fn() });

		queue.add([file("a"), file("b")], "a1");
		expect(queue.remaining()).toBe(2);
		await settle(queue);
		expect(queue.remaining()).toBe(0);
	});

	it("retries a failed file from the start (S-005-05)", async () => {
		const upload = uploader([{ kind: "interrupted" }, { kind: "done" }]);
		const queue = createUploadQueue({ upload, onUnauthenticated: vi.fn() });
		queue.add([file("a")], "a1");
		await settle(queue);
		const id = queue.state.entries[0].id;

		queue.retry(id);
		expect(queue.state.entries[0].result).toBeNull();
		await settle(queue);

		expect(queue.state.entries[0].state).toBe("done");
		expect(upload).toHaveBeenCalledTimes(2);
		expect(upload.mock.calls[1][0]).toBe(upload.mock.calls[0][0]);
	});

	it("stops on an ended session and hands over to sign-in (S-005-06)", async () => {
		const onUnauthenticated = vi.fn();
		const upload = uploader([{ kind: "unauthenticated" }]);
		const queue = createUploadQueue({ upload, onUnauthenticated });

		queue.add([file("a"), file("b")], "a1");
		await settle(queue);

		expect(onUnauthenticated).toHaveBeenCalledTimes(1);
		expect(queue.state.entries.map((entry) => entry.state)).toEqual(["failed", "waiting"]);
		expect(upload).toHaveBeenCalledTimes(1);
	});

	it("ignores Retry on a file that didn't fail", async () => {
		const upload = uploader([]);
		const queue = createUploadQueue({ upload, onUnauthenticated: vi.fn() });
		queue.add([file("a")], "a1");
		await settle(queue);

		queue.retry(queue.state.entries[0].id);
		await settle(queue);

		expect(upload).toHaveBeenCalledTimes(1);
	});

	it("clears finished files", async () => {
		const queue = createUploadQueue({
			upload: uploader([{ kind: "done" }, { kind: "skipped" }, { kind: "failed" }]),
			onUnauthenticated: vi.fn(),
		});
		queue.add([file("a"), file("b"), file("c")], "a1");
		await settle(queue);

		queue.clearFinished();

		expect(queue.state.entries.map((entry) => entry.file.name)).toEqual(["c"]);
	});

	it("reports the albums that received uploads when it goes idle", async () => {
		const queue = createUploadQueue({ upload: uploader([{ kind: "done" }, { kind: "failed" }, { kind: "done" }]), onUnauthenticated: vi.fn() });

		queue.add([file("a")], "a1");
		queue.add([file("b")], "a2");
		queue.add([file("c")], null);
		await settle(queue);

		expect(queue.state.finishedRuns).toBe(1);
		expect([...queue.state.lastDoneAlbums]).toEqual(["a1", null]);
	});

	it("doesn't report a run without any done file", async () => {
		const queue = createUploadQueue({ upload: uploader([{ kind: "failed" }]), onUnauthenticated: vi.fn() });

		queue.add([file("a")], "a1");
		await settle(queue);

		expect(queue.state.finishedRuns).toBe(0);
	});
});

describe("silent login during uploads (FR-006-02, S-006-09)", () => {
	it("uploads the file again once after a successful silent login", async () => {
		const upload = uploader([{ kind: "unauthenticated" }, { kind: "done" }]);
		const onUnauthenticated = vi.fn(async () => true);
		const queue = createUploadQueue({ upload, onUnauthenticated });

		queue.add([file("a"), file("b")], "a1");
		await settle(queue);

		expect(onUnauthenticated).toHaveBeenCalledTimes(1);
		expect(upload.mock.calls.map((call) => call[0].name)).toEqual(["a", "a", "b"]);
		expect(queue.state.entries.map((entry) => entry.state)).toEqual(["done", "done"]);
	});

	it("stops when the same file is refused again after the silent login", async () => {
		const upload = uploader([{ kind: "unauthenticated" }, { kind: "unauthenticated" }]);
		const queue = createUploadQueue({ upload, onUnauthenticated: vi.fn(async () => true) });

		queue.add([file("a"), file("b")], "a1");
		await settle(queue);

		expect(queue.state.entries.map((entry) => entry.state)).toEqual(["failed", "waiting"]);
	});
});

describe("settled files and removal (FR-011-04, FR-011-06)", () => {
	it("tells listeners about each file once it has a result", async () => {
		const queue = createUploadQueue({
			upload: uploader([{ kind: "done" }, { kind: "failed" }, { kind: "skipped" }]),
			onUnauthenticated: vi.fn(),
		});
		const settled: string[] = [];
		queue.onSettled((entry) => settled.push(`${entry.file.name}:${entry.state}`));

		queue.add([file("a"), file("b"), file("c")], "a1");
		await settle(queue);

		expect(settled).toEqual(["a:done", "b:failed", "c:skipped"]);
	});

	it("doesn't report a file that is sent again after a silent login", async () => {
		const queue = createUploadQueue({
			upload: uploader([{ kind: "unauthenticated" }, { kind: "done" }]),
			onUnauthenticated: vi.fn(async () => true),
		});
		const settled: string[] = [];
		queue.onSettled((entry) => settled.push(entry.state));

		queue.add([file("a")], "a1");
		await settle(queue);

		expect(settled).toEqual(["done"]);
	});

	it("removes a failed file, and nothing else", async () => {
		const queue = createUploadQueue({ upload: uploader([{ kind: "failed" }, { kind: "done" }]), onUnauthenticated: vi.fn() });
		queue.add([file("a"), file("b")], "a1");
		await settle(queue);
		const [failed, done] = queue.state.entries;

		queue.remove(done.id);
		queue.remove(failed.id);

		expect(queue.state.entries.map((entry) => entry.file.name)).toEqual(["b"]);
	});
});

describe("current run (FR-012-01)", () => {
	it("starts a new run when files are added to an idle queue", async () => {
		const queue = createUploadQueue({ upload: uploader([]), onUnauthenticated: vi.fn() });
		queue.add([file("a"), file("b")], "a1");
		await settle(queue);

		queue.add([file("c")], "a1");

		expect(queue.state.runIds).toEqual([queue.state.entries[2].id]);
	});

	it("adds files to the running run, and retried files too", async () => {
		const queue = createUploadQueue({ upload: uploader([{ kind: "failed" }]), onUnauthenticated: vi.fn() });
		queue.add([file("a")], "a1");
		await settle(queue);
		const failed = queue.state.entries[0];

		queue.retry(failed.id);
		queue.add([file("b")], "a1");

		expect(queue.state.runIds).toEqual([failed.id, queue.state.entries[1].id]);
		await settle(queue);
	});
});
