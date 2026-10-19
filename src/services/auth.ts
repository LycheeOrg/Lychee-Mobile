/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { createLycheeHttp, nativeDeps, readJson, type LycheeHttpDeps } from "@/services/lycheeHttp";
import { TIMED_OUT, withTimeout } from "@/services/timeout";

/** NFR-002-02: each auth request finishes within this. */
export const AUTH_TIMEOUT_MS = 10_000;

/** DO-002-01. */
export type Account = { id: number; username: string };

export type SignInFailure = "wrong_credentials" | "throttled" | "unreachable" | "failed";

/** DO-002-02. */
export type SignInResult = { kind: "ok"; account: Account } | { kind: SignInFailure };

/** The account on the server: `null` for a guest. */
export type AccountRead = { kind: "ok"; account: Account | null } | { kind: "failed" };

export type OtherMethods = { oauth: boolean; passkeys: boolean };

const FAILURE_BY_STATUS: Record<number, SignInFailure> = { 401: "wrong_credentials", 429: "throttled" };

/**
 * Signs in with `remember_me`, so Lychee's cookies keep the session across
 * launches (FR-002-01, ADR-002-01), then reads the account it belongs to.
 * The password goes into this one request and nowhere else (NFR-002-01).
 */
export async function signIn(server: string, username: string, password: string, deps: LycheeHttpDeps = nativeDeps): Promise<SignInResult> {
	const http = createLycheeHttp(server, deps);
	try {
		const result = await withTimeout(async (signal): Promise<SignInResult> => {
			const login = await http.post("Auth::login", { username, password, remember_me: true }, signal);
			if (!login.ok) {
				return { kind: FAILURE_BY_STATUS[login.status] ?? "failed" };
			}
			const account = await fetchAccount(http.get("Auth::user", signal));
			return account === null || account === undefined ? { kind: "failed" } : { kind: "ok", account };
		}, AUTH_TIMEOUT_MS);
		return result === TIMED_OUT ? { kind: "unreachable" } : result;
	} catch {
		return { kind: "unreachable" };
	}
}

/** Who the server's session belongs to (FR-002-03). */
export async function readAccount(server: string, deps: LycheeHttpDeps = nativeDeps): Promise<AccountRead> {
	const http = createLycheeHttp(server, deps);
	try {
		const account = await withTimeout((signal) => fetchAccount(http.get("Auth::user", signal)), AUTH_TIMEOUT_MS);
		return account === TIMED_OUT || account === undefined ? { kind: "failed" } : { kind: "ok", account };
	} catch {
		return { kind: "failed" };
	}
}

/**
 * Ends the session on the server and forgets the server's cookies, which
 * signs the app out even when the server can't be reached (FR-002-04).
 */
export async function signOut(server: string, deps: LycheeHttpDeps = nativeDeps): Promise<void> {
	const http = createLycheeHttp(server, deps);
	try {
		await withTimeout((signal) => http.post("Auth::logout", {}, signal), AUTH_TIMEOUT_MS);
	} catch {
		// Signed out locally regardless.
	} finally {
		await http.clearCookies();
	}
}

/** Sign-in methods the server offers besides passwords (FR-002-07). */
export async function readOtherMethods(server: string, deps: LycheeHttpDeps = nativeDeps): Promise<OtherMethods> {
	const none = { oauth: false, passkeys: false };
	const http = createLycheeHttp(server, deps);
	try {
		const payload = await withTimeout(async (signal) => readJson(await http.get("Auth::config", signal)), AUTH_TIMEOUT_MS);
		return methodsOf(payload) ?? none;
	} catch {
		return none;
	}
}

/** The account of an `Auth::user` response; `null` for a guest, `undefined` when unusable. */
async function fetchAccount(request: Promise<Response>): Promise<Account | null | undefined> {
	const response = await request;
	return response.ok ? accountOf(await readJson(response)) : undefined;
}

function accountOf(payload: unknown): Account | null | undefined {
	if (typeof payload !== "object" || payload === null) {
		return undefined;
	}
	const { id, username } = payload as Record<string, unknown>;
	if (id === null) {
		return null;
	}
	return Number.isInteger(id) && typeof username === "string" ? { id: id as number, username } : undefined;
}

function methodsOf(payload: unknown): OtherMethods | undefined {
	if (typeof payload !== "object" || payload === null) {
		return undefined;
	}
	const { oauthProviders, u2f_enabled } = payload as Record<string, unknown>;
	return { oauth: Array.isArray(oauthProviders) && oauthProviders.length > 0, passkeys: u2f_enabled === true };
}
