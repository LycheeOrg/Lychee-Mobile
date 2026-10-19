/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { meetsMinimumVersion } from "@/utils/version";

describe("meetsMinimumVersion (FR-003-04)", () => {
	it.each([
		["7.11.1", true],
		["7.1.0", true],
		["8.0.0", true],
		["7.0.9", false],
		["6.10.2", false],
		["7.1", true],
		["7.1.0-rc.1", true],
		["v7.2.0", true],
	])("%s against 7.1.0 → %s", (version, expected) => {
		expect(meetsMinimumVersion(version, "7.1.0")).toBe(expected);
	});

	it("tries a hidden version", () => {
		expect(meetsMinimumVersion(null, "7.1.0")).toBe(true);
	});

	it("tries a version it can't read", () => {
		expect(meetsMinimumVersion("nightly", "7.1.0")).toBe(true);
	});
});
