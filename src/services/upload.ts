/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { readJson, type LycheeHttp } from "@/services/lycheeHttp";
import type { Chunk } from "@/services/fileChunks";
import type { PickedFile } from "@/services/picker";
import { TIMED_OUT, withTimeout } from "@/services/timeout";

/** NFR-005-01: never more than this in one request (CapacitorHttp base64-encodes it in memory). */
export const UPLOAD_CHUNK_CAP = 4 * 1024 * 1024;
/** Lychee's own fallback when it can't tell its limit. */
const FALLBACK_CHUNK_SIZE = 1024 * 1024;
/** NFR-005-05. */
export const CHUNK_TIMEOUT_MS = 60_000;

/** DO-005-02. */
export type UploadResult =
	| { kind: "done"; withoutLocation?: true }
	| { kind: "skipped" | "quota" | "too_large" | "empty" | "interrupted" | "unreadable" | "unauthenticated" | "failed" }
	| { kind: "rejected"; message: string };

type Meta = { uuidName: string; extension: string; chunkNumber: number; totalChunks: number };

export function chunkSizeFor(serverChunkSize: number): number {
	return Math.min(serverChunkSize, UPLOAD_CHUNK_CAP);
}

/** FR-005-03: the chunk size for this server. */
export async function readChunkSize(http: LycheeHttp): Promise<number> {
	try {
		const response = await withTimeout((signal) => http.get("Gallery::getUploadLimits", signal), CHUNK_TIMEOUT_MS);
		const payload = response === TIMED_OUT || !response.ok ? undefined : await readJson(response);
		const size = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>).upload_chunk_size : undefined;
		return typeof size === "number" && size > 0 ? chunkSizeFor(size) : FALLBACK_CHUNK_SIZE;
	} catch {
		return FALLBACK_CHUNK_SIZE;
	}
}

/**
 * FR-005-03: uploads `file` into `albumId` (`null` for Unsorted) in chunks
 * read from `chunks`, one request at a time; `onProgress` gets the bytes
 * sent so far. The bytes are sent as read, unchanged (NFR-005-04).
 */
export async function uploadFile(
	http: LycheeHttp,
	file: PickedFile,
	albumId: string | null,
	chunkSize: number,
	chunks: AsyncIterable<Chunk>,
	onProgress: (sent: number) => void,
): Promise<UploadResult> {
	if (file.size === 0) {
		return { kind: "empty" };
	}
	const totalChunks = Math.ceil(file.size / chunkSize);
	const reader = chunks[Symbol.asyncIterator]();
	let meta: Meta = { uuidName: "", extension: "", chunkNumber: 0, totalChunks };
	let sent = 0;

	for (let chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber += 1) {
		const chunk = await nextChunk(reader);
		if (chunk === "unreadable") {
			return { kind: "unreadable" };
		}
		if (chunk === "ended") {
			return { kind: "interrupted" };
		}
		const answer = await sendChunk(http, formFor(file, albumId, chunk, chunkNumber, totalChunks, meta));
		if ("kind" in answer) {
			return answer;
		}
		meta = answer;
		sent += chunk.byteLength;
		onProgress(sent);
		if (meta.chunkNumber >= meta.totalChunks) {
			return { kind: "done" };
		}
	}
	return { kind: "failed" };
}

async function nextChunk(reader: AsyncIterator<Chunk>): Promise<Chunk | "ended" | "unreadable"> {
	try {
		const { done, value } = await reader.next();
		return done === true ? "ended" : value;
	} catch {
		return "unreadable";
	}
}

function formFor(file: PickedFile, albumId: string | null, chunk: Chunk, chunkNumber: number, totalChunks: number, meta: Meta): FormData {
	const form = new FormData();
	form.append("album_id", albumId ?? "");
	form.append("file", new Blob([chunk], { type: file.mimeType }), file.name);
	form.append("file_name", file.name);
	form.append("file_last_modified_time", file.modifiedAt === null ? "" : String(file.modifiedAt));
	form.append("chunk_number", String(chunkNumber));
	form.append("total_chunks", String(totalChunks));
	form.append("uuid_name", meta.uuidName);
	form.append("extension", meta.extension);
	return form;
}

/** One chunk request: the server's upload meta, or the result that ends the file. */
async function sendChunk(http: LycheeHttp, form: FormData): Promise<Meta | UploadResult> {
	try {
		const response = await withTimeout((signal) => http.postForm("Photo", form, signal), CHUNK_TIMEOUT_MS);
		if (response === TIMED_OUT) {
			return { kind: "interrupted" };
		}
		const payload = await readJson(response);
		if (!response.ok) {
			return resultOf(response.status, payload);
		}
		return metaOf(payload) ?? { kind: "failed" };
	} catch {
		return { kind: "interrupted" };
	}
}

function resultOf(status: number, payload: unknown): UploadResult {
	const { exception, message } = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
	const text = typeof message === "string" && message !== "" ? message : "Upload failed";
	if (status === 401) {
		return { kind: "unauthenticated" };
	}
	if (status === 409) {
		return exception === "PhotoSkippedException" ? { kind: "skipped" } : { kind: "rejected", message: text };
	}
	if (status === 413) {
		return { kind: exception === "QuotaExceededException" ? "quota" : "too_large" };
	}
	return status === 422 ? { kind: "rejected", message: text } : { kind: "failed" };
}

function metaOf(payload: unknown): Meta | undefined {
	if (typeof payload !== "object" || payload === null) {
		return undefined;
	}
	const { uuid_name, extension, chunk_number, total_chunks } = payload as Record<string, unknown>;
	if (typeof chunk_number !== "number" || typeof total_chunks !== "number") {
		return undefined;
	}
	return {
		uuidName: typeof uuid_name === "string" ? uuid_name : "",
		extension: typeof extension === "string" ? extension : "",
		chunkNumber: chunk_number,
		totalChunks: total_chunks,
	};
}
