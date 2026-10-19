/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { CapacitorCookies } from "@capacitor/core";

/**
 * I/O used to talk to a Lychee server, injectable for tests. On the device,
 * `fetch` is the native HTTP stack (CapacitorHttp) and cookies live in the
 * native cookie store (ADR-001-01).
 */
export type LycheeHttpDeps = {
	fetch: (input: string, init?: RequestInit) => Promise<Response>;
	/** Cookies the server set, by name, URL-encoded as stored. */
	readCookies: (url: string) => Promise<Record<string, string>>;
	/** Forgets every cookie of the server (session, remember, XSRF). */
	clearCookies: (url: string) => Promise<void>;
};

export type LycheeHttp = {
	/** `GET {server}/api/v2/{path}` with the headers Lychee requires. */
	get: (path: string, signal?: AbortSignal) => Promise<Response>;
	/** `POST {server}/api/v2/{path}` with `body` as JSON. */
	post: (path: string, body: unknown, signal?: AbortSignal) => Promise<Response>;
	/** Drops the server's cookies; the next call starts a new session. */
	clearCookies: () => Promise<void>;
};

const XSRF_COOKIE = "XSRF-TOKEN";

export const nativeDeps: LycheeHttpDeps = {
	fetch: (input, init) => fetch(input, init),
	readCookies: (url) => CapacitorCookies.getCookies({ url }),
	clearCookies: (url) => CapacitorCookies.clearCookies({ url }),
};

/**
 * Client for one Lychee server. Every `api/v2` request needs a JSON content
 * type and must pass CSRF: the first call loads `{server}/`, which sets the
 * session and `XSRF-TOKEN` cookies, and every API call echoes the token in
 * `X-XSRF-TOKEN`.
 *
 * @param baseUrl normalised server URL, without trailing slash
 */
export function createLycheeHttp(baseUrl: string, deps: LycheeHttpDeps = nativeDeps): LycheeHttp {
	let hasSession = false;

	async function startSession(signal?: AbortSignal): Promise<void> {
		if (hasSession) {
			return;
		}
		await deps.fetch(`${baseUrl}/`, { method: "GET", signal });
		hasSession = true;
	}

	async function apiHeaders(): Promise<Headers> {
		const headers = new Headers({ Accept: "application/json", "Content-Type": "application/json" });
		const token = (await deps.readCookies(baseUrl))[XSRF_COOKIE];
		if (token !== undefined && token !== "") {
			headers.set("X-XSRF-TOKEN", decodeURIComponent(token));
		}
		return headers;
	}

	async function request(method: "GET" | "POST", path: string, init: RequestInit): Promise<Response> {
		await startSession(init.signal ?? undefined);
		return deps.fetch(`${baseUrl}/api/v2/${path}`, { ...init, method, headers: await apiHeaders() });
	}

	return {
		get: (path, signal) => request("GET", path, { signal }),
		post: (path, body, signal) => request("POST", path, { body: JSON.stringify(body), signal }),
		async clearCookies() {
			await deps.clearCookies(baseUrl);
			hasSession = false;
		},
	};
}

/** The response body as JSON, or `undefined` when it is not JSON. */
export async function readJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return undefined;
	}
}
