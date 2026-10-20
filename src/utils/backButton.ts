/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

/** Routes where Android back leaves the app (FR-009-01). */
const ROOT_ROUTES = new Set(["albums"]);

/**
 * FR-009-01: an Ionic back-button handler that closes the app on the album
 * list. Ionic's router would go back in history instead, to Settings or Sign
 * in, or do nothing (spec Appendix). Elsewhere the router handles it.
 */
export function rootBackHandler(currentRoute: () => unknown, exit: () => void): (processNextHandler: () => void) => void {
	return (processNextHandler) => {
		const route = currentRoute();
		if (typeof route === "string" && ROOT_ROUTES.has(route)) {
			exit();
		} else {
			processNextHandler();
		}
	};
}
