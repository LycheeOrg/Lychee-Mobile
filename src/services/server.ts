/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { createLycheeHttp, nativeDeps, type LycheeHttpDeps } from "@/services/lycheeHttp";
import { isLocalNetworkHost } from "@/utils/networkPolicy";
import { normalizeServerUrl } from "@/utils/serverUrl";

/** NFR-001-01: a check never takes longer than this. */
export const CHECK_TIMEOUT_MS = 10_000;

export type ServerFailure = "invalid_address" | "insecure_http" | "unreachable" | "not_lychee" | "tls_error";

/** DO-001-01. */
export type ServerCheckResult = { kind: "ok"; url: string; version: string | null } | { kind: ServerFailure };

const TIMED_OUT = Symbol("timed out");
const TLS_ERROR = /certificat|ssl|tls|trust anchor|handshake/i;

/**
 * Checks that `input` is a usable Lychee server (FR-001-01): a valid address,
 * plain http only on the local network (ADR-001-02), and `/api/v2/Version`
 * answering like Lychee does, within {@link CHECK_TIMEOUT_MS}.
 */
export async function checkServer(input: string, deps: LycheeHttpDeps = nativeDeps): Promise<ServerCheckResult> {
	const url = normalizeServerUrl(input);
	if (url === null) {
		return { kind: "invalid_address" };
	}
	if (!isAllowedScheme(url)) {
		return { kind: "insecure_http" };
	}

	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
		timer = setTimeout(() => {
			controller.abort();
			resolve(TIMED_OUT);
		}, CHECK_TIMEOUT_MS);
	});

	try {
		// The native stack may ignore the abort signal: race a timer as well.
		const response = await Promise.race([createLycheeHttp(url, deps).get("Version", controller.signal), timeout]);
		if (response === TIMED_OUT) {
			return { kind: "unreachable" };
		}

		const version = response.ok ? versionOf(await readJson(response)) : undefined;
		return version === undefined ? { kind: "not_lychee" } : { kind: "ok", url, version };
	} catch (error) {
		return { kind: classifyFailure(error) };
	} finally {
		clearTimeout(timer);
	}
}

/** https anywhere, plain http only for local-network hosts. */
function isAllowedScheme(url: string): boolean {
	const { protocol, hostname } = new URL(url);
	return protocol === "https:" || isLocalNetworkHost(hostname);
}

async function readJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return undefined;
	}
}

/**
 * The version from a `/api/v2/Version` payload: a string, `null` when the
 * server hides it, or `undefined` when the payload is not Lychee's.
 */
function versionOf(payload: unknown): string | null | undefined {
	if (typeof payload !== "object" || payload === null) {
		return undefined;
	}

	const { version, is_new_release_available, is_git_update_available } = payload as Record<string, unknown>;
	const isLychee =
		typeof is_new_release_available === "boolean" &&
		typeof is_git_update_available === "boolean" &&
		(typeof version === "string" || version === null);
	return isLychee ? (version as string | null) : undefined;
}

/** Native stacks report certificate problems only through their messages. */
function classifyFailure(error: unknown): ServerFailure {
	const message = error instanceof Error ? error.message : String(error);
	return TLS_ERROR.test(message) ? "tls_error" : "unreachable";
}
