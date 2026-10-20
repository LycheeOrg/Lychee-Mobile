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

export type QueryParams = Record<string, string | number>;

export type LycheeHttp = {
	/** `GET {server}/api/v2/{path}?{query}` with the headers Lychee requires. */
	get: (path: string, signal?: AbortSignal, query?: QueryParams) => Promise<Response>;
	/** `POST {server}/api/v2/{path}` with `body` as JSON. */
	post: (path: string, body: unknown, signal?: AbortSignal) => Promise<Response>;
	/** `POST {server}/api/v2/{path}` as multipart; the native layer sets the boundary (API-005-02). */
	postForm: (path: string, form: FormData, signal?: AbortSignal) => Promise<Response>;
	/** `DELETE {server}/api/v2/{path}` with `body` as JSON (API-007-01). */
	delete: (path: string, body: unknown, signal?: AbortSignal) => Promise<Response>;
	/** `{server}/api/v2/{path}?{query}`, for requests sent by other native stacks (API-007-02). */
	apiUrl: (path: string, query?: QueryParams) => string;
	/** The server's cookies as a `Cookie` header, for those requests (NFR-007-06). */
	cookieHeader: () => Promise<string>;
	/** Drops the server's cookies; the next call starts a new session. */
	clearCookies: () => Promise<void>;
};

type Method = "GET" | "POST" | "DELETE";

const XSRF_COOKIE = "XSRF-TOKEN";
/** Laravel's status for an expired session or CSRF token. */
const SESSION_EXPIRED = 419;

export const nativeDeps: LycheeHttpDeps = {
	fetch: (input, init) => fetch(input, init),
	readCookies: (url) => CapacitorCookies.getCookies({ url }),
	clearCookies: (url) => CapacitorCookies.clearCookies({ url }),
};

/**
 * Client for one Lychee server. Every `api/v2` request needs a JSON content
 * type and must pass CSRF: the first call loads `{server}/`, which sets the
 * session and `XSRF-TOKEN` cookies, and every API call echoes the token in
 * `X-XSRF-TOKEN`. A 419 means the session expired: it is restarted and the
 * request sent once more (FR-003-07).
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

	/** Multipart bodies get no `Content-Type` here: CapacitorHttp sets it with the boundary. */
	async function apiHeaders(multipart: boolean): Promise<Headers> {
		const headers = new Headers({ Accept: "application/json" });
		if (!multipart) {
			headers.set("Content-Type", "application/json");
		}
		const token = (await deps.readCookies(baseUrl))[XSRF_COOKIE];
		if (token !== undefined && token !== "") {
			headers.set("X-XSRF-TOKEN", decodeURIComponent(token));
		}
		return headers;
	}

	async function send(method: Method, url: string, init: RequestInit): Promise<Response> {
		await startSession(init.signal ?? undefined);
		return deps.fetch(url, { ...init, method, headers: await apiHeaders(init.body instanceof FormData) });
	}

	function apiUrl(path: string, query?: QueryParams): string {
		return `${baseUrl}/api/v2/${path}${queryString(query)}`;
	}

	async function request(method: Method, path: string, init: RequestInit, query?: QueryParams): Promise<Response> {
		const url = apiUrl(path, query);
		const response = await send(method, url, init);
		if (response.status !== SESSION_EXPIRED) {
			return response;
		}
		hasSession = false;
		return send(method, url, init);
	}

	return {
		get: (path, signal, query) => request("GET", path, { signal }, query),
		post: (path, body, signal) => request("POST", path, { body: JSON.stringify(body), signal }),
		postForm: (path, form, signal) => request("POST", path, { body: form, signal }),
		delete: (path, body, signal) => request("DELETE", path, { body: JSON.stringify(body), signal }),
		apiUrl,
		async cookieHeader() {
			const cookies = await deps.readCookies(baseUrl);
			return Object.entries(cookies)
				.map(([name, value]) => `${name}=${value}`)
				.join("; ");
		},
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

function queryString(query: QueryParams | undefined): string {
	const params = new URLSearchParams(Object.entries(query ?? {}).map(([key, value]) => [key, String(value)])).toString();
	return params === "" ? "" : `?${params}`;
}
