/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

const VERSION = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/;

/**
 * Whether `version` is at least `minimum`, comparing major.minor.patch and
 * ignoring any suffix. A hidden (`null`) or unreadable version passes, so
 * the server is tried (FR-003-04).
 */
export function meetsMinimumVersion(version: string | null, minimum: string): boolean {
	const actual = partsOf(version);
	const required = partsOf(minimum);
	if (actual === undefined || required === undefined) {
		return true;
	}
	const index = actual.findIndex((part, i) => part !== required[i]);
	return index === -1 || actual[index] > required[index];
}

function partsOf(version: string | null): number[] | undefined {
	const match = version === null ? null : VERSION.exec(version);
	return match === null ? undefined : [1, 2, 3].map((group) => Number(match[group] ?? 0));
}
