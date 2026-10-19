/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { createServerStore, type SavedServer, type ServerStorage } from "@/stores/server";
import type { ServerCheckResult } from "@/services/server";

const EXAMPLE: SavedServer = { url: "https://photos.example.com", version: "7.11.1" };

function setup(saved: SavedServer | null, results: ServerCheckResult[]) {
	let stored = saved;
	const storage: ServerStorage = {
		load: vi.fn(async () => stored),
		save: vi.fn(async (server: SavedServer) => {
			stored = server;
		}),
	};
	const check = vi.fn(async () => results.shift() ?? { kind: "unreachable" as const });
	const store = createServerStore({ check, storage });
	return { store, storage, check, stored: () => stored };
}

describe("connect (FR-001-02)", () => {
	it("stores the server after a successful check", async () => {
		const { store, stored } = setup(null, [{ kind: "ok", url: EXAMPLE.url, version: "7.11.1" }]);

		await store.connect("photos.example.com");

		expect(stored()).toEqual(EXAMPLE);
		expect(store.state.saved).toEqual(EXAMPLE);
		expect(store.state.status).toBe("connected");
		expect(store.state.failure).toBeNull();
	});

	it("is checking while the check runs", async () => {
		const { store } = setup(null, [{ kind: "ok", url: EXAMPLE.url, version: null }]);

		const pending = store.connect("photos.example.com");
		expect(store.state.status).toBe("checking");
		await pending;
		expect(store.state.status).toBe("connected");
	});

	it("keeps the previous server when the check fails", async () => {
		const { store, storage, stored } = setup(EXAMPLE, [{ kind: "not_lychee" }]);
		await store.load();

		await store.connect("other.example.com");

		expect(store.state.status).toBe("failed");
		expect(store.state.failure).toBe("not_lychee");
		expect(stored()).toEqual(EXAMPLE);
		expect(store.state.saved).toEqual(EXAMPLE);
		expect(storage.save).not.toHaveBeenCalled();
	});

	it("replaces the previous server (one server, Q-001-05)", async () => {
		const { store, stored } = setup(EXAMPLE, [{ kind: "ok", url: "https://other.example.com", version: null }]);
		await store.load();

		await store.connect("other.example.com");

		expect(stored()).toEqual({ url: "https://other.example.com", version: null });
	});
});

describe("launch check (FR-001-03, S-001-09, S-001-10)", () => {
	it("does nothing without a stored server", async () => {
		const { store, check } = setup(null, []);

		await store.launchCheck();

		expect(check).not.toHaveBeenCalled();
		expect(store.state.launchFailure).toBeNull();
	});

	it("is silent on success and refreshes the version", async () => {
		const { store, check, stored } = setup(EXAMPLE, [{ kind: "ok", url: EXAMPLE.url, version: "7.12.0" }]);

		await store.launchCheck();

		expect(check).toHaveBeenCalledWith(EXAMPLE.url);
		expect(store.state.launchFailure).toBeNull();
		expect(stored()).toEqual({ ...EXAMPLE, version: "7.12.0" });
	});

	it("reports a failure and keeps the server; retry clears it once the server is back", async () => {
		const { store, stored } = setup(EXAMPLE, [{ kind: "unreachable" }, { kind: "ok", url: EXAMPLE.url, version: "7.11.1" }]);

		await store.launchCheck();
		expect(store.state.launchFailure).toBe("unreachable");
		expect(stored()).toEqual(EXAMPLE);
		expect(store.state.saved).toEqual(EXAMPLE);

		await store.launchCheck();
		expect(store.state.launchFailure).toBeNull();
	});
});
