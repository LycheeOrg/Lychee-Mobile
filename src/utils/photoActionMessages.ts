/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import type { DeleteResult } from "@/services/gallery";

export const DELETE_CONFIRM_TEXT = "Photos that are also in other albums are only removed from this album. This can't be undone.";
export const SAVE_PERMISSION_DENIED = "Saving needs permission to add to your photos. Allow it in the app's settings.";

const DELETE_FAILURES: Record<Exclude<DeleteResult["kind"], "ok">, string> = {
	forbidden: "You can't delete some of these photos.",
	failed: "Couldn't delete the photos.",
	unreachable: "Couldn't reach the server. Nothing was deleted.",
	timeout: "The server didn't answer. Some photos may have been deleted.",
	unauthenticated: "Sign in again to delete photos.",
};

/** FR-007-01: the toolbar title in selection mode. */
export function selectionTitle(count: number): string {
	return count === 0 ? "Select photos" : `${count} selected`;
}

/** FR-007-03, NFR-007-05. */
export function deleteConfirmTitle(count: number): string {
	return count === 1 ? "Delete this photo?" : `Delete ${count} photos?`;
}

export function deleteFailureMessage(kind: Exclude<DeleteResult["kind"], "ok">): string {
	return DELETE_FAILURES[kind];
}

/** FR-007-04: the running bar; `fraction` is `null` while the size is unknown. */
export function downloadProgress(run: { total: number; done: number; current: { bytes: number; total: number | null } | null }): {
	text: string;
	fraction: number | null;
} {
	const size = run.current?.total ?? null;
	return {
		text: `Saving ${Math.min(run.done + 1, run.total)} of ${run.total}`,
		fraction: run.current === null || size === null || size <= 0 ? null : Math.min(run.current.bytes / size, 1),
	};
}

/** FR-007-04, FR-007-05: the finished or stopped bar. */
export function downloadSummary(run: {
	status: string;
	total: number;
	saved: number;
	failed: readonly unknown[];
	stopReason: "unauthenticated" | "permission_denied" | null;
}): string {
	if (run.stopReason === "permission_denied") {
		return SAVE_PERMISSION_DENIED;
	}
	if (run.stopReason === "unauthenticated") {
		return "Sign in again to save photos.";
	}
	if (run.failed.length === 0) {
		return run.saved === 1 ? "Saved 1 photo to your library." : `Saved ${run.saved} photos to your library.`;
	}
	return `Saved ${run.saved} of ${run.total}. ${run.failed.length} couldn't be saved.`;
}
