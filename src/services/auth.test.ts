/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { AUTH_TIMEOUT_MS, readAccount, readOtherMethods, signIn, signOut } from "@/services/auth";
import type { LycheeHttpDeps } from "@/services/lycheeHttp";
import authUser from "@/services/__fixtures__/lychee-7.11.1/auth-user.json";
import authUserGuest from "@/services/__fixtures__/lychee-7.11.1/auth-user-guest.json";
import authConfig from "@/services/__fixtures__/lychee-7.11.1/auth-config.json";
import error401 from "@/services/__fixtures__/lychee-7.11.1/error-401-login.json";

const SERVER = "https://photos.example.com";

type Route = () => Response | Promise<Response>;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const empty = (status = 204) => new Response(null, { status });
const never: Route = () => new Promise<Response>(() => undefined);

/** A server answering each `METHOD path` from `routes`; the root answers HTML. */
function server(routes: Record<string, Route>) {
	const fetch = vi.fn<LycheeHttpDeps["fetch"]>(async (url, init) => {
		if (url === `${SERVER}/`) {
			return new Response("<html></html>");
		}
		const route = routes[`${init?.method ?? "GET"} ${url.replace(`${SERVER}/api/v2/`, "")}`];
		return route === undefined ? new Response("", { status: 404 }) : route();
	});
	const readCookies = vi.fn<LycheeHttpDeps["readCookies"]>(async () => ({ "XSRF-TOKEN": "t" }));
	const clearCookies = vi.fn<LycheeHttpDeps["clearCookies"]>(async () => undefined);
	return { fetch, readCookies, clearCookies };
}

function bodyOf(deps: ReturnType<typeof server>, path: string): unknown {
	const init = deps.fetch.mock.calls.find((c) => c[0] === `${SERVER}/api/v2/${path}`)?.[1];
	return JSON.parse(String(init?.body));
}

afterEach(() => {
	vi.useRealTimers();
});

describe("signIn (FR-002-01)", () => {
	it("signs in and returns the account (S-002-01, S-002-12)", async () => {
		const deps = server({ "POST Auth::login": () => empty(), "GET Auth::user": () => json(authUser) });

		expect(await signIn(SERVER, "photographer", "secret", deps)).toEqual({ kind: "ok", account: { id: 1, username: "photographer" } });
		expect(bodyOf(deps, "Auth::login")).toEqual({ username: "photographer", password: "secret", remember_me: true });
	});

	it("reports wrong credentials on 401 (S-002-02)", async () => {
		const deps = server({ "POST Auth::login": () => json(error401, 401) });

		expect(await signIn(SERVER, "photographer", "wrong", deps)).toEqual({ kind: "wrong_credentials" });
	});

	it("reports the throttle on 429 (S-002-03)", async () => {
		const deps = server({ "POST Auth::login": () => json({ message: "Too Many Attempts." }, 429) });

		expect(await signIn(SERVER, "photographer", "secret", deps)).toEqual({ kind: "throttled" });
	});

	it("reports an unreachable server on a network error (S-002-04)", async () => {
		const deps = server({ "POST Auth::login": () => Promise.reject(new TypeError("Failed to fetch")) });

		expect(await signIn(SERVER, "photographer", "secret", deps)).toEqual({ kind: "unreachable" });
	});

	it("gives up after the timeout (S-002-04, NFR-002-02)", async () => {
		vi.useFakeTimers();
		const deps = server({ "POST Auth::login": never });
		const result = signIn(SERVER, "photographer", "secret", deps);

		await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS);

		expect(await result).toEqual({ kind: "unreachable" });
	});

	it("fails on another status (S-002-05)", async () => {
		const deps = server({ "POST Auth::login": () => json({ message: "Server error" }, 500) });

		expect(await signIn(SERVER, "photographer", "secret", deps)).toEqual({ kind: "failed" });
	});

	it("fails when the server still reports a guest after login (S-002-05)", async () => {
		const deps = server({ "POST Auth::login": () => empty(), "GET Auth::user": () => json(authUserGuest) });

		expect(await signIn(SERVER, "photographer", "secret", deps)).toEqual({ kind: "failed" });
	});
});

describe("readAccount (FR-002-03)", () => {
	it("reads a signed-in account", async () => {
		const deps = server({ "GET Auth::user": () => json(authUser) });

		expect(await readAccount(SERVER, deps)).toEqual({ kind: "ok", account: { id: 1, username: "photographer" } });
	});

	it("reads a guest as no account (S-002-07)", async () => {
		const deps = server({ "GET Auth::user": () => json(authUserGuest) });

		expect(await readAccount(SERVER, deps)).toEqual({ kind: "ok", account: null });
	});

	it.each([
		["a network error", () => Promise.reject(new TypeError("Failed to fetch"))],
		["an error status", () => json({}, 500)],
		["an unexpected payload", () => json({ id: "1" })],
	] as [string, Route][])("fails on %s", async (_, route) => {
		const deps = server({ "GET Auth::user": route });

		expect(await readAccount(SERVER, deps)).toEqual({ kind: "failed" });
	});

	it("fails after the timeout (NFR-002-02)", async () => {
		vi.useFakeTimers();
		const result = readAccount(SERVER, server({ "GET Auth::user": never }));

		await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS);

		expect(await result).toEqual({ kind: "failed" });
	});
});

describe("signOut (FR-002-04, S-002-08)", () => {
	it("logs out and clears the server's cookies", async () => {
		const deps = server({ "POST Auth::logout": () => empty() });

		await signOut(SERVER, deps);

		expect(deps.fetch.mock.calls.some((c) => c[0] === `${SERVER}/api/v2/Auth::logout`)).toBe(true);
		expect(deps.clearCookies).toHaveBeenCalledWith(SERVER);
	});

	it("clears the cookies when the server can't be reached", async () => {
		const deps = server({ "POST Auth::logout": () => Promise.reject(new TypeError("Failed to fetch")) });

		await signOut(SERVER, deps);

		expect(deps.clearCookies).toHaveBeenCalledWith(SERVER);
	});

	it("clears the cookies after the timeout", async () => {
		vi.useFakeTimers();
		const deps = server({ "POST Auth::logout": never });
		const done = signOut(SERVER, deps);

		await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS);
		await done;

		expect(deps.clearCookies).toHaveBeenCalledWith(SERVER);
	});
});

describe("readOtherMethods (FR-002-07, S-002-11)", () => {
	it("reports none for a password-only server", async () => {
		expect(await readOtherMethods(SERVER, server({ "GET Auth::config": () => json(authConfig) }))).toEqual({ oauth: false, passkeys: false });
	});

	it("reports OAuth providers and passkeys", async () => {
		const deps = server({ "GET Auth::config": () => json({ oauthProviders: ["github"], u2f_enabled: true }) });

		expect(await readOtherMethods(SERVER, deps)).toEqual({ oauth: true, passkeys: true });
	});

	it("reports none when the request fails", async () => {
		const deps = server({ "GET Auth::config": () => Promise.reject(new TypeError("Failed to fetch")) });

		expect(await readOtherMethods(SERVER, deps)).toEqual({ oauth: false, passkeys: false });
	});
});
