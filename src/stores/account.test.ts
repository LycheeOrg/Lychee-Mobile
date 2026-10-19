/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { createAccountStore } from "@/stores/account";
import type { AccountRead, OtherMethods, SignInResult } from "@/services/auth";

const SERVER = "https://photos.example.com";
const ACCOUNT = { id: 1, username: "photographer" };
const PASSWORD = "correct horse battery staple";

function setup({ read = [] as AccountRead[], signIns = [] as SignInResult[], methods = { oauth: false, passkeys: false } as OtherMethods } = {}) {
	const deps = {
		signIn: vi.fn(async () => signIns.shift() ?? { kind: "failed" as const }),
		readAccount: vi.fn(async () => read.shift() ?? { kind: "failed" as const }),
		signOut: vi.fn(async () => undefined),
		readOtherMethods: vi.fn(async () => methods),
	};
	return { store: createAccountStore(deps), deps };
}

describe("refresh (FR-002-03)", () => {
	it("starts unknown", () => {
		expect(setup().store.state.status).toBe("unknown");
	});

	it("is signed in when the server knows the session (S-002-06)", async () => {
		const { store, deps } = setup({ read: [{ kind: "ok", account: ACCOUNT }] });

		await store.refresh(SERVER);

		expect(deps.readAccount).toHaveBeenCalledWith(SERVER);
		expect(store.state.status).toBe("signed_in");
		expect(store.state.account).toEqual(ACCOUNT);
	});

	it("is signed out for a guest (S-002-07)", async () => {
		const { store } = setup({ read: [{ kind: "ok", account: null }] });

		await store.refresh(SERVER);

		expect(store.state.status).toBe("signed_out");
		expect(store.state.account).toBeNull();
	});

	it("is unknown when the account can't be read", async () => {
		const { store } = setup({ read: [{ kind: "ok", account: ACCOUNT }, { kind: "failed" }] });
		await store.refresh(SERVER);

		await store.refresh(SERVER);

		expect(store.state.status).toBe("unknown");
		expect(store.state.account).toBeNull();
	});
});

describe("signIn (FR-002-01)", () => {
	it("signs in and reports success (S-002-01)", async () => {
		const { store, deps } = setup({ signIns: [{ kind: "ok", account: ACCOUNT }] });

		expect(await store.signIn(SERVER, "photographer", PASSWORD)).toBe(true);

		expect(deps.signIn).toHaveBeenCalledWith(SERVER, "photographer", PASSWORD);
		expect(store.state.status).toBe("signed_in");
		expect(store.state.account).toEqual(ACCOUNT);
		expect(store.state.failure).toBeNull();
	});

	it("is signing in while the request runs", async () => {
		const { store } = setup({ signIns: [{ kind: "ok", account: ACCOUNT }] });

		const pending = store.signIn(SERVER, "photographer", PASSWORD);
		expect(store.state.signingIn).toBe(true);
		await pending;
		expect(store.state.signingIn).toBe(false);
	});

	it.each(["wrong_credentials", "throttled", "unreachable", "failed"] as const)("keeps the failure %s (S-002-02 … 05)", async (kind) => {
		const { store } = setup({ read: [{ kind: "ok", account: null }], signIns: [{ kind }] });
		await store.refresh(SERVER);

		expect(await store.signIn(SERVER, "photographer", PASSWORD)).toBe(false);

		expect(store.state.failure).toBe(kind);
		expect(store.state.status).toBe("signed_out");
		expect(store.state.signingIn).toBe(false);
	});

	it("clears the previous failure on the next attempt", async () => {
		const { store } = setup({ signIns: [{ kind: "wrong_credentials" }, { kind: "ok", account: ACCOUNT }] });
		await store.signIn(SERVER, "photographer", "wrong");

		await store.signIn(SERVER, "photographer", PASSWORD);

		expect(store.state.failure).toBeNull();
	});

	it("never keeps the password in its state (NFR-002-01)", async () => {
		const { store } = setup({ signIns: [{ kind: "wrong_credentials" }, { kind: "ok", account: ACCOUNT }] });
		await store.signIn(SERVER, "photographer", PASSWORD);
		await store.signIn(SERVER, "photographer", PASSWORD);

		expect(JSON.stringify(store.state)).not.toContain(PASSWORD);
	});
});

describe("signOut and reset (FR-002-04, FR-002-05)", () => {
	it("signs out (S-002-08)", async () => {
		const { store, deps } = setup({ signIns: [{ kind: "ok", account: ACCOUNT }] });
		await store.signIn(SERVER, "photographer", PASSWORD);

		await store.signOut(SERVER);

		expect(deps.signOut).toHaveBeenCalledWith(SERVER);
		expect(store.state.status).toBe("signed_out");
		expect(store.state.account).toBeNull();
	});

	it("resets to unknown and forgets the failure", async () => {
		const { store } = setup({ signIns: [{ kind: "wrong_credentials" }] });
		await store.signIn(SERVER, "photographer", "wrong");

		store.reset();

		expect(store.state.status).toBe("unknown");
		expect(store.state.failure).toBeNull();
	});

	it("clears a failure on demand, when the sign-in page opens", async () => {
		const { store } = setup({ signIns: [{ kind: "throttled" }] });
		await store.signIn(SERVER, "photographer", PASSWORD);

		store.clearFailure();

		expect(store.state.failure).toBeNull();
	});
});

describe("other methods (FR-002-07)", () => {
	it("loads the server's other sign-in methods", async () => {
		const { store, deps } = setup({ methods: { oauth: true, passkeys: false } });

		await store.loadOtherMethods(SERVER);

		expect(deps.readOtherMethods).toHaveBeenCalledWith(SERVER);
		expect(store.state.otherMethods).toEqual({ oauth: true, passkeys: false });
	});
});
