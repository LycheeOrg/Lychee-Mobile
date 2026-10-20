/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import type { PhotoTile } from "@/services/galleryParsers";

/** DO-007-04: why one photo wasn't saved. */
export type SaveFailure = "unauthenticated" | "forbidden" | "not_found" | "interrupted" | "unsaveable" | "permission_denied";

/** FR-007-06: how one photo is stored on the phone. */
export type DownloadFile = { ext: string; name: string; mimeType: string; save: "photo" | "video" };

const MIME_BY_EXT: Record<string, string> = {
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	heic: "image/heic",
	heif: "image/heif",
	png: "image/png",
	gif: "image/gif",
	webp: "image/webp",
	mp4: "video/mp4",
	mov: "video/quicktime",
};

const EXT_BY_MIME: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/heic": "heic",
	"image/heif": "heif",
	"image/png": "png",
	"image/gif": "gif",
	"image/webp": "webp",
	"video/mp4": "mp4",
	"video/quicktime": "mov",
};

const FAILURE_BY_STATUS: Record<number, SaveFailure> = { 401: "unauthenticated", 403: "forbidden", 404: "not_found" };

/** file-transfer's connection error and broken transfer. */
const INTERRUPTED_CODES = new Set(["OS-PLUG-FLTR-0008", "OS-PLUG-FLTR-0011"]);

/**
 * FR-007-06: the stored original's extension wins over `type`, because a
 * converted RAW photo keeps its camera MIME while its original is a JPEG
 * (spec Appendix). `null` when neither tells the file type.
 */
export function downloadFileOf(photo: PhotoTile): DownloadFile | null {
	const ext = extensionOfUrl(photo.variants.original?.url) ?? (photo.mimeType === null ? undefined : EXT_BY_MIME[photo.mimeType]);
	if (ext === undefined) {
		return null;
	}
	return {
		ext,
		name: fileNameOf(photo, ext),
		mimeType: MIME_BY_EXT[ext] ?? photo.mimeType ?? "application/octet-stream",
		save: photo.kind === "video" ? "video" : "photo",
	};
}

/** FR-007-04: a file-transfer rejection as a per-photo failure. */
export function transferFailure(error: unknown): SaveFailure {
	const { code, httpStatus } = transferErrorOf(error);
	if (httpStatus !== undefined) {
		return FAILURE_BY_STATUS[httpStatus] ?? "unsaveable";
	}
	return code !== undefined && INTERRUPTED_CODES.has(code) ? "interrupted" : "unsaveable";
}

function extensionOfUrl(url: string | undefined): string | undefined {
	if (url === undefined) {
		return undefined;
	}
	const file = new URL(url).pathname.split("/").pop() ?? "";
	const dot = file.lastIndexOf(".");
	return dot > 0 && dot < file.length - 1 ? file.slice(dot + 1).toLowerCase() : undefined;
}

/** The title with characters other than letters, digits, space, `-`, `_` and `.` replaced, or the id. */
function fileNameOf(photo: PhotoTile, ext: string): string {
	const base = photo.title.trim().replace(/[^\p{L}\p{N} ._-]/gu, "_");
	const name = base === "" ? photo.id : base;
	return name.toLowerCase().endsWith(`.${ext}`) ? name : `${name}.${ext}`;
}

function transferErrorOf(error: unknown): { code?: string; httpStatus?: number } {
	if (typeof error !== "object" || error === null) {
		return {};
	}
	const { code, data } = error as { code?: unknown; data?: unknown };
	const status = typeof data === "object" && data !== null ? (data as { httpStatus?: unknown }).httpStatus : undefined;
	return {
		code: typeof code === "string" ? code : undefined,
		httpStatus: typeof status === "number" ? status : undefined,
	};
}
