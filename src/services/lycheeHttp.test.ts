/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { createLycheeHttp, type LycheeHttpDeps } from "@/services/lycheeHttp";

const BASE = "https://photos.example.com";

function deps(cookies: Record<string, string> = { "XSRF-TOKEN": "abc%3D%3D", lychee_session: "s" }) {
	const fetch = vi.fn<LycheeHttpDeps["fetch"]>(async () => new Response("{}", { status: 200 }));
	const readCookies = vi.fn<LycheeHttpDeps["readCookies"]>(async () => cookies);
	const clearCookies = vi.fn<LycheeHttpDeps["clearCookies"]>(async () => undefined);
	return { fetch, readCookies, clearCookies };
}

function headersOf(call: unknown[]): Headers {
	return new Headers((call[1] as RequestInit | undefined)?.headers);
}

describe("createLycheeHttp (ADR-001-01)", () => {
	it("loads the server root once before the first API call", async () => {
		const d = deps();
		const http = createLycheeHttp(BASE, d);

		await http.get("Version");
		await http.get("Version");

		expect(d.fetch.mock.calls.map((call) => call[0])).toEqual([`${BASE}/`, `${BASE}/api/v2/Version`, `${BASE}/api/v2/Version`]);
	});

	it("sends JSON headers and the decoded XSRF token of that server", async () => {
		const d = deps();
		await createLycheeHttp(BASE, d).get("Version");

		const headers = headersOf(d.fetch.mock.calls[1]);
		expect(headers.get("Accept")).toBe("application/json");
		expect(headers.get("Content-Type")).toBe("application/json");
		expect(headers.get("X-XSRF-TOKEN")).toBe("abc==");
		expect(d.readCookies).toHaveBeenCalledWith(BASE);
	});

	it("sends no XSRF header when the server set no token", async () => {
		const d = deps({});
		await createLycheeHttp(BASE, d).get("Version");

		expect(headersOf(d.fetch.mock.calls[1]).has("X-XSRF-TOKEN")).toBe(false);
	});

	it("keeps a sub-path in every URL", async () => {
		const d = deps();
		await createLycheeHttp("https://example.com/lychee", d).get("Version");

		expect(d.fetch.mock.calls.map((call) => call[0])).toEqual(["https://example.com/lychee/", "https://example.com/lychee/api/v2/Version"]);
	});

	it("passes the abort signal to both requests", async () => {
		const d = deps();
		const controller = new AbortController();
		await createLycheeHttp(BASE, d).get("Version", controller.signal);

		expect(d.fetch.mock.calls.every((call) => (call[1] as RequestInit).signal === controller.signal)).toBe(true);
	});

	it("propagates a network error from the session request", async () => {
		const d = deps();
		d.fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

		await expect(createLycheeHttp(BASE, d).get("Version")).rejects.toThrow("Failed to fetch");
	});
});

describe("createLycheeHttp: post and cookies (FR-002-01, FR-002-04)", () => {
	it("posts a JSON body with the JSON headers and the XSRF token", async () => {
		const d = deps();
		await createLycheeHttp(BASE, d).post("Auth::login", { username: "matt", remember_me: true });

		const [url, init] = d.fetch.mock.calls[1] as [string, RequestInit];
		expect(url).toBe(`${BASE}/api/v2/Auth::login`);
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body as string)).toEqual({ username: "matt", remember_me: true });
		const headers = new Headers(init.headers);
		expect(headers.get("Content-Type")).toBe("application/json");
		expect(headers.get("X-XSRF-TOKEN")).toBe("abc==");
	});

	it("shares one session between GET and POST", async () => {
		const d = deps();
		const http = createLycheeHttp(BASE, d);
		await http.post("Auth::login", {});
		await http.get("Auth::user");

		expect(d.fetch.mock.calls.map((call) => call[0])).toEqual([`${BASE}/`, `${BASE}/api/v2/Auth::login`, `${BASE}/api/v2/Auth::user`]);
	});

	it("reads the XSRF token again for every request", async () => {
		const d = deps();
		d.readCookies.mockResolvedValueOnce({ "XSRF-TOKEN": "first" }).mockResolvedValueOnce({ "XSRF-TOKEN": "second" });
		const http = createLycheeHttp(BASE, d);
		await http.post("Auth::login", {});
		await http.get("Auth::user");

		expect(headersOf(d.fetch.mock.calls[2]).get("X-XSRF-TOKEN")).toBe("second");
	});

	it("clears the cookies of that server and starts a new session afterwards", async () => {
		const d = deps();
		const http = createLycheeHttp(BASE, d);
		await http.get("Auth::user");
		await http.clearCookies();
		await http.get("Auth::user");

		expect(d.clearCookies).toHaveBeenCalledWith(BASE);
		expect(d.fetch.mock.calls.filter((call) => call[0] === `${BASE}/`)).toHaveLength(2);
	});
});
