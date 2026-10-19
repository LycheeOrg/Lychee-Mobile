/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { isLocalNetworkHost } from "@/utils/networkPolicy";

describe("isLocalNetworkHost (ADR-001-02)", () => {
	it.each([
		"localhost",
		"LOCALHOST",
		"nas.local",
		"photos.home.local",
		"127.0.0.1",
		"10.0.0.5",
		"10.255.255.255",
		"172.16.0.1",
		"172.31.255.254",
		"192.168.1.10",
	])("accepts %s", (host) => {
		expect(isLocalNetworkHost(host)).toBe(true);
	});

	it.each([
		"photos.example.com",
		"local",
		"example.local.com",
		"8.8.8.8",
		"172.15.255.255",
		"172.32.0.1",
		"192.169.1.1",
		"11.0.0.1",
		"100.64.0.1",
		"10.0.0",
		"10.0.0.256",
		"",
	])("refuses %s", (host) => {
		expect(isLocalNetworkHost(host)).toBe(false);
	});
});
