/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

/** What {@link withTimeout} resolves with when the limit passes first. */
export const TIMED_OUT = Symbol("timed out");

/**
 * Runs `work` with an abort signal and resolves with its result, or with
 * {@link TIMED_OUT} after `ms` (aborting the signal). The native stack may
 * ignore the signal, so the timer is raced as well.
 */
export async function withTimeout<T>(work: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
		timer = setTimeout(() => {
			controller.abort();
			resolve(TIMED_OUT);
		}, ms);
	});

	try {
		return await Promise.race([work(controller.signal), timeout]);
	} finally {
		clearTimeout(timer);
	}
}
