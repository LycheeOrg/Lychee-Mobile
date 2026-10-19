/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { reactive, readonly } from "vue";
import { readAccount, readOtherMethods, signIn, signOut, type Account, type SignInFailure } from "@/services/auth";

/** DO-002-03; never persisted: the server's cookies are the source of truth (ADR-002-01). */
export type AccountStatus = "unknown" | "signed_out" | "signed_in";

type AccountStoreDeps = {
	signIn: typeof signIn;
	readAccount: typeof readAccount;
	signOut: typeof signOut;
	readOtherMethods: typeof readOtherMethods;
};

/**
 * Who is signed in to the stored server (FR-002-01 … 04, FR-002-07). The
 * password passes through `signIn()` to the service and is never kept
 * (NFR-002-01).
 */
export function createAccountStore(deps: AccountStoreDeps = { signIn, readAccount, signOut, readOtherMethods }) {
	const state = reactive({
		status: "unknown" as AccountStatus,
		account: null as Account | null,
		signingIn: false,
		failure: null as SignInFailure | null,
		otherMethods: { oauth: false, passkeys: false },
	});

	function setAccount(account: Account | null): void {
		state.account = account;
		state.status = account === null ? "signed_out" : "signed_in";
	}

	async function refresh(server: string): Promise<void> {
		const result = await deps.readAccount(server);
		if (result.kind === "ok") {
			setAccount(result.account);
			return;
		}
		state.account = null;
		state.status = "unknown";
	}

	/** Resolves `true` once signed in. */
	async function signInTo(server: string, username: string, password: string): Promise<boolean> {
		state.signingIn = true;
		state.failure = null;
		const result = await deps.signIn(server, username, password);
		state.signingIn = false;
		if (result.kind !== "ok") {
			state.failure = result.kind;
			return false;
		}
		setAccount(result.account);
		return true;
	}

	async function signOutOf(server: string): Promise<void> {
		await deps.signOut(server);
		setAccount(null);
	}

	function reset(): void {
		state.account = null;
		state.status = "unknown";
		state.failure = null;
	}

	function clearFailure(): void {
		state.failure = null;
	}

	async function loadOtherMethods(server: string): Promise<void> {
		state.otherMethods = await deps.readOtherMethods(server);
	}

	return { state: readonly(state), refresh, signIn: signInTo, signOut: signOutOf, reset, clearFailure, loadOtherMethods };
}

/** The app-wide store. */
export const accountStore = createAccountStore();
