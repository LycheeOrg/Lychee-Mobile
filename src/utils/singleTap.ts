/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

/**
 * FR-004-07: Swiper reports `tap` for each tap of a double tap, so a single
 * tap is only reported once the double-tap window passed without one.
 */
export function createSingleTap(onSingle: () => void, windowMs = 300) {
	let timer: ReturnType<typeof setTimeout> | undefined;

	function dispose(): void {
		clearTimeout(timer);
		timer = undefined;
	}

	return {
		tap() {
			dispose();
			timer = setTimeout(() => {
				timer = undefined;
				onSingle();
			}, windowMs);
		},
		doubleTap: dispose,
		dispose,
	};
}
