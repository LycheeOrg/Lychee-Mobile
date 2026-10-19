/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createSingleTap } from "@/utils/singleTap";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("createSingleTap (FR-004-07)", () => {
	it("reports a single tap after the double-tap window", () => {
		const onSingle = vi.fn();
		const taps = createSingleTap(onSingle);

		taps.tap();
		vi.advanceTimersByTime(299);
		expect(onSingle).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(onSingle).toHaveBeenCalledTimes(1);
	});

	it("drops both taps of a double tap (zoom)", () => {
		const onSingle = vi.fn();
		const taps = createSingleTap(onSingle);

		taps.tap();
		vi.advanceTimersByTime(150);
		taps.tap();
		taps.doubleTap();
		vi.advanceTimersByTime(500);

		expect(onSingle).not.toHaveBeenCalled();
	});

	it("stops a pending tap on dispose", () => {
		const onSingle = vi.fn();
		const taps = createSingleTap(onSingle);

		taps.tap();
		taps.dispose();
		vi.advanceTimersByTime(500);

		expect(onSingle).not.toHaveBeenCalled();
	});
});
