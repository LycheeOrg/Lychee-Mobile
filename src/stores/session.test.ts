/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { reactive } from "vue";
import { createSession } from "@/stores/session";
import type { SavedServer, ServerStatus } from "@/stores/server";
import type { AccountStatus } from "@/stores/account";
import type { ServerFailure } from "@/services/server";

const A = "https://a.example.com";
const B = "https://b.example.com";

type Step = { saved: SavedServer | null; status?: ServerStatus; launchFailure?: ServerFailure | null };

/** A server store whose `connect`/`launchCheck` move to the next `steps` entry. */
function fakeServer(initial: SavedServer | null, steps: Step[]) {
	const state = reactive({ saved: initial, status: "idle" as ServerStatus, launchFailure: null as ServerFailure | null });
	const apply = () => {
		const step = steps.shift();
		if (step !== undefined) {
			Object.assign(state, { status: "idle", launchFailure: null, ...step });
		}
	};
	return { state, connect: vi.fn(async () => apply()), launchCheck: vi.fn(async () => apply()) };
}

function fakeAccount(
	after: AccountStatus,
	{ stored = null as string | null, signedInAs = null as string | null, signIn = true, reauth = false } = {},
) {
	const state = reactive({ status: "unknown" as AccountStatus, account: null as { username: string } | null });
	return {
		state,
		refresh: vi.fn(async () => {
			state.status = after;
			state.account = signedInAs === null ? null : { username: signedInAs };
		}),
		reset: vi.fn(async () => {
			state.status = "unknown";
		}),
		reauthenticate: vi.fn(async () => reauth),
		signIn: vi.fn(async (_server: string, _username: string, _password: string) => signIn),
		signOut: vi.fn(async () => {
			state.status = "signed_out";
		}),
		storedUsername: vi.fn(async (_server: string) => stored),
	};
}

describe("launch (FR-002-03)", () => {
	it("reads the account after a successful launch check (S-002-06)", async () => {
		const server = fakeServer(null, [{ saved: { url: A, version: null } }]);
		const account = fakeAccount("signed_in");

		await createSession(server, account).launch();

		expect(account.refresh).toHaveBeenCalledWith(A);
	});

	it("leaves the account unknown when the launch check fails", async () => {
		const server = fakeServer(null, [{ saved: { url: A, version: null }, launchFailure: "unreachable" }]);
		const account = fakeAccount("signed_in");

		await createSession(server, account).launch();

		expect(account.refresh).not.toHaveBeenCalled();
	});

	it("does nothing without a stored server", async () => {
		const server = fakeServer(null, [{ saved: null }]);
		const account = fakeAccount("signed_in");

		await createSession(server, account).launch();

		expect(account.refresh).not.toHaveBeenCalled();
	});
});

describe("launch when the account can't be read (FR-009-03, S-009-06)", () => {
	it("still signs in silently with the stored credentials", async () => {
		const server = fakeServer({ url: A, version: null }, [{ saved: { url: A, version: null } }]);
		const account = fakeAccount("unknown");

		await createSession(server, account).launch();

		expect(account.reauthenticate).toHaveBeenCalledWith(A);
	});
});

describe("launch with stored credentials (FR-006-02, S-006-03)", () => {
	it("signs in silently when the session reads signed out", async () => {
		const server = fakeServer(null, [{ saved: { url: A, version: null } }]);
		const account = fakeAccount("signed_out");

		await createSession(server, account).launch();

		expect(account.reauthenticate).toHaveBeenCalledWith(A);
	});

	it("doesn't when already signed in", async () => {
		const server = fakeServer(null, [{ saved: { url: A, version: null } }]);
		const account = fakeAccount("signed_in");

		await createSession(server, account).launch();

		expect(account.reauthenticate).not.toHaveBeenCalled();
	});
});

