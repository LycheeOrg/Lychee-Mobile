/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import type { QueueEntry } from "@/stores/uploadQueue";

/** FR-012-01: what the toolbar's upload ring shows. */
export type Ring = { kind: "hidden" } | { kind: "progress"; fraction: number } | { kind: "failed" };

export type RingSource = { readonly entries: readonly QueueEntry[]; readonly runIds: readonly number[] };

const ACTIVE = new Set(["waiting", "uploading"]);

/** FR-012-01: the current run's progress by bytes; a warning while failed files remain. */
export function ringState(queue: RingSource): Ring {
	if (queue.entries.some((entry) => ACTIVE.has(entry.state))) {
		const run = queue.entries.filter((entry) => queue.runIds.includes(entry.id));
		const total = run.reduce((sum, entry) => sum + entry.file.size, 0);
		const sent = run.reduce((sum, entry) => sum + bytesDone(entry), 0);
		return { kind: "progress", fraction: total > 0 ? sent / total : 0 };
	}
	return queue.entries.some((entry) => entry.state === "failed") ? { kind: "failed" } : { kind: "hidden" };
}

function bytesDone(entry: QueueEntry): number {
	if (entry.state === "waiting") {
		return 0;
	}
	return entry.state === "uploading" ? Math.min(entry.sent, entry.file.size) : entry.file.size;
}
