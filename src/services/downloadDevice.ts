/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { FileTransfer } from "@capacitor/file-transfer";
import { Directory, Filesystem } from "@capacitor/filesystem";
import type { DownloadRunDeps } from "@/stores/downloadRun";

/** Cache folder for files on their way into the library (ADR-007-01). */
const FOLDER = "downloads";

/** FR-007-04: file-transfer's timeouts; reads reset with each chunk received. */
export const CONNECT_TIMEOUT_MS = 10_000;
export const READ_TIMEOUT_MS = 60_000;

/** The run's device side: file-transfer into the cache, removed afterwards (NFR-007-01). */
export function deviceDownloadDeps(save: DownloadRunDeps["save"]): DownloadRunDeps {
	return {
		prepare: async () => {
			await Filesystem.rmdir({ path: FOLDER, directory: Directory.Cache, recursive: true });
		},
		targetPath: async (name) => (await Filesystem.getUri({ path: `${FOLDER}/${name}`, directory: Directory.Cache })).uri,
		transfer: async ({ url, headers, path }, onProgress) => {
			// One transfer at a time, so every download event is this one's.
			const listener = await FileTransfer.addListener("progress", (status) => {
				if (status.type === "download") {
					onProgress(status.bytes, status.lengthComputable ? status.contentLength : null);
				}
			});
			try {
				await FileTransfer.downloadFile({
					url,
					headers,
					path,
					progress: true,
					connectTimeout: CONNECT_TIMEOUT_MS,
					readTimeout: READ_TIMEOUT_MS,
				});
			} finally {
				await listener.remove();
			}
		},
		save,
		remove: async (path) => {
			await Filesystem.deleteFile({ path });
		},
	};
}