describe("save (FR-009-04)", () => {
	const connected = (from: SavedServer | null = { url: A, version: null }, to = A) =>
		fakeServer(from, [{ saved: { url: to, version: null }, status: "connected" }]);
	const save = (server: ReturnType<typeof fakeServer>, account: ReturnType<typeof fakeAccount>, username: string, password: string) =>
		createSession(server, account).save({ server: "a.example.com", username, password });

	it("stays when the server check fails, touching nothing else", async () => {
		const server = fakeServer({ url: A, version: null }, [{ saved: { url: A, version: null }, status: "failed" }]);
		const account = fakeAccount("signed_out");

		expect(await save(server, account, "mallory", "secret")).toBe("server_failed");
		expect(account.refresh).not.toHaveBeenCalled();
		expect(account.signIn).not.toHaveBeenCalled();
	});

	it("signs in with a typed password", async () => {
		const account = fakeAccount("signed_out");

		expect(await save(connected(), account, " mallory ", "secret")).toBe("albums");
		expect(account.signIn).toHaveBeenCalledWith(A, "mallory", "secret");
	});

	it("reports a failed sign-in", async () => {
		expect(await save(connected(), fakeAccount("signed_out", { signIn: false }), "mallory", "wrong")).toBe("sign_in_failed");
	});

	it("keeps the account when already signed in as that user and the password is blank (S-009-10)", async () => {
		const account = fakeAccount("signed_in", { stored: "mallory", signedInAs: "mallory" });

		expect(await save(connected(), account, "mallory", "")).toBe("albums");
		expect(account.signIn).not.toHaveBeenCalled();
		expect(account.reauthenticate).not.toHaveBeenCalled();
	});

	it("signs in with the stored password when the field is blank (FR-009-03)", async () => {
		const account = fakeAccount("signed_out", { stored: "mallory", reauth: true });

		expect(await save(connected(), account, "mallory", "")).toBe("albums");
		expect(account.reauthenticate).toHaveBeenCalledWith(A);
	});

	it("reports a failed silent sign-in", async () => {
		expect(await save(connected(), fakeAccount("signed_out", { stored: "mallory", reauth: false }), "mallory", "")).toBe("sign_in_failed");
	});

	it("asks for the password when nothing is stored for that username", async () => {
		expect(await save(connected(), fakeAccount("signed_out", { stored: "someone" }), "mallory", "")).toBe("password_needed");
		expect(await save(connected(), fakeAccount("signed_out"), "mallory", "")).toBe("password_needed");
	});

	it("asks for the username when only a password is given", async () => {
		expect(await save(connected(), fakeAccount("signed_out"), " ", "secret")).toBe("username_needed");
	});

	it("signs out and continues as a guest with both fields empty (S-009-11)", async () => {
		const account = fakeAccount("signed_in", { signedInAs: "mallory" });

		expect(await save(connected(), account, "", "")).toBe("albums");
		expect(account.signOut).toHaveBeenCalledWith(A);
	});

	it("continues as a guest without signing out when nobody is signed in", async () => {
		const account = fakeAccount("signed_out");

		expect(await save(connected(), account, "", "")).toBe("albums");
		expect(account.signOut).not.toHaveBeenCalled();
	});

	it("resets the account on a new server, so a blank password can't reuse the old one (S-009-09)", async () => {
		const account = fakeAccount("signed_out");
		account.reset.mockImplementation(async () => {
			account.storedUsername.mockResolvedValue(null);
		});
		account.storedUsername.mockResolvedValue("mallory");

		expect(await save(connected({ url: A, version: null }, B), account, "mallory", "")).toBe("password_needed");
		expect(account.reset).toHaveBeenCalled();
		expect(account.refresh).toHaveBeenCalledWith(B);
	});

	it("doesn't reset the account for the same server", async () => {
		const account = fakeAccount("signed_in", { stored: "mallory", signedInAs: "mallory" });

		await save(connected(), account, "mallory", "");

		expect(account.reset).not.toHaveBeenCalled();
	});
});

describe("whenLaunched (FR-003-08)", () => {
	it("resolves once the launch sequence finished", async () => {
		let release: () => void = () => undefined;
		const server = fakeServer(null, [{ saved: { url: A, version: null } }]);
		server.launchCheck.mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)));
		const account = fakeAccount("signed_in");
		const session = createSession(server, account);

		void session.launch();
		let launched = false;
		const waiting = session.whenLaunched().then(() => (launched = true));
		await Promise.resolve();
		expect(launched).toBe(false);

		release();
		await waiting;
		expect(launched).toBe(true);
	});

	it("starts the launch when a page asks before it began, so it never sees an unloaded server (FR-009-03)", async () => {
		const server = fakeServer(null, [{ saved: { url: A, version: null } }]);
		const session = createSession(server, fakeAccount("signed_in"));

		await session.whenLaunched();

		expect(server.launchCheck).toHaveBeenCalledTimes(1);
		expect(server.state.saved).toEqual({ url: A, version: null });
	});

	it("runs the start-up launch once, however many ask", async () => {
		const server = fakeServer(null, [{ saved: { url: A, version: null } }]);
		const session = createSession(server, fakeAccount("signed_in"));

		await Promise.all([session.whenLaunched(), session.whenLaunched()]);
		await session.whenLaunched();

		expect(server.launchCheck).toHaveBeenCalledTimes(1);
	});

	it("still runs a new launch on Retry", async () => {
		const server = fakeServer(null, [{ saved: { url: A, version: null } }, { saved: { url: A, version: null } }]);
		const session = createSession(server, fakeAccount("signed_in"));
		await session.whenLaunched();

		await session.launch();

		expect(server.launchCheck).toHaveBeenCalledTimes(2);
	});
});
