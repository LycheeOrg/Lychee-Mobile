/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { createDownloadRun, type DownloadRunDeps } from "@/stores/downloadRun";
import type { PhotoTile } from "@/services/galleryParsers";
import { context, fakeGallery, photoTile } from "@/stores/__helpers__/fakeGallery";

const ORIGINAL = "https://photos.example.com/uploads/original/x.jpeg";

function photo(id: string): PhotoTile {
	const base = photoTile(id);
	return { ...base, variants: { ...base.variants, original: { url: ORIGINAL, width: 1, height: 1 } } };
}

const httpError = (status: number) => Object.assign(new Error("http"), { code: "OS-PLUG-FLTR-0010", data: { httpStatus: status } });
const dropped = () => Object.assign(new Error("connection"), { code: "OS-PLUG-FLTR-0008", data: {} });

/** Every dependency is a mock, running the override when one is given. */
function deps(overrides: Partial<DownloadRunDeps> = {}) {
	return {
		prepare: vi.fn<DownloadRunDeps["prepare"]>(overrides.prepare ?? (async () => undefined)),
		targetPath: vi.fn<DownloadRunDeps["targetPath"]>(overrides.targetPath ?? (async (name) => `file:///cache/downloads/${name}`)),
		transfer: vi.fn<DownloadRunDeps["transfer"]>(overrides.transfer ?? (async () => undefined)),
		save: vi.fn<DownloadRunDeps["save"]>(overrides.save ?? (async () => "saved")),
		remove: vi.fn<DownloadRunDeps["remove"]>(overrides.remove ?? (async () => undefined)),
	};
}

