/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { CHUNK_TIMEOUT_MS, chunkSizeFor, readChunkSize, uploadFile, UPLOAD_CHUNK_CAP } from "@/services/upload";
import { createLycheeHttp, type LycheeHttpDeps } from "@/services/lycheeHttp";
import type { PickedFile } from "@/services/picker";
import limits from "@/services/__fixtures__/lychee-7.11.1/upload-limits.json";
import partial from "@/services/__fixtures__/lychee-7.11.1/upload-meta-partial.json";
import final from "@/services/__fixtures__/lychee-7.11.1/upload-meta-final.json";
import skipped from "@/services/__fixtures__/lychee-7.11.1/error-409-skipped.json";
import rejected from "@/services/__fixtures__/lychee-7.11.1/error-409-rejected.json";
import quota from "@/services/__fixtures__/lychee-7.11.1/error-413-quota.json";
import invalid from "@/services/__fixtures__/lychee-7.11.1/error-422-upload.json";
import error401 from "@/services/__fixtures__/lychee-7.11.1/error-401-album.json";

const SERVER = "https://photos.example.com";
const FILE: PickedFile = { path: "file:///tmp/IMG_1042.HEIC", name: "IMG_1042.HEIC", mimeType: "image/heic", size: 10, modifiedAt: 1760000000000 };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** A server whose `POST Photo` answers from `answers` in order. */
function server(answers: (() => Response | Promise<Response>)[], other: Record<string, () => Response> = {}) {
	const fetch = vi.fn<LycheeHttpDeps["fetch"]>(async (url, init) => {
		if (url === `${SERVER}/`) {
			return new Response("<html></html>");
		}
		const path = url.replace(`${SERVER}/api/v2/`, "");
		if (path === "Photo" && init?.method === "POST") {
			const answer = answers.shift();
			return answer === undefined ? json({}, 500) : answer();
		}
		return other[path]?.() ?? new Response("", { status: 404 });
	});
	const deps = { fetch, readCookies: vi.fn(async () => ({ "XSRF-TOKEN": "t" })), clearCookies: vi.fn(async () => undefined) };
	return { http: createLycheeHttp(SERVER, deps), fetch };
}

/** The FormData fields of each upload request, as plain values. */
function sentForms(fetch: ReturnType<typeof server>["fetch"]): Record<string, string>[] {
	return fetch.mock.calls
		.filter((call) => call[0] === `${SERVER}/api/v2/Photo`)
		.map((call) => {
			const form = call[1]?.body as FormData;
			return Object.fromEntries([...form.entries()].map(([key, value]) => [key, typeof value === "string" ? value : `<${value.size} bytes>`]));
		});
}

async function* chunksOf(...sizes: number[]): AsyncGenerator<Uint8Array<ArrayBuffer>> {
	for (const size of sizes) {
		yield new Uint8Array(size);
	}
}

afterEach(() => {
	vi.useRealTimers();
});

describe("chunk size (FR-005-03)", () => {
	it("caps the server's chunk size at 4 MiB", () => {
		expect(chunkSizeFor(10 * 1024 * 1024)).toBe(UPLOAD_CHUNK_CAP);
		expect(chunkSizeFor(2 * 1024 * 1024)).toBe(2 * 1024 * 1024);
	});

	it("reads the server's limits", async () => {
		const { http } = server([], { "Gallery::getUploadLimits": () => json(limits) });

		expect(await readChunkSize(http)).toBe(UPLOAD_CHUNK_CAP);
	});

	it("falls back to 1 MiB when the limits can't be read", async () => {
		const { http } = server([], { "Gallery::getUploadLimits": () => json({}, 500) });

		expect(await readChunkSize(http)).toBe(1024 * 1024);
	});
});

