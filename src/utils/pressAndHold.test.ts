/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createPressAndHold } from "@/utils/pressAndHold";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

function setup() {
	const onStart = vi.fn();
	const onEnd = vi.fn();
	return { hold: createPressAndHold({ onStart, onEnd }), onStart, onEnd };
}

describe("createPressAndHold (FR-004-06, S-004-06)", () => {
	it("starts after 300 ms and ends on release", () => {
		const { hold, onStart, onEnd } = setup();
		hold.down(10, 10);

		vi.advanceTimersByTime(299);
		expect(onStart).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(onStart).toHaveBeenCalledTimes(1);

		hold.up();
		expect(onEnd).toHaveBeenCalledTimes(1);
	});

	it("does nothing for a short tap", () => {
		const { hold, onStart, onEnd } = setup();
		hold.down(10, 10);
		vi.advanceTimersByTime(100);
		hold.up();
		vi.advanceTimersByTime(500);

		expect(onStart).not.toHaveBeenCalled();
		expect(onEnd).not.toHaveBeenCalled();
	});

	it("tolerates small movement", () => {
		const { hold, onStart } = setup();
		hold.down(10, 10);
		hold.move(18, 14);
		vi.advanceTimersByTime(300);

		expect(onStart).toHaveBeenCalled();
	});

	it("gives up when the finger moves before the delay (a swipe)", () => {
		const { hold, onStart } = setup();
		hold.down(10, 10);
		hold.move(25, 10);
		vi.advanceTimersByTime(300);

		expect(onStart).not.toHaveBeenCalled();
	});

	it("ends a running hold when the finger moves away", () => {
		const { hold, onEnd } = setup();
		hold.down(10, 10);
		vi.advanceTimersByTime(300);
		hold.move(10, 40);

		expect(onEnd).toHaveBeenCalledTimes(1);
		hold.up();
		expect(onEnd).toHaveBeenCalledTimes(1);
	});

	it("ends on cancel", () => {
		const { hold, onEnd } = setup();
		hold.down(10, 10);
		vi.advanceTimersByTime(300);
		hold.cancel();

		expect(onEnd).toHaveBeenCalledTimes(1);
	});
});
