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
	state: { readonly status: AccountStatus };
	refresh: (server: string) => Promise<void>;
	reset: () => void;
};

/** Where the app goes after Connect (FR-002-05). */
export type AfterConnect = "sign_in" | "stay";

/** Sequences the server check and the account check. */
export function createSession(server: ServerSide, account: AccountSide) {
	/** FR-001-03 then FR-002-03: the account is read only from a reachable server. */
	async function launch(): Promise<void> {
		await server.launchCheck();
		if (server.state.saved !== null && server.state.launchFailure === null) {
			await account.refresh(server.state.saved.url);
		}
	}

	/** FR-001-02 then FR-002-05. */
	async function connect(input: string): Promise<AfterConnect> {
		const previous = server.state.saved?.url ?? null;
		await server.connect(input);
		const saved = server.state.saved;
		if (server.state.status !== "connected" || saved === null) {
			return "stay";
		}
		if (saved.url !== previous) {
			account.reset();
		}
		await account.refresh(saved.url);
		return account.state.status === "signed_out" ? "sign_in" : "stay";
	}

	return { launch, connect };
}

/** The app-wide session. */
export const session = createSession(serverStore, accountStore);
