/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { CHECK_TIMEOUT_MS, checkServer } from "@/services/server";
import type { LycheeHttpDeps } from "@/services/lycheeHttp";
import version from "@/services/__fixtures__/lychee-7.11.1/version.json";
import error406 from "@/services/__fixtures__/lychee-7.11.1/error-406.json";
import error419 from "@/services/__fixtures__/lychee-7.11.1/error-419.json";

/** A server whose root answers 200 HTML and whose Version endpoint answers `version`. */
function server(versionResponse: () => Response | Promise<Response>) {
	const fetch = vi.fn<LycheeHttpDeps["fetch"]>(async (url) =>
		url.endsWith("/api/v2/Version") ? versionResponse() : new Response("<html></html>"),
	);
	const readCookies = vi.fn<LycheeHttpDeps["readCookies"]>(async () => ({ "XSRF-TOKEN": "t" }));
	return { fetch, readCookies };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
	vi.useRealTimers();
});

describe("checkServer: success (S-001-01, S-001-02, S-001-06)", () => {
	it("connects to a Lychee server and reads its version", async () => {
		const deps = server(() => json(version));

		expect(await checkServer("photos.example.com", deps)).toEqual({ kind: "ok", url: "https://photos.example.com", version: "7.11.1" });
		expect(deps.fetch.mock.calls.map((call) => call[0])).toEqual(["https://photos.example.com/", "https://photos.example.com/api/v2/Version"]);
	});

	it("accepts a server that hides its version", async () => {
		const deps = server(() => json({ ...version, version: null }));

		expect(await checkServer("https://photos.example.com", deps)).toEqual({ kind: "ok", url: "https://photos.example.com", version: null });
	});

	it("checks plain http on the local network", async () => {
		const deps = server(() => json(version));

		expect(await checkServer("http://192.168.1.10:8000", deps)).toMatchObject({ kind: "ok", url: "http://192.168.1.10:8000" });
	});
});

describe("checkServer: refused before any request (S-001-03, S-001-07)", () => {
	it.each(["", "   ", "ftp://example.com"])("refuses the address %j", async (input) => {
		const deps = server(() => json(version));

		expect(await checkServer(input, deps)).toEqual({ kind: "invalid_address" });
		expect(deps.fetch).not.toHaveBeenCalled();
	});

	it("refuses plain http to a public host", async () => {
		const deps = server(() => json(version));

		expect(await checkServer("http://photos.example.com", deps)).toEqual({ kind: "insecure_http" });
		expect(deps.fetch).not.toHaveBeenCalled();
	});
});

describe("checkServer: unreachable (S-001-04)", () => {
	it("reports a network error", async () => {
		const deps = server(() => json(version));
		deps.fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

		expect(await checkServer("photos.example.com", deps)).toEqual({ kind: "unreachable" });
	});

	it("gives up after the timeout even if the request ignores the abort signal", async () => {
		vi.useFakeTimers();
		const deps = server(() => new Promise<Response>(() => undefined));

		const result = checkServer("photos.example.com", deps);
		await vi.advanceTimersByTimeAsync(CHECK_TIMEOUT_MS);

		expect(await result).toEqual({ kind: "unreachable" });
		expect(CHECK_TIMEOUT_MS).toBe(10_000);
	});

	it("aborts the request at the timeout", async () => {
		vi.useFakeTimers();
		let signal: AbortSignal | undefined;
		const deps = server(() => new Promise<Response>(() => undefined));
		deps.fetch.mockImplementation(async (url, init) => {
			signal = init?.signal ?? undefined;
			return url.endsWith("/api/v2/Version") ? new Promise<Response>(() => undefined) : new Response("");
		});

		const result = checkServer("photos.example.com", deps);
		await vi.advanceTimersByTimeAsync(CHECK_TIMEOUT_MS);
		await result;

		expect(signal?.aborted).toBe(true);
	});
});

describe("checkServer: not Lychee (S-001-05)", () => {
	it.each([
		["a 404", () => new Response("<html>Not found</html>", { status: 404 })],
		["an HTML page", () => new Response("<html>Hello</html>", { status: 200 })],
		["other JSON", () => json({ name: "something else" })],
		["a version that is not a string", () => json({ ...version, version: 7 })],
		["Lychee's 406 without JSON content type", () => json(error406, 406)],
		["Lychee's 419 without a CSRF token", () => json(error419, 419)],
	])("reports %s as not Lychee", async (_label, response) => {
		expect(await checkServer("photos.example.com", server(response))).toEqual({ kind: "not_lychee" });
	});
});

describe("checkServer: certificate problems (S-001-08)", () => {
	it.each([
		"javax.net.ssl.SSLHandshakeException: java.security.cert.CertPathValidatorException: Trust anchor for certification path not found.",
		"The certificate for this server is invalid. You might be connecting to a server that is pretending to be “photos.example.com”.",
	])("reports %j as a certificate error", async (message) => {
		const deps = server(() => json(version));
		deps.fetch.mockRejectedValueOnce(new Error(message));

		expect(await checkServer("photos.example.com", deps)).toEqual({ kind: "tls_error" });
	});
});
