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
		reset: vi.fn(() => {
			state.status = "unknown";
		}),
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

describe("connect (FR-002-05)", () => {
	it("opens sign-in when the new server's session is signed out (S-002-10)", async () => {
		const server = fakeServer(null, [{ saved: { url: A, version: null }, status: "connected" }]);
		const account = fakeAccount("signed_out");

		expect(await createSession(server, account).connect("a.example.com")).toBe("sign_in");
		expect(account.refresh).toHaveBeenCalledWith(A);
	});

	it("stays when already signed in to that server", async () => {
		const server = fakeServer({ url: A, version: null }, [{ saved: { url: A, version: null }, status: "connected" }]);
		const account = fakeAccount("signed_in");

		expect(await createSession(server, account).connect("a.example.com")).toBe("stay");
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

	it("stays when the account can't be read", async () => {
		const server = fakeServer(null, [{ saved: { url: A, version: null }, status: "connected" }]);

		expect(await createSession(server, fakeAccount("unknown")).connect("a.example.com")).toBe("stay");
	});
});
