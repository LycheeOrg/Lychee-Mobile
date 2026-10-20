/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { reactive, readonly } from "vue";

/**
 * FR-007-01, DO-007-01: selection mode of an album's photo grid. Photos are
 * kept in the order they were selected.
 */
export function createPhotoSelection() {
	const state = reactive({ active: false, ids: [] as string[] });

	function start(id?: string): void {
		state.active = true;
		state.ids = id === undefined ? [] : [id];
	}

	function toggle(id: string): void {
		if (!state.active) {
			return;
		}
		state.ids = state.ids.includes(id) ? state.ids.filter((selected) => selected !== id) : [...state.ids, id];
	}

	function clear(): void {
		state.active = false;
		state.ids = [];
	}

	return {
		state: readonly(state),
		start,
		toggle,
		clear,
		isSelected: (id: string) => state.ids.includes(id),
		ids: () => [...state.ids],
		count: () => state.ids.length,
	};
}

export type PhotoSelection = ReturnType<typeof createPhotoSelection>;
