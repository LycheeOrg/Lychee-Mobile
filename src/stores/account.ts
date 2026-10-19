/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { reactive, readonly } from "vue";
import { readAccount, readOtherMethods, signIn, signOut, type Account, type SignInFailure } from "@/services/auth";
import { forgetCredentials, loadCredentials, saveCredentials, type Credentials } from "@/services/credentials";

/** DO-002-03; never persisted: the server's session is the source of truth. */
export type AccountStatus = "unknown" | "signed_out" | "signed_in";

type AccountStoreDeps = {
	signIn: typeof signIn;
	readAccount: typeof readAccount;
	signOut: typeof signOut;
	readOtherMethods: typeof readOtherMethods;
	credentials: {
		save: (server: string, credentials: Credentials) => Promise<boolean>;
		load: (server: string) => Promise<Credentials | null>;
		forget: () => Promise<void>;
	};
	now: () => number;
};

/** NFR-006-02: no second silent login this soon after a successful one. */
const REAUTH_COOLDOWN_MS = 60_000;

const defaultDeps: AccountStoreDeps = {
	signIn,
	readAccount,
	signOut,
	readOtherMethods,
	credentials: {
		save: (server, credentials) => saveCredentials(server, credentials),
		load: (server) => loadCredentials(server),
		forget: () => forgetCredentials(),
	},
	now: () => Date.now(),
};

/**
 * Who is signed in to the stored server (FR-002-01 … 04, FR-002-07), with the
 * stored credentials and silent logins of Feature 006. The password goes to
 * the service and to secure storage, never into state (NFR-006-01).
 */
export function createAccountStore(deps: AccountStoreDeps = defaultDeps) {
	const state = reactive({
		status: "unknown" as AccountStatus,
		account: null as Account | null,
		signingIn: false,
		failure: null as SignInFailure | null,
		otherMethods: { oauth: false, passkeys: false },
		/** FR-006-03: the username whose stored password the server rejected. */
		passwordRejected: null as string | null,
	});
	let pendingReauth: Promise<boolean> | null = null;
	let lastReauth = Number.NEGATIVE_INFINITY;

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
		state.passwordRejected = null;
		await deps.credentials.save(server, { username, password });
		return true;
	}

	/**
	 * FR-006-02/03: logs in with the stored credentials. Resolves `true` when
	 * signed in again. One login at a time; none right after a successful one.
	 */
	function reauthenticate(server: string): Promise<boolean> {
		if (pendingReauth !== null) {
			return pendingReauth;
		}
		if (deps.now() - lastReauth < REAUTH_COOLDOWN_MS) {
			return Promise.resolve(false);
		}
		pendingReauth = loginWithStored(server).finally(() => {
			pendingReauth = null;
		});
		return pendingReauth;
	}

	async function loginWithStored(server: string): Promise<boolean> {
		const stored = await deps.credentials.load(server);
		if (stored === null) {
			return false;
		}
		const result = await deps.signIn(server, stored.username, stored.password);
		if (result.kind === "ok") {
			setAccount(result.account);
			lastReauth = deps.now();
			return true;
		}
		if (result.kind === "wrong_credentials") {
			await deps.credentials.forget();
			setAccount(null);
			state.passwordRejected = stored.username;
		}
		return false;
	}

	async function signOutOf(server: string): Promise<void> {
		await deps.signOut(server);
		await deps.credentials.forget();
		setAccount(null);
	}

	/** A different server: forget the account and its stored credentials (FR-006-04). */
	async function reset(): Promise<void> {
		state.account = null;
		state.status = "unknown";
		state.failure = null;
		await deps.credentials.forget();
	}

	function clearPasswordRejected(): void {
		state.passwordRejected = null;
	}

	function clearFailure(): void {
		state.failure = null;
	}

	async function loadOtherMethods(server: string): Promise<void> {
		state.otherMethods = await deps.readOtherMethods(server);
	}

	return {
		state: readonly(state),
		refresh,
		signIn: signInTo,
		signOut: signOutOf,
		reauthenticate,
		reset,
		clearFailure,
		clearPasswordRejected,
		loadOtherMethods,
	};
}

/** The app-wide store. */
export const accountStore = createAccountStore();
