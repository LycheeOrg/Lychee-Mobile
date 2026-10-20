/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { ProgressStatus } from "@capacitor/file-transfer";

const plugins = vi.hoisted(() => ({
	listener: undefined as ((status: ProgressStatus) => void) | undefined,
	remove: vi.fn(async () => undefined),
	downloadFile: vi.fn(async () => ({ path: "p" })),
	rmdir: vi.fn(async () => undefined),
	getUri: vi.fn(async ({ path }: { path: string }) => ({ uri: `file:///cache/${path}` })),
	deleteFile: vi.fn(async () => undefined),
}));

vi.mock("@capacitor/file-transfer", () => ({
	FileTransfer: {
		addListener: vi.fn(async (_event: string, listener: (status: ProgressStatus) => void) => {
			plugins.listener = listener;
			return { remove: plugins.remove };
		}),
		downloadFile: plugins.downloadFile,
	},
}));

vi.mock("@capacitor/filesystem", () => ({
	Directory: { Cache: "CACHE" },
	Filesystem: { rmdir: plugins.rmdir, getUri: plugins.getUri, deleteFile: plugins.deleteFile },
}));

const { deviceDownloadDeps, CONNECT_TIMEOUT_MS, READ_TIMEOUT_MS } = await import("@/services/downloadDevice");

const status = (overrides: Partial<ProgressStatus>): ProgressStatus => ({
	type: "download",
	url: "u",
	bytes: 10,
	contentLength: 100,
	lengthComputable: true,
	...overrides,
});

beforeEach(() => {
	vi.clearAllMocks();
});

describe("device download deps (ADR-007-01)", () => {
	const save = vi.fn(async () => "saved" as const);

	it("puts files in the cache's downloads folder and clears it before a run", async () => {
		const deps = deviceDownloadDeps(save);

		expect(await deps.targetPath("p1.jpg")).toBe("file:///cache/downloads/p1.jpg");
		await deps.prepare();

		expect(plugins.getUri).toHaveBeenCalledWith({ path: "downloads/p1.jpg", directory: "CACHE" });
		expect(plugins.rmdir).toHaveBeenCalledWith({ path: "downloads", directory: "CACHE", recursive: true });
	});

	it("downloads with the headers, progress and timeouts, then drops the listener", async () => {
		const onProgress = vi.fn();
		plugins.downloadFile.mockImplementationOnce(async () => {
			plugins.listener?.(status({}));
			plugins.listener?.(status({ type: "upload" }));
			plugins.listener?.(status({ bytes: 20, lengthComputable: false }));
			return { path: "p" };
		});

		await deviceDownloadDeps(save).transfer(
			{ url: "https://s/api/v2/Zip?photo_ids=p1", headers: { Cookie: "c=1" }, path: "file:///cache/downloads/p1.jpg" },
			onProgress,
		);

		expect(plugins.downloadFile).toHaveBeenCalledWith({
			url: "https://s/api/v2/Zip?photo_ids=p1",
			headers: { Cookie: "c=1" },
			path: "file:///cache/downloads/p1.jpg",
			progress: true,
			connectTimeout: CONNECT_TIMEOUT_MS,
			readTimeout: READ_TIMEOUT_MS,
		});
		expect(onProgress.mock.calls).toEqual([
			[10, 100],
			[20, null],
		]);
		expect(plugins.remove).toHaveBeenCalledTimes(1);
	});

	it("drops the listener when the download fails", async () => {
		plugins.downloadFile.mockRejectedValueOnce(new Error("x"));

		await expect(deviceDownloadDeps(save).transfer({ url: "u", headers: {}, path: "p" }, vi.fn())).rejects.toThrow("x");

		expect(plugins.remove).toHaveBeenCalledTimes(1);
	});

	it("deletes a file by its path", async () => {
		await deviceDownloadDeps(save).remove("file:///cache/downloads/p1.jpg");

		expect(plugins.deleteFile).toHaveBeenCalledWith({ path: "file:///cache/downloads/p1.jpg" });
	});

	it("uses 10 s to connect and 60 s between reads", () => {
		expect([CONNECT_TIMEOUT_MS, READ_TIMEOUT_MS]).toEqual([10_000, 60_000]);
	});
});
