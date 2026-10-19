/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import type { UploadResult } from "@/services/upload";
import type { QueueEntry } from "@/stores/uploadQueue";

export const PERMISSION_DENIED = "Uploading needs access to photo locations, so your photos keep their GPS data. Allow it in the app's settings.";

const RESULT_MESSAGES: Record<Exclude<UploadResult["kind"], "rejected">, string> = {
	done: "Uploaded",
	skipped: "Already in the gallery",
	empty: "Empty file",
	quota: "Your storage quota is full",
	too_large: "Too large for this server",
	interrupted: "Upload interrupted",
	unreadable: "Couldn't read this file",
	unauthenticated: "Sign in again to upload",
	failed: "Upload failed",
};

/** FR-005-03: a file's result. */
export function uploadResultMessage(result: UploadResult): string {
	return result.kind === "rejected" ? result.message : RESULT_MESSAGES[result.kind];
}

/** FR-005-04: the status line of a queue entry. */
export function entryStatus(entry: QueueEntry): string {
	if (entry.state === "waiting") {
		return "Waiting";
	}
	if (entry.result?.kind === "done" && entry.result.withoutLocation === true) {
		return "Uploaded without GPS data";
	}
	if (entry.state === "uploading" || entry.result === null) {
		return `${Math.floor((entry.sent / Math.max(entry.file.size, 1)) * 100)}%`;
	}
	return uploadResultMessage(entry.result);
}

/** FR-005-01. */
export function pickFailureMessage(kind: "permission_denied" | "failed"): string {
	return kind === "permission_denied" ? PERMISSION_DENIED : "Couldn't open your photos.";
}
