/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { normalizeServerUrl } from "@/utils/serverUrl";

describe("normalizeServerUrl", () => {
	it("assumes https when no scheme is given", () => {
		expect(normalizeServerUrl("photos.example.com")).toBe("https://photos.example.com");
	});

	it("keeps an explicit http scheme and port", () => {
		expect(normalizeServerUrl("http://192.168.1.10:8000")).toBe("http://192.168.1.10:8000");
	});

	it("keeps a sub-path and drops trailing slashes", () => {
		expect(normalizeServerUrl("  https://example.com/lychee///  ")).toBe("https://example.com/lychee");
	});

	it("drops the query and fragment", () => {
		expect(normalizeServerUrl("https://example.com/gallery?album=1#top")).toBe("https://example.com/gallery");
	});

	it("rejects empty input", () => {
		expect(normalizeServerUrl("   ")).toBeNull();
	});

	it("rejects other schemes", () => {
		expect(normalizeServerUrl("ftp://example.com")).toBeNull();
	});

	it("rejects input that is not a URL", () => {
		expect(normalizeServerUrl("https://")).toBeNull();
	});
});
