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
	return { fetch, readCookies };
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
