/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

/**
 * Turns what a user types as their Lychee server address into a base URL:
 * trims it, assumes `https://` when no scheme is given, and drops trailing
 * slashes.
 *
 * @returns the normalised URL, or `null` if the input is not an http(s) URL
 */
export function normalizeServerUrl(input: string): string | null {
	const trimmed = input.trim();
	if (trimmed === "") {
		return null;
	}

	const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	let url: URL;
	try {
		url = new URL(withScheme);
	} catch {
		return null;
	}

	if ((url.protocol !== "https:" && url.protocol !== "http:") || url.hostname === "") {
		return null;
	}

	return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
}
