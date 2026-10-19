/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { rangeChunks, streamChunks } from "@/services/fileChunks";

const URL = "capacitor://localhost/_capacitor_file_/tmp/IMG.HEIC";

async function collect(chunks: AsyncIterable<Uint8Array>): Promise<number[][]> {
	const result: number[][] = [];
	for await (const chunk of chunks) {
		result.push([...chunk]);
	}
	return result;
}

/** A file of `size` bytes 0, 1, 2, … served by range, like Capacitor's iOS handler. */
function rangeServer(size: number) {
	const bytes = Uint8Array.from({ length: size }, (_, i) => i % 256);
	return vi.fn(async (_url: string, init?: RequestInit) => {
		const [, from, to] = /bytes=(\d+)-(\d+)/.exec(new Headers(init?.headers).get("Range") ?? "") ?? [];
		return new Response(bytes.slice(Number(from), Number(to) + 1), { status: 206 });
	});
}

/** A response whose body arrives in the given pieces, like Capacitor's Android handler. */
function streamServer(pieces: number[][]) {
	return vi.fn(async () => {
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				pieces.forEach((piece) => controller.enqueue(Uint8Array.from(piece)));
				controller.close();
			},
		});
		return new Response(body);
	});
}

describe("rangeChunks (FR-005-06, iOS)", () => {
	it("reads the file one exact range per chunk", async () => {
		const fetch = rangeServer(10);

		expect(await collect(rangeChunks(fetch, URL, 10, 4))).toEqual([
			[0, 1, 2, 3],
			[4, 5, 6, 7],
			[8, 9],
		]);
		expect(fetch.mock.calls.map((call) => new Headers(call[1]?.headers).get("Range"))).toEqual(["bytes=0-3", "bytes=4-7", "bytes=8-9"]);
	});

	it("fails on a short read", async () => {
		const fetch = vi.fn(async () => new Response(new Uint8Array(2), { status: 206 }));

		await expect(collect(rangeChunks(fetch, URL, 10, 4))).rejects.toThrow();
	});

	it("fails on an error status", async () => {
		const fetch = vi.fn(async () => new Response("", { status: 404 }));

		await expect(collect(rangeChunks(fetch, URL, 10, 4))).rejects.toThrow();
	});
});

describe("streamChunks (FR-005-06, Android)", () => {
	it("regroups uneven body pieces into chunks", async () => {
		const fetch = streamServer([[0, 1], [2, 3, 4, 5, 6], [7], [8, 9]]);

		expect(await collect(streamChunks(fetch, URL, 4))).toEqual([
			[0, 1, 2, 3],
			[4, 5, 6, 7],
			[8, 9],
		]);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it("yields nothing for an empty body", async () => {
		expect(await collect(streamChunks(streamServer([]), URL, 4))).toEqual([]);
	});

	it("fails on an error status", async () => {
		const fetch = vi.fn(async () => new Response("", { status: 404 }));

		await expect(collect(streamChunks(fetch, URL, 4))).rejects.toThrow();
	});
});
