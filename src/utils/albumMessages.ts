/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import type { CreateAlbumResult } from "@/services/gallery";

const TITLE_PROBLEMS = {
	empty: "Enter a title.",
	too_long: "Album titles can be at most 100 characters.",
} as const;

const CREATE_FAILURES: Record<Exclude<CreateAlbumResult["kind"], "ok" | "invalid">, string> = {
	busy: "The server is busy. Try again.",
	forbidden: "You can't create albums here.",
	unreachable: "Couldn't reach the server.",
	unauthenticated: "Sign in again to create albums.",
	failed: "Couldn't create the album.",
};

/** FR-010-03. */
export function titleProblemMessage(problem: keyof typeof TITLE_PROBLEMS): string {
	return TITLE_PROBLEMS[problem];
}

/** FR-010-03: a failed create; a 422 shows the server's own message. */
export function createFailureMessage(result: Exclude<CreateAlbumResult, { kind: "ok" }>): string {
	if (result.kind === "invalid") {
		return result.message === "" ? CREATE_FAILURES.failed : result.message;
	}
	return CREATE_FAILURES[result.kind];
}
