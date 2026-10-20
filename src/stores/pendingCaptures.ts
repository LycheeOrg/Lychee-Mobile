/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { Preferences } from "@capacitor/preferences";
import { releasePending } from "@/services/pendingFiles";
import type { PickedFile } from "@/services/picker";
import { serverStore } from "@/stores/server";
import { uploadQueue, type QueueEntry } from "@/stores/uploadQueue";

/**
 * FR-011-04, FR-012-04: a file kept until Lychee accepted it, and how to clean
 * up after: `capture` a taken photo's file (the default for Feature 011's
 * entries), `copy` an iOS copy of a picked file, `grant` Android's access.
 */
export type Cleanup = "capture" | "copy" | "grant";
export type PendingCapture = { file: PickedFile; albumId: string | null; server: string; cleanup?: Cleanup };

export type PendingCapturesDeps = {
	load: () => Promise<PendingCapture[]>;
	save: (list: PendingCapture[]) => Promise<void>;
	/** Cleans up after a file that left the list (`releasePending`). */
	release: (item: PendingCapture) => Promise<void>;
	queue: {
		state: { readonly entries: readonly QueueEntry[] };
		add: (files: PickedFile[], albumId: string | null) => void;
		retry: (id: number) => void;
		remove: (id: number) => void;
	};
	/** The current server's URL, or `null`. */
	server: () => string | null;
};

const ACCEPTED = new Set(["done", "skipped"]);
const ACTIVE = new Set(["waiting", "uploading", "done", "skipped"]);

/**
 * FR-011-04, FR-011-06, Q-011-04: the list of taken photos not yet in Lychee.
 * A photo leaves it (and the phone) only once its upload is done or skipped;
 * `resume()` puts the current server's photos back into the upload queue.
 */
export function createPendingCaptures(deps: PendingCapturesDeps) {
	let items: PendingCapture[] | null = null;
	// Changes run one after another so the stored list never loses an update.
	let chain: Promise<unknown> = Promise.resolve();

	async function list(): Promise<PendingCapture[]> {
		items ??= await deps.load();
		return items;
	}

	function change(update: (current: PendingCapture[]) => PendingCapture[] | Promise<PendingCapture[]>): Promise<void> {
		const next = chain.then(async () => {
			const updated = await update(await list());
			items = updated;
			await deps.save(updated);
		});
		chain = next.catch(() => undefined);
		return next;
	}

	function record(capture: PendingCapture): Promise<void> {
		return change((current) => [...current, capture]);
	}

	async function settled(entry: QueueEntry): Promise<void> {
		if (!ACCEPTED.has(entry.state) || !(await list()).some((item) => item.file.path === entry.file.path)) {
			return;
		}
		await forget(entry.file.path);
	}

	async function resume(): Promise<void> {
		const server = deps.server();
		if (server === null) {
			return;
		}
		for (const item of await list()) {
			if (item.server !== server) {
				continue;
			}
			const entry = deps.queue.state.entries.find((candidate) => candidate.file.path === item.file.path);
			if (entry === undefined) {
				deps.queue.add([item.file], item.albumId);
			} else if (!ACTIVE.has(entry.state)) {
				deps.queue.retry(entry.id);
			}
		}
	}

	async function discard(path: string): Promise<void> {
		const entry = deps.queue.state.entries.find((candidate) => candidate.file.path === path);
		if (entry !== undefined) {
			deps.queue.remove(entry.id);
		}
		await forget(path);
	}

	function forget(path: string): Promise<void> {
		return change(async (current) => {
			const item = current.find((candidate) => candidate.file.path === path);
			if (item !== undefined) {
				await deps.release(item).catch(() => undefined);
			}
			return current.filter((candidate) => candidate.file.path !== path);
		});
	}

	function isPending(path: string): boolean {
		return cleanupOf(path) !== null;
	}

	/** FR-012-04: how a pending file is cleaned up, or `null` when it isn't pending. */
	function cleanupOf(path: string): Cleanup | null {
		const item = items?.find((candidate) => candidate.file.path === path);
		return item === undefined ? null : (item.cleanup ?? "capture");
	}

	return { list, record, settled, resume, discard, isPending, cleanupOf };
}

export type PendingCaptures = ReturnType<typeof createPendingCaptures>;

const STORAGE_KEY = "pending_captures";

/** The app-wide list, kept in Preferences and fed by the upload queue's results. */
export const pendingCaptures = createPendingCaptures({
	load: async () => {
		const { value } = await Preferences.get({ key: STORAGE_KEY });
		try {
			const parsed: unknown = value === null ? [] : JSON.parse(value);
			return Array.isArray(parsed) ? (parsed as PendingCapture[]) : [];
		} catch {
			return [];
		}
	},
	save: (list) => Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(list) }),
	release: (item) => releasePending(item),
	queue: uploadQueue,
	server: () => serverStore.state.saved?.url ?? null,
});

uploadQueue.onSettled((entry) => void pendingCaptures.settled(entry));
