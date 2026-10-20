/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { accountStore, type AccountStatus } from "@/stores/account";
import { serverStore, type SavedServer, type ServerStatus } from "@/stores/server";
import type { ServerFailure } from "@/services/server";

type ServerSide = {
	state: { readonly saved: SavedServer | null; readonly status: ServerStatus; readonly launchFailure: ServerFailure | null };
	connect: (input: string) => Promise<void>;
	launchCheck: () => Promise<void>;
};

type AccountSide = {
	state: { readonly status: AccountStatus; readonly account: { readonly username: string } | null };
	refresh: (server: string) => Promise<void>;
	reset: () => void | Promise<void>;
	reauthenticate: (server: string) => Promise<boolean>;
	signIn: (server: string, username: string, password: string) => Promise<boolean>;
	signOut: (server: string) => Promise<void>;
	storedUsername: (server: string) => Promise<string | null>;
};

/** FR-009-04: what Save on Settings achieved; anything but `albums` stays on Settings. */
export type SaveOutcome = "albums" | "server_failed" | "sign_in_failed" | "password_needed" | "username_needed";

/** FR-009-04: the Settings fields. */
export type SettingsInput = { server: string; username: string; password: string };

/** Sequences the server check and the account check. */
export function createSession(server: ServerSide, account: AccountSide) {
	let launching: Promise<void> | null = null;

	/** FR-001-03 then FR-002-03: the account is read only from a reachable server. */
	function launch(): Promise<void> {
		launching = (async () => {
			await server.launchCheck();
			const saved = server.state.saved;
			if (saved !== null && server.state.launchFailure === null) {
				await account.refresh(saved.url);
				// FR-006-02, FR-009-03: the session ended, or the account couldn't be read; log in again.
				if (account.state.status !== "signed_in") {
					await account.reauthenticate(saved.url);
				}
			}
		})();
		return launching;
	}

	/**
	 * Resolves when the latest launch sequence finished (FR-003-08). Starts the
	 * first one when a page asks before the app did: Vue mounts pages before
	 * `App.vue`, and a page that didn't wait saw no server and opened Settings
	 * (FR-009-03).
	 */
	function whenLaunched(): Promise<void> {
		return launching ?? launch();
	}

	/**
	 * FR-009-04: checks the server (FR-001-02; a new server forgets the account,
	 * FR-006-04), then signs in with the typed password, the stored one when the
	 * field is blank, or signs out to browse as a guest when both are empty.
	 */
	async function save(input: SettingsInput): Promise<SaveOutcome> {
		const username = input.username.trim();
		const previous = server.state.saved?.url ?? null;
		await server.connect(input.server);
		const saved = server.state.saved;
		if (server.state.status !== "connected" || saved === null) {
			return "server_failed";
		}
		if (saved.url !== previous) {
			await account.reset();
		}
		await account.refresh(saved.url);
		if (username === "") {
			return input.password === "" ? continueAsGuest(saved.url) : "username_needed";
		}
		if (input.password !== "") {
			return (await account.signIn(saved.url, username, input.password)) ? "albums" : "sign_in_failed";
		}
		return useStored(saved.url, username);
	}

	async function continueAsGuest(url: string): Promise<SaveOutcome> {
		if (account.state.status === "signed_in") {
			await account.signOut(url);
		}
		return "albums";
	}

	/** FR-009-03: a blank password keeps the stored one, for its own username only. */
	async function useStored(url: string, username: string): Promise<SaveOutcome> {
		if ((await account.storedUsername(url)) !== username) {
			return "password_needed";
		}
		if (account.state.status === "signed_in" && account.state.account?.username === username) {
			return "albums";
		}
		return (await account.reauthenticate(url)) ? "albums" : "sign_in_failed";
	}

	return { launch, whenLaunched, save };
}

/** The app-wide session. */
export const session = createSession(serverStore, accountStore);
