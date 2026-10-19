/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { connectedMessage, failureMessage } from "@/utils/serverMessages";
import type { ServerFailure } from "@/services/server";

describe("server messages (UI-001-02, UI-001-03)", () => {
	it.each<ServerFailure>(["invalid_address", "insecure_http", "unreachable", "not_lychee", "tls_error"])(
		"has a distinct message for %s",
		(kind) => {
			expect(failureMessage(kind)).not.toBe("");
		},
	);

	it("gives every failure its own message", () => {
		const kinds: ServerFailure[] = ["invalid_address", "insecure_http", "unreachable", "not_lychee", "tls_error"];
		expect(new Set(kinds.map(failureMessage)).size).toBe(kinds.length);
	});

	it("names the version when the server shows it", () => {
		expect(connectedMessage("7.11.1")).toBe("Connected to Lychee 7.11.1");
		expect(connectedMessage(null)).toBe("Connected to Lychee");
	});
});
