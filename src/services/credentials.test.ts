/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("@aparajita/capacitor-secure-storage", () => ({
	KeychainAccess: { afterFirstUnlockThisDeviceOnly: 3 },
	SecureStorage: { get: vi.fn(async () => null), set: vi.fn(async () => undefined), remove: vi.fn(async () => true) },
}));

import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { CREDENTIALS_KEY, forgetCredentials, loadCredentials, nativeSecureStore, saveCredentials, type SecureStore } from "@/services/credentials";

const SERVER = "https://photos.example.com";
const CREDENTIALS = { username: "photographer", password: "correct horse battery staple" };

function store(initial: unknown = null) {
	let value = initial;
	return {
		get: vi.fn<SecureStore["get"]>(async () => value),
		set: vi.fn<SecureStore["set"]>(async (_key, next) => {
			value = next;
		}),
		remove: vi.fn<SecureStore["remove"]>(async () => {
			value = null;
		}),
		value: () => value,
	};
}

describe("credentials (FR-006-01, FR-006-04, FR-006-05)", () => {
	it("saves the credentials with the server", async () => {
		const s = store();

		expect(await saveCredentials(SERVER, CREDENTIALS, s)).toBe(true);
		expect(s.set).toHaveBeenCalledWith(CREDENTIALS_KEY, { server: SERVER, ...CREDENTIALS });
	});

	it("reports a failed save", async () => {
		const s = store();
		s.set.mockRejectedValueOnce(new Error("osError"));

		expect(await saveCredentials(SERVER, CREDENTIALS, s)).toBe(false);
	});

	it("loads the credentials for the same server", async () => {
		expect(await loadCredentials(SERVER, store({ server: SERVER, ...CREDENTIALS }))).toEqual(CREDENTIALS);
	});

	it("ignores credentials saved for another server", async () => {
		expect(await loadCredentials(SERVER, store({ server: "https://other.example.com", ...CREDENTIALS }))).toBeNull();
	});

	it("has nothing when nothing is stored", async () => {
		expect(await loadCredentials(SERVER, store())).toBeNull();
	});

	it.each([
		["malformed data", "not an object"],
		["missing fields", { server: SERVER, username: "photographer" }],
	])("deletes %s", async (_, value) => {
		const s = store(value);

		expect(await loadCredentials(SERVER, s)).toBeNull();
		expect(s.remove).toHaveBeenCalledWith(CREDENTIALS_KEY);
	});

	it("deletes credentials it can't read (e.g. restored without the Keystore key)", async () => {
		const s = store();
		s.get.mockRejectedValueOnce(new Error("osError"));

		expect(await loadCredentials(SERVER, s)).toBeNull();
		expect(s.remove).toHaveBeenCalledWith(CREDENTIALS_KEY);
	});

	it("forgets the credentials, ignoring errors", async () => {
		const s = store({ server: SERVER, ...CREDENTIALS });
		await forgetCredentials(s);
		expect(s.value()).toBeNull();

		s.remove.mockRejectedValueOnce(new Error("gone"));
		await expect(forgetCredentials(s)).resolves.toBeUndefined();
	});
});

describe("native secure store (NFR-006-03)", () => {
	it("writes without iCloud sync, this device only, after first unlock", async () => {
		await nativeSecureStore.set(CREDENTIALS_KEY, { server: SERVER, ...CREDENTIALS });

		expect(SecureStorage.set).toHaveBeenCalledWith(CREDENTIALS_KEY, { server: SERVER, ...CREDENTIALS }, false, false, 3);
	});

	it("reads and removes without iCloud sync", async () => {
		await nativeSecureStore.get(CREDENTIALS_KEY);
		await nativeSecureStore.remove(CREDENTIALS_KEY);

		expect(SecureStorage.get).toHaveBeenCalledWith(CREDENTIALS_KEY, false, false);
		expect(SecureStorage.remove).toHaveBeenCalledWith(CREDENTIALS_KEY, false);
	});
});
