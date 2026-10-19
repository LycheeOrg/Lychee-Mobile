/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

type PressAndHoldOptions = {
	onStart: () => void;
	onEnd: () => void;
	delayMs?: number;
	tolerancePx?: number;
};

export type PressAndHold = {
	down: (x: number, y: number) => void;
	move: (x: number, y: number) => void;
	up: () => void;
	cancel: () => void;
};

/**
 * FR-004-06: press and hold for `delayMs` without moving more than
 * `tolerancePx` starts; releasing, cancelling or moving away ends. Pointer
 * coordinates are passed in, so it works with any event source.
 */
export function createPressAndHold({ onStart, onEnd, delayMs = 300, tolerancePx = 10 }: PressAndHoldOptions): PressAndHold {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let origin: { x: number; y: number } | null = null;
	let holding = false;

	function stop(): void {
		clearTimeout(timer);
		timer = undefined;
		origin = null;
		if (holding) {
			holding = false;
			onEnd();
		}
	}

	return {
		down(x, y) {
			stop();
			origin = { x, y };
			timer = setTimeout(() => {
				timer = undefined;
				holding = true;
				onStart();
			}, delayMs);
		},
		move(x, y) {
			if (origin !== null && Math.hypot(x - origin.x, y - origin.y) > tolerancePx) {
				stop();
			}
		},
		up: stop,
		cancel: stop,
	};
}