describe("uploadFile (FR-005-03, S-005-01, S-005-02)", () => {
	it("sends every chunk with its fields and echoes uuid_name and extension", async () => {
		const middle = { ...partial, chunk_number: 2 };
		const { http, fetch } = server([() => json(partial), () => json(middle), () => json(final)]);
		const progress: number[] = [];

		const result = await uploadFile(http, { ...FILE, size: 10 }, "a1", 4, chunksOf(4, 4, 2), (sent) => progress.push(sent));

		expect(result).toEqual({ kind: "done" });
		expect(progress).toEqual([4, 8, 10]);
		const forms = sentForms(fetch);
		expect(forms).toHaveLength(3);
		expect(forms[0]).toEqual({
			album_id: "a1",
			file: "<4 bytes>",
			file_name: "IMG_1042.HEIC",
			file_last_modified_time: "1760000000000",
			chunk_number: "1",
			total_chunks: "3",
			uuid_name: "",
			extension: "",
		});
		expect(forms[1]).toMatchObject({ chunk_number: "2", uuid_name: "Qx3vT9mP2kLw8rYz.HEIC", extension: ".HEIC" });
		expect(forms[2]).toMatchObject({ chunk_number: "3", file: "<2 bytes>" });
	});

	it("sends the file part with the file's name and type", async () => {
		const { http, fetch } = server([() => json({ ...final, chunk_number: 1, total_chunks: 1 })]);

		await uploadFile(http, { ...FILE, size: 3 }, "a1", 4, chunksOf(3), () => undefined);

		const form = fetch.mock.calls[1][1]?.body;
		const file = (form instanceof FormData ? form.get("file") : null) as File;
		expect(file.name).toBe("IMG_1042.HEIC");
		expect(file.type).toBe("image/heic");
	});

	it("sends an empty album id for Unsorted (S-005-08)", async () => {
		const { http, fetch } = server([() => json({ ...final, chunk_number: 1, total_chunks: 1 })]);

		await uploadFile(http, { ...FILE, size: 3 }, null, 4, chunksOf(3), () => undefined);

		expect(sentForms(fetch)[0].album_id).toBe("");
	});

	it("doesn't send an empty file (S-005-12)", async () => {
		const { http, fetch } = server([]);

		expect(await uploadFile(http, { ...FILE, size: 0 }, "a1", 4, chunksOf(), () => undefined)).toEqual({ kind: "empty" });
		expect(sentForms(fetch)).toHaveLength(0);
	});
});

describe("uploadFile failures (FR-005-03, S-005-03 … 06)", () => {
	it.each([
		["a duplicate", () => json(skipped, 409), { kind: "skipped" }],
		["a rejected photo", () => json(rejected, 409), { kind: "rejected", message: "The photo has been rejected" }],
		["a full quota", () => json(quota, 413), { kind: "quota" }],
		["the web server's size limit", () => new Response("<html>413</html>", { status: 413 }), { kind: "too_large" }],
		["a validation error", () => json(invalid, 422), { kind: "rejected", message: "The file name field is required." }],
		["an ended session", () => json(error401, 401), { kind: "unauthenticated" }],
		["a server error", () => json({ message: "boom" }, 500), { kind: "failed" }],
		["a network error", () => Promise.reject(new TypeError("Failed to fetch")), { kind: "interrupted" }],
	] as [string, () => Response | Promise<Response>, unknown][])("maps %s", async (_, answer, expected) => {
		const { http } = server([answer]);

		expect(await uploadFile(http, { ...FILE, size: 3 }, "a1", 4, chunksOf(3), () => undefined)).toEqual(expected);
	});

	it("is interrupted when a chunk gets no answer in time (NFR-005-05)", async () => {
		vi.useFakeTimers();
		const { http } = server([() => new Promise<Response>(() => undefined)]);
		const result = uploadFile(http, { ...FILE, size: 3 }, "a1", 4, chunksOf(3), () => undefined);

		await vi.advanceTimersByTimeAsync(CHUNK_TIMEOUT_MS);

		expect(await result).toEqual({ kind: "interrupted" });
	});

	it("stops at the first failing chunk", async () => {
		const { http, fetch } = server([() => json(partial), () => json({ message: "boom" }, 500)]);

		await uploadFile(http, { ...FILE, size: 10 }, "a1", 4, chunksOf(4, 4, 2), () => undefined);

		expect(sentForms(fetch)).toHaveLength(2);
	});

	it("reports an unreadable file", async () => {
		const { http } = server([]);
		const broken: AsyncIterable<Uint8Array<ArrayBuffer>> = {
			[Symbol.asyncIterator]: () => ({ next: () => Promise.reject(new Error("read failed")) }),
		};

		expect(await uploadFile(http, { ...FILE, size: 3 }, "a1", 4, broken, () => undefined)).toEqual({ kind: "unreadable" });
	});

	it("is interrupted when the file ends before its last chunk", async () => {
		const { http } = server([() => json(partial)]);

		expect(await uploadFile(http, { ...FILE, size: 10 }, "a1", 4, chunksOf(4), () => undefined)).toEqual({ kind: "interrupted" });
	});
});
