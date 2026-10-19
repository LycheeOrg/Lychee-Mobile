/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { KeychainAccess, SecureStorage } from "@aparajita/capacitor-secure-storage";

/** DO-006-01. */
export type Credentials = { username: string; password: string };

/** The parts of secure storage used here, injectable for tests. */
export type SecureStore = {
	get: (key: string) => Promise<unknown>;
	set: (key: string, value: Record<string, unknown>) => Promise<void>;
	remove: (key: string) => Promise<void>;
};

export const CREDENTIALS_KEY = "lychee_credentials";

/**
 * NFR-006-03 (Q-006-04): never synced to iCloud; the Keychain item stays on
 * this device and is readable after the first unlock. Android encrypts with a
 * Keystore key either way.
 */
export const nativeSecureStore: SecureStore = {
	get: (key) => SecureStorage.get(key, false, false),
	set: (key, value) => SecureStorage.set(key, value, false, false, KeychainAccess.afterFirstUnlockThisDeviceOnly),
	remove: async (key) => {
		await SecureStorage.remove(key, false);
	},
};

/** FR-006-01: stores the credentials for `server`; `false` when storing failed. */
export async function saveCredentials(server: string, credentials: Credentials, store: SecureStore = nativeSecureStore): Promise<boolean> {
	try {
		await store.set(CREDENTIALS_KEY, { server, username: credentials.username, password: credentials.password });
		return true;
	} catch {
		return false;
	}
}

/**
 * The credentials stored for `server`, or `null`. Unreadable or malformed
 * entries are deleted (FR-006-05).
 */
export async function loadCredentials(server: string, store: SecureStore = nativeSecureStore): Promise<Credentials | null> {
	let value: unknown;
	try {
		value = await store.get(CREDENTIALS_KEY);
	} catch {
		await forgetCredentials(store);
		return null;
	}
	if (value === null || value === undefined) {
		return null;
	}
	const stored = typeof value === "object" ? (value as Record<string, unknown>) : {};
	if (typeof stored.server !== "string" || typeof stored.username !== "string" || typeof stored.password !== "string") {
		await forgetCredentials(store);
		return null;
	}
	return stored.server === server ? { username: stored.username, password: stored.password } : null;
}

/** FR-006-04. */
export async function forgetCredentials(store: SecureStore = nativeSecureStore): Promise<void> {
	try {
		await store.remove(CREDENTIALS_KEY);
	} catch {
		// Already gone or unreadable; nothing else to do.
	}
}
