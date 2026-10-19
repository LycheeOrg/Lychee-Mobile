/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { Capacitor } from "@capacitor/core";

/** A piece of a file, ready to go into a `Blob`. */
export type Chunk = Uint8Array<ArrayBuffer>;

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * FR-005-06 (iOS): one `Range` request per chunk; Capacitor's iOS file
 * handler seeks and returns exactly that slice, so only one chunk is read.
 */
export async function* rangeChunks(fetch: Fetch, url: string, size: number, chunkSize: number): AsyncGenerator<Chunk> {
	for (let start = 0; start < size; start += chunkSize) {
		const end = Math.min(start + chunkSize, size) - 1;
		const response = await fetch(url, { headers: { Range: `bytes=${start}-${end}` } });
		if (!response.ok) {
			throw new Error(`Reading the file failed (${response.status}).`);
		}
		const chunk = new Uint8Array(await response.arrayBuffer());
		if (chunk.byteLength !== end - start + 1) {
			throw new Error("Short read.");
		}
		yield chunk;
	}
}

/**
 * FR-005-06 (Android): one request whose body is consumed as a stream and
 * regrouped into chunks; Capacitor's Android handler ignores where a range
 * starts, so ranges can't be used.
 */
export async function* streamChunks(fetch: Fetch, url: string, chunkSize: number): AsyncGenerator<Chunk> {
	const response = await fetch(url);
	if (!response.ok || response.body === null) {
		throw new Error(`Reading the file failed (${response.status}).`);
	}
	const reader = response.body.getReader();
	let buffer: Chunk = new Uint8Array(chunkSize);
	let filled = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		let offset = 0;
		while (offset < value.byteLength) {
			const take = Math.min(chunkSize - filled, value.byteLength - offset);
			buffer.set(value.subarray(offset, offset + take), filled);
			filled += take;
			offset += take;
			if (filled === chunkSize) {
				yield buffer;
				buffer = new Uint8Array(chunkSize);
				filled = 0;
			}
		}
	}
	if (filled > 0) {
		yield buffer.slice(0, filled);
	}
}

/** The reader for this platform, over the WebView's local URL for `path`. */
export function chunksOfFile(path: string, size: number, chunkSize: number): AsyncGenerator<Chunk> {
	const url = Capacitor.convertFileSrc(path);
	const localFetch: Fetch = (input, init) => fetch(input, init);
	return Capacitor.getPlatform() === "ios" ? rangeChunks(localFetch, url, size, chunkSize) : streamChunks(localFetch, url, chunkSize);
}
