/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { reactive, readonly } from "vue";
import { chunksOfFile } from "@/services/fileChunks";
import type { AlbumKind } from "@/services/galleryParsers";
import { createLycheeHttp, type LycheeHttp } from "@/services/lycheeHttp";
import { withOriginal } from "@/services/originalMedia";
import type { PickedFile } from "@/services/picker";
import { readChunkSize, uploadFile, type UploadResult } from "@/services/upload";
import { accountStore } from "@/stores/account";
import { serverStore } from "@/stores/server";

/** FR-005-02: where an Upload button sends files; `albumId: null` is Unsorted. */
export type UploadTarget = { albumId: string | null };

/** FR-005-02: the target for an album, or `null` when it takes no uploads here. */
export function uploadTargetFor(album: { id: string; kind: AlbumKind; canUpload: boolean }): UploadTarget | null {
	if (!album.canUpload) {
		return null;
	}
	if (album.kind === "smart") {
		return album.id === "unsorted" ? { albumId: null } : null;
	}
	return { albumId: album.id };
}

export type EntryState = "waiting" | "uploading" | "done" | "skipped" | "failed";

/** DO-005-03. */
export type QueueEntry = { id: number; file: PickedFile; albumId: string | null; state: EntryState; sent: number; result: UploadResult | null };

type QueueDeps = {
	upload: (file: PickedFile, albumId: string | null, onProgress: (sent: number) => void) => Promise<UploadResult>;
	onUnauthenticated: () => void | Promise<void>;
};

const FINISHED: EntryState[] = ["done", "skipped"];

function stateOf(result: UploadResult): EntryState {
	if (result.kind === "done") {
		return "done";
	}
	return result.kind === "skipped" || result.kind === "empty" ? "skipped" : "failed";
}

/**
 * FR-005-04, FR-005-05: files upload one at a time in the order added. A run
 * ends when nothing waits; if anything was done, `finishedRuns` counts up and
 * `lastDoneAlbums` names the albums to reload. A 401 stops the run.
 */
export function createUploadQueue(deps: QueueDeps) {
	const state = reactive({
		entries: [] as QueueEntry[],
		finishedRuns: 0,
		lastDoneAlbums: new Set<string | null>(),
	});
	let nextId = 1;
	let running: Promise<void> | null = null;
	let stopped = false;

	const waiting = () => state.entries.find((entry) => entry.state === "waiting");

	function start(): void {
		stopped = false;
		if (running !== null) {
			return;
		}
		running = run().finally(() => {
			running = null;
			// Files added while the last one finished start a new run.
			if (!stopped && waiting() !== undefined) {
				start();
			}
		});
	}

	async function run(): Promise<void> {
		const doneAlbums = new Set<string | null>();
		for (let entry = waiting(); entry !== undefined && !stopped; entry = waiting()) {
			const current = entry;
			current.state = "uploading";
			const result = await deps.upload(current.file, current.albumId, (sent) => {
				current.sent = sent;
			});
			current.result = result;
			current.state = stateOf(result);
			if (result.kind === "done") {
				doneAlbums.add(current.albumId);
			}
			if (result.kind === "unauthenticated") {
				stopped = true;
				await deps.onUnauthenticated();
			}
		}
		if (doneAlbums.size > 0) {
			state.lastDoneAlbums = doneAlbums;
			state.finishedRuns += 1;
		}
	}

	function add(files: PickedFile[], albumId: string | null): void {
		for (const file of files) {
			state.entries.push({ id: nextId++, file, albumId, state: "waiting", sent: 0, result: null });
		}
		start();
	}

	function retry(id: number): void {
		const entry = state.entries.find((candidate) => candidate.id === id);
		if (entry === undefined || entry.state !== "failed") {
			return;
		}
		Object.assign(entry, { state: "waiting", sent: 0, result: null });
		start();
	}

	function clearFinished(): void {
		state.entries = state.entries.filter((entry) => !FINISHED.includes(entry.state));
	}

	function remaining(): number {
		return state.entries.filter((entry) => entry.state === "waiting" || entry.state === "uploading").length;
	}

	async function whenIdle(): Promise<void> {
		while (running !== null) {
			await running;
		}
	}

	return { state: readonly(state), add, retry, clearFinished, remaining, whenIdle };
}

// App wiring: one session and one chunk size per server.
let session: { server: string; http: LycheeHttp; chunkSize: Promise<number> } | undefined;

async function uploadToCurrentServer(file: PickedFile, albumId: string | null, onProgress: (sent: number) => void): Promise<UploadResult> {
	const saved = serverStore.state.saved;
	if (saved === null) {
		return { kind: "failed" };
	}
	if (session?.server !== saved.url) {
		const http = createLycheeHttp(saved.url);
		session = { server: saved.url, http, chunkSize: readChunkSize(http) };
	}
	const { http, chunkSize } = { http: session.http, chunkSize: await session.chunkSize };
	return withOriginal(file.path, (path) => uploadFile(http, file, albumId, chunkSize, chunksOfFile(path, file.size, chunkSize), onProgress));
}

/** The app-wide queue. */
export const uploadQueue = createUploadQueue({
	upload: uploadToCurrentServer,
	onUnauthenticated: () => {
		const saved = serverStore.state.saved;
		return saved === null ? undefined : accountStore.refresh(saved.url);
	},
});
