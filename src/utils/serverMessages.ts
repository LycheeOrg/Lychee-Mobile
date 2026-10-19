/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import type { ServerFailure } from "@/services/server";

const FAILURE_MESSAGES: Record<ServerFailure, string> = {
	invalid_address: "Enter an address like photos.example.com.",
	insecure_http: "Plain http is only allowed for local network addresses. Use https.",
	unreachable: "Can't reach this server. Check the address and your network.",
	not_lychee: "This address doesn't answer like a Lychee server.",
	tls_error: "The server's certificate isn't trusted.",
};

/** UI-001-03: the message shown for a failed check. */
export function failureMessage(kind: ServerFailure): string {
	return FAILURE_MESSAGES[kind];
}

/** UI-001-02: the line shown once connected. */
export function connectedMessage(version: string | null): string {
	return version === null ? "Connected to Lychee" : `Connected to Lychee ${version}`;
}
