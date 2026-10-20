/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { rootBackHandler } from "@/utils/backButton";

describe("rootBackHandler (FR-009-01)", () => {
	it("closes the app on the album list (S-009-01, S-009-02)", () => {
		const exit = vi.fn();
		const next = vi.fn();

		rootBackHandler(() => "albums", exit)(next);

		expect(exit).toHaveBeenCalledTimes(1);
		expect(next).not.toHaveBeenCalled();
	});

	it.each(["album", "settings", "login", undefined])("hands back on %s to the router", (route) => {
		const exit = vi.fn();
		const next = vi.fn();

		rootBackHandler(() => route, exit)(next);

		expect(exit).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalledTimes(1);
	});

	it("reads the route when back is pressed, not when registered", () => {
		let route = "settings";
		const exit = vi.fn();
		const handler = rootBackHandler(() => route, exit);

		route = "albums";
		handler(vi.fn());

		expect(exit).toHaveBeenCalledTimes(1);
	});
});
