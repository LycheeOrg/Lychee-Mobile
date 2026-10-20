/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { reactive, readonly } from "vue";
import { downloadFileOf, transferFailure, type DownloadFile, type SaveFailure } from "@/services/download";
import { deviceDownloadDeps } from "@/services/downloadDevice";
import type { DownloadRequest } from "@/services/gallery";
import type { PhotoTile } from "@/services/galleryParsers";
import { createLibrarySaver } from "@/services/librarySaver";
import type { GalleryContext } from "@/stores/galleryContext";

/** What the run needs from the device, injectable for tests (ADR-007-01). */
export type DownloadRunDeps = {
	/** Deletes leftovers from an earlier run. */
	prepare: () => Promise<void>;
	/** The full cache path for a file name. */
	targetPath: (name: string) => Promise<string>;
	/** Streams the request to `path`; rejects like file-transfer. */
	transfer: (request: DownloadRequest & { path: string }, onProgress: (bytes: number, total: number | null) => void) => Promise<void>;
	/** Adds the file to the photo library. */
	save: (path: string, file: DownloadFile) => Promise<"saved" | "permission_denied" | "unsaveable">;
	remove: (path: string) => Promise<void>;
};

type Item = { photo: PhotoTile; fromId: string };

/** DO-007-04. */
export type FailedDownload = Item & { failure: SaveFailure };
export type DownloadRunStatus = "idle" | "running" | "done" | "stopped";

/**
 * FR-007-04: saves photos into the library one at a time. A second 401 or a
 * denied library permission stops the run; the photos not saved stay in
 * `failed` for Retry failed.
 */
export function createDownloadRun(deps: DownloadRunDeps) {
	const state = reactive({
		status: "idle" as DownloadRunStatus,
		total: 0,
		done: 0,
		saved: 0,
		current: null as { bytes: number; total: number | null } | null,
		failed: [] as FailedDownload[],
		stopReason: null as "unauthenticated" | "permission_denied" | null,
	});
	let queue: Item[] = [];
	let running: Promise<void> | null = null;

	function download(ctx: GalleryContext, fromId: string, photos: PhotoTile[]): void {
		enqueue(
			ctx,
			photos.map((photo) => ({ photo, fromId })),
		);
	}

	function retryFailed(ctx: GalleryContext): void {
		const items = state.failed.map(({ photo, fromId }) => ({ photo, fromId }));
		enqueue(ctx, items);
	}

	function enqueue(ctx: GalleryContext, items: Item[]): void {
		if (items.length === 0) {
			return;
		}
		if (running === null) {
			Object.assign(state, { status: "running", total: 0, done: 0, saved: 0, failed: [], stopReason: null });
		}
		queue = [...queue, ...items];
		state.total += items.length;
		running ??= work(ctx).finally(() => {
			running = null;
		});
	}

	async function work(ctx: GalleryContext): Promise<void> {
		await deps.prepare().catch(() => undefined);
		let item = queue.shift();
		while (item !== undefined) {
			const failure = await saveOne(ctx, item);
			state.done += 1;
			if (failure === null) {
				state.saved += 1;
			} else if (failure === "unauthenticated" || failure === "permission_denied") {
				stop(failure, item);
				return;
			} else {
				state.failed = [...state.failed, { ...item, failure }];
			}
			item = queue.shift();
		}
		state.status = "done";
	}

	/** The photo that stopped the run and those not tried yet go to `failed`. */
	function stop(reason: "unauthenticated" | "permission_denied", item: Item): void {
		const rest = [item, ...queue].map((left) => ({ ...left, failure: reason }));
		queue = [];
		state.failed = [...state.failed, ...rest];
		state.stopReason = reason;
		state.status = "stopped";
	}

	async function saveOne(ctx: GalleryContext, item: Item): Promise<SaveFailure | null> {
		const file = downloadFileOf(item.photo);
		if (file === null) {
			return "unsaveable";
		}
		const path = await deps.targetPath(`${item.photo.id}.${file.ext}`);
		try {
			let failure = await fetchOne(ctx, item, path);
			if (failure === "unauthenticated" && (await ctx.onUnauthenticated())) {
				failure = await fetchOne(ctx, item, path);
			}
			if (failure !== null) {
				return failure;
			}
			const saved = await deps.save(path, file);
			return saved === "saved" ? null : saved;
		} finally {
			state.current = null;
			await deps.remove(path).catch(() => undefined);
		}
	}

	async function fetchOne(ctx: GalleryContext, item: Item, path: string): Promise<SaveFailure | null> {
		const request = await ctx.gallery.downloadRequest(item.photo.id, item.fromId);
		state.current = { bytes: 0, total: null };
		try {
			await deps.transfer({ ...request, path }, (bytes, total) => {
				state.current = { bytes, total };
			});
			return null;
		} catch (error) {
			return transferFailure(error);
		}
	}

	function dismiss(): void {
		if (running === null) {
			Object.assign(state, { status: "idle", total: 0, done: 0, saved: 0, failed: [], stopReason: null });
		}
	}

	return {
		state: readonly(state),
		download,
		retryFailed,
		dismiss,
		whenIdle: async () => {
			await running;
		},
	};
}

export type DownloadRun = ReturnType<typeof createDownloadRun>;

/** The app-wide run (FR-007-04). */
export const downloadRun = createDownloadRun(deviceDownloadDeps(createLibrarySaver()));
