/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { registerPlugin } from "@capacitor/core";
import { ringState, type RingSource } from "@/utils/uploadRing";

/** NC-012-01, NC-012-02: the app's own plugin on both platforms (ADR-012-01). */
type UploadKeepAlivePlugin = {
	start: (options: { text: string; progress: number }) => Promise<void>;
	update: (options: { text: string; progress: number }) => Promise<void>;
	stop: () => Promise<void>;
	/** Android 13+: the notification permission; elsewhere a no-op. */
	requestNotifications: () => Promise<{ granted: boolean }>;
};

const UploadKeepAlive = registerPlugin<UploadKeepAlivePlugin>("UploadKeepAlive");

export type KeepAliveDeps = {
	start: (status: { text: string; progress: number }) => Promise<void>;
	update: (status: { text: string; progress: number }) => Promise<void>;
	stop: () => Promise<void>;
	requestNotifications: () => Promise<void>;
	now: () => number;
};

/** FR-012-03: the notification changes at most once a second. */
export const UPDATE_EVERY_MS = 1000;

/**
 * FR-012-03, ADR-012-01: holds the app up while an upload run lasts (Android
 * foreground service, iOS background time); `sync()` runs on every queue change.
 */
export function createKeepAliveRunner(deps: KeepAliveDeps) {
	let running = false;
	let asked = false;
	let lastUpdate = 0;

	async function sync(queue: RingSource): Promise<void> {
		const ring = ringState(queue);
		if (ring.kind !== "progress") {
			if (running) {
				running = false;
				await deps.stop().catch(() => undefined);
			}
			return;
		}
		const status = { text: statusText(queue), progress: ring.fraction };
		if (!running) {
			running = true;
			lastUpdate = deps.now();
			if (!asked) {
				asked = true;
				await deps.requestNotifications().catch(() => undefined);
			}
			await deps.start(status).catch(() => undefined);
			return;
		}
		if (deps.now() - lastUpdate >= UPDATE_EVERY_MS) {
			lastUpdate = deps.now();
			await deps.update(status).catch(() => undefined);
		}
	}

	return { sync };
}

/** "Uploading N of M" for the current run. */
function statusText(queue: RingSource): string {
	const run = queue.entries.filter((entry) => queue.runIds.includes(entry.id));
	const finished = run.filter((entry) => entry.state !== "waiting" && entry.state !== "uploading").length;
	return `Uploading ${Math.min(finished + 1, run.length)} of ${run.length}`;
}

/** The app-wide runner. */
export const keepAliveRunner = createKeepAliveRunner({
	start: (status) => UploadKeepAlive.start(status),
	update: (status) => UploadKeepAlive.update(status),
	stop: () => UploadKeepAlive.stop(),
	requestNotifications: async () => {
		await UploadKeepAlive.requestNotifications();
	},
	now: () => Date.now(),
});
