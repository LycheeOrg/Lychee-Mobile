/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

/** FR-004-02: load the next page this close to the last loaded photo. */
export const LOAD_MORE_THRESHOLD = 3;

/** FR-004-07: "n of total", never below the photos already loaded. */
export function counterText(index: number, total: number, loaded = 0): string {
	return `${index + 1} of ${Math.max(total, loaded)}`;
}

/** FR-004-02: whether showing photo `index` should load the album's next page. */
export function shouldLoadMore(index: number, loaded: number, hasMore: boolean): boolean {
	return hasMore && index >= loaded - 1 - LOAD_MORE_THRESHOLD;
}
