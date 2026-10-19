/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { reactive, readonly } from "vue";
import { Preferences } from "@capacitor/preferences";
import { checkServer, type ServerCheckResult, type ServerFailure } from "@/services/server";

/** DO-001-02: the one server the app talks to (Q-001-05). */
export type SavedServer = { url: string; version: string | null };

export type ServerStorage = {
	load: () => Promise<SavedServer | null>;
	save: (server: SavedServer) => Promise<void>;
};

export type ServerStatus = "idle" | "checking" | "connected" | "failed";

type ServerStoreDeps = {
	check: (input: string) => Promise<ServerCheckResult>;
	storage: ServerStorage;
};

const URL_KEY = "server_url";
const VERSION_KEY = "server_version";

/** `@capacitor/preferences`; an empty version string means "hidden". */
export const preferencesStorage: ServerStorage = {
	async load() {
		const url = (await Preferences.get({ key: URL_KEY })).value;
		const version = (await Preferences.get({ key: VERSION_KEY })).value;
		return url === null ? null : { url, version: version === null || version === "" ? null : version };
	},
	async save(server) {
		await Preferences.set({ key: URL_KEY, value: server.url });
		await Preferences.set({ key: VERSION_KEY, value: server.version ?? "" });
	},
};

/**
 * The stored server and the state of its checks (FR-001-02, FR-001-03).
 * `connect()` stores a server only after a successful check; `launchCheck()`
 * re-checks the stored one and reports a failure without forgetting it.
 */
export function createServerStore(deps: ServerStoreDeps = { check: checkServer, storage: preferencesStorage }) {
	const state = reactive({
		saved: null as SavedServer | null,
		status: "idle" as ServerStatus,
		failure: null as ServerFailure | null,
		launchFailure: null as ServerFailure | null,
	});

	async function load(): Promise<void> {
		state.saved = await deps.storage.load();
	}

	async function remember(server: SavedServer): Promise<void> {
		await deps.storage.save(server);
		state.saved = server;
	}

	async function connect(input: string): Promise<void> {
		state.status = "checking";
		state.failure = null;
		const result = await deps.check(input);
		if (result.kind !== "ok") {
			state.status = "failed";
			state.failure = result.kind;
			return;
		}

		await remember({ url: result.url, version: result.version });
		state.status = "connected";
		state.launchFailure = null;
	}

	async function launchCheck(): Promise<void> {
		if (state.saved === null) {
			await load();
		}
		if (state.saved === null) {
			return;
		}

		const result = await deps.check(state.saved.url);
		state.launchFailure = result.kind === "ok" ? null : result.kind;
		if (result.kind === "ok") {
			await remember({ url: result.url, version: result.version });
		}
	}

	return { state: readonly(state), load, connect, launchCheck };
}

/** The app-wide store. */
export const serverStore = createServerStore();
