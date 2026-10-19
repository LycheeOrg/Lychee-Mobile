/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { TIMED_OUT, withTimeout } from "@/services/timeout";

afterEach(() => {
	vi.useRealTimers();
});

describe("withTimeout (NFR-001-01, NFR-002-02)", () => {
	it("resolves with the work's result", async () => {
		expect(await withTimeout(async () => 42, 1000)).toBe(42);
	});

	it("passes a signal that is not aborted while the work runs", async () => {
		let signal: AbortSignal | undefined;
		await withTimeout(async (s) => {
			signal = s;
		}, 1000);

		expect(signal?.aborted).toBe(false);
	});

	it("resolves with TIMED_OUT and aborts the signal when the work never answers", async () => {
		vi.useFakeTimers();
		let signal: AbortSignal | undefined;
		const result = withTimeout((s) => {
			signal = s;
			return new Promise<number>(() => undefined);
		}, 1000);

		await vi.advanceTimersByTimeAsync(1000);

		expect(await result).toBe(TIMED_OUT);
		expect(signal?.aborted).toBe(true);
	});

	it("propagates the work's error", async () => {
		await expect(withTimeout(() => Promise.reject(new TypeError("Failed to fetch")), 1000)).rejects.toThrow("Failed to fetch");
	});
});
