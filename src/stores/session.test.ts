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

function fakeAccount(after: AccountStatus) {
	const state = reactive({ status: "unknown" as AccountStatus });
	return {
		state,
		refresh: vi.fn(async () => {
			state.status = after;
		}),
		reset: vi.fn(async () => {
			state.status = "unknown";
		}),
		reauthenticate: vi.fn(async () => false),
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

describe("connect (FR-002-05)", () => {
	it("opens sign-in when the new server's session is signed out (S-002-10)", async () => {
		const server = fakeServer(null, [{ saved: { url: A, version: null }, status: "connected" }]);
		const account = fakeAccount("signed_out");

		expect(await createSession(server, account).connect("a.example.com")).toBe("sign_in");
		expect(account.refresh).toHaveBeenCalledWith(A);
	});

	it("goes to the albums when already signed in to that server (FR-003-08)", async () => {
		const server = fakeServer({ url: A, version: null }, [{ saved: { url: A, version: null }, status: "connected" }]);
		const account = fakeAccount("signed_in");

		expect(await createSession(server, account).connect("a.example.com")).toBe("albums");
		expect(account.reset).not.toHaveBeenCalled();
	});

	it("resets the account when the server changes (S-002-09)", async () => {
		const server = fakeServer({ url: A, version: null }, [{ saved: { url: B, version: null }, status: "connected" }]);
		const account = fakeAccount("signed_out");

		await createSession(server, account).connect("b.example.com");

		expect(account.reset).toHaveBeenCalled();
		expect(account.refresh).toHaveBeenCalledWith(B);
	});

	it("stays and leaves the account alone when the check fails", async () => {
		const server = fakeServer({ url: A, version: null }, [{ saved: { url: A, version: null }, status: "failed" }]);
		const account = fakeAccount("signed_out");

		expect(await createSession(server, account).connect("b.example.com")).toBe("stay");
		expect(account.refresh).not.toHaveBeenCalled();
		expect(account.reset).not.toHaveBeenCalled();
	});

	it("goes to the albums when the account can't be read (FR-003-08)", async () => {
		const server = fakeServer(null, [{ saved: { url: A, version: null }, status: "connected" }]);

		expect(await createSession(server, fakeAccount("unknown")).connect("a.example.com")).toBe("albums");
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

	it("resolves at once when no launch ran", async () => {
		await expect(createSession(fakeServer(null, []), fakeAccount("unknown")).whenLaunched()).resolves.toBeUndefined();
	});
});