describe("download run (FR-007-04, DO-007-04)", () => {
	it("saves photos one at a time in order and cleans up each file (S-007-10)", async () => {
		const d = deps();
		const run = createDownloadRun(d);
		const ctx = context(fakeGallery({}));

		run.download(ctx, "a1", [photo("p1"), photo("p2")]);
		await run.whenIdle();

		expect(d.prepare).toHaveBeenCalledTimes(1);
		expect(d.transfer.mock.calls.map((call) => call[0])).toEqual([
			{ url: "zip/p1/a1", headers: {}, path: "file:///cache/downloads/p1.jpeg" },
			{ url: "zip/p2/a1", headers: {}, path: "file:///cache/downloads/p2.jpeg" },
		]);
		expect(d.save).toHaveBeenNthCalledWith(1, "file:///cache/downloads/p1.jpeg", expect.objectContaining({ name: "p1.jpeg", save: "photo" }));
		expect(d.remove.mock.calls.map((call) => call[0])).toEqual(["file:///cache/downloads/p1.jpeg", "file:///cache/downloads/p2.jpeg"]);
		expect(run.state).toMatchObject({ status: "done", total: 2, done: 2, saved: 2, failed: [], stopReason: null });
	});

	it("shows the current file's progress", async () => {
		const seen: unknown[] = [];
		const run = createDownloadRun(
			deps({
				transfer: async (_request, onProgress) => {
					onProgress(50, 100);
					seen.push({ ...run.state.current });
				},
			}),
		);

		run.download(context(fakeGallery({})), "a1", [photo("p1")]);
		await run.whenIdle();

		expect(seen).toEqual([{ bytes: 50, total: 100 }]);
		expect(run.state.current).toBeNull();
	});

	it("keeps going after a photo fails and still removes its file (S-007-13)", async () => {
		const d = deps({ transfer: vi.fn<DownloadRunDeps["transfer"]>().mockRejectedValueOnce(dropped()).mockResolvedValue(undefined) });
		const run = createDownloadRun(d);

		run.download(context(fakeGallery({})), "a1", [photo("p1"), photo("p2")]);
		await run.whenIdle();

		expect(run.state).toMatchObject({ status: "done", done: 2, saved: 1 });
		expect(run.state.failed.map((f) => [f.photo.id, f.failure])).toEqual([["p1", "interrupted"]]);
		expect(d.remove).toHaveBeenCalledWith("file:///cache/downloads/p1.jpeg");
	});

	it.each([
		[403, "forbidden"],
		[404, "not_found"],
	])("records HTTP %i as %s", async (status, failure) => {
		const run = createDownloadRun(deps({ transfer: async () => Promise.reject(httpError(status)) }));

		run.download(context(fakeGallery({})), "a1", [photo("p1")]);
		await run.whenIdle();

		expect(run.state.failed[0].failure).toBe(failure);
	});

	it("skips a photo whose file type is unknown (S-007-18)", async () => {
		const d = deps();
		const run = createDownloadRun(d);

		run.download(context(fakeGallery({})), "a1", [{ ...photoTile("p1"), mimeType: null }]);
		await run.whenIdle();

		expect(d.transfer).not.toHaveBeenCalled();
		expect(run.state.failed.map((f) => f.failure)).toEqual(["unsaveable"]);
	});

	it("records a library error as unsaveable", async () => {
		const run = createDownloadRun(deps({ save: async () => "unsaveable" }));

		run.download(context(fakeGallery({})), "a1", [photo("p1")]);
		await run.whenIdle();

		expect(run.state.failed.map((f) => f.failure)).toEqual(["unsaveable"]);
	});

	it("retries only the failed photos", async () => {
		const d = deps({ transfer: vi.fn<DownloadRunDeps["transfer"]>().mockRejectedValueOnce(dropped()).mockResolvedValue(undefined) });
		const run = createDownloadRun(d);
		const ctx = context(fakeGallery({}));
		run.download(ctx, "a1", [photo("p1"), photo("p2")]);
		await run.whenIdle();

		run.retryFailed(ctx);
		await run.whenIdle();

		expect(d.transfer.mock.calls.map((call) => call[0].url)).toEqual(["zip/p1/a1", "zip/p2/a1", "zip/p1/a1"]);
		expect(run.state).toMatchObject({ status: "done", total: 1, saved: 1, failed: [] });
	});

	it("appends photos chosen while a run is going", async () => {
		const d = deps();
		const run = createDownloadRun(d);
		const ctx = context(fakeGallery({}));

		run.download(ctx, "a1", [photo("p1")]);
		run.download(ctx, "b2", [photo("p2"), photo("p3")]);
		await run.whenIdle();

		expect(d.prepare).toHaveBeenCalledTimes(1);
		expect(d.transfer.mock.calls.map((call) => call[0].url)).toEqual(["zip/p1/a1", "zip/p2/b2", "zip/p3/b2"]);
		expect(run.state).toMatchObject({ total: 3, saved: 3 });
	});

	it("signs in silently once on a 401 and fetches the photo again", async () => {
		const gallery = fakeGallery({});
		const ctx = context(gallery, true, true);
		const d = deps({ transfer: vi.fn<DownloadRunDeps["transfer"]>().mockRejectedValueOnce(httpError(401)).mockResolvedValue(undefined) });
		const run = createDownloadRun(d);

		run.download(ctx, "a1", [photo("p1")]);
		await run.whenIdle();

		expect(ctx.onUnauthenticated).toHaveBeenCalledTimes(1);
		expect(gallery.downloadRequest).toHaveBeenCalledTimes(2);
		expect(run.state).toMatchObject({ status: "done", saved: 1 });
	});

	it("stops on a 401 the silent login can't fix, keeping the rest for Retry", async () => {
		const ctx = context(fakeGallery({}), true, false);
		const d = deps({ transfer: async () => Promise.reject(httpError(401)) });
		const run = createDownloadRun(d);

		run.download(ctx, "a1", [photo("p1"), photo("p2")]);
		await run.whenIdle();

		expect(d.save).not.toHaveBeenCalled();
		expect(run.state).toMatchObject({ status: "stopped", stopReason: "unauthenticated", saved: 0 });
		expect(run.state.failed.map((f) => [f.photo.id, f.failure])).toEqual([
			["p1", "unauthenticated"],
			["p2", "unauthenticated"],
		]);
	});

	it("stops when the library permission is denied (S-007-12)", async () => {
		const d = deps({ save: async () => "permission_denied" });
		const run = createDownloadRun(d);

		run.download(context(fakeGallery({})), "a1", [photo("p1"), photo("p2")]);
		await run.whenIdle();

		expect(d.transfer).toHaveBeenCalledTimes(1);
		expect(d.remove).toHaveBeenCalledTimes(1);
		expect(run.state).toMatchObject({ status: "stopped", stopReason: "permission_denied" });
		expect(run.state.failed.map((f) => f.photo.id)).toEqual(["p1", "p2"]);
	});

	it("ignores errors while cleaning up", async () => {
		const run = createDownloadRun(
			deps({ prepare: async () => Promise.reject(new Error("x")), remove: async () => Promise.reject(new Error("x")) }),
		);

		run.download(context(fakeGallery({})), "a1", [photo("p1")]);
		await run.whenIdle();

		expect(run.state).toMatchObject({ status: "done", saved: 1 });
	});

	it("dismisses a finished run", async () => {
		const run = createDownloadRun(deps());
		run.download(context(fakeGallery({})), "a1", [photo("p1")]);
		await run.whenIdle();

		run.dismiss();

		expect(run.state.status).toBe("idle");
	});
});
