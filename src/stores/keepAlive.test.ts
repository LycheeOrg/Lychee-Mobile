/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it, vi } from "vite-plus/test";
import { createKeepAliveRunner, type KeepAliveDeps } from "@/stores/keepAlive";
import type { EntryState, QueueEntry } from "@/stores/uploadQueue";

const entry = (id: number, state: EntryState, sent = 0): QueueEntry => ({
	id,
	file: { path: `p${id}`, name: `f${id}`, mimeType: "image/jpeg", size: 100, modifiedAt: null },
	albumId: null,
	state,
	sent,
	result: null,
});

function setup() {
	let clock = 0;
	const deps = {
		start: vi.fn<KeepAliveDeps["start"]>(async () => undefined),
		update: vi.fn<KeepAliveDeps["update"]>(async () => undefined),
		stop: vi.fn<KeepAliveDeps["stop"]>(async () => undefined),
		requestNotifications: vi.fn<KeepAliveDeps["requestNotifications"]>(async () => undefined),
		now: () => clock,
	};
	return { runner: createKeepAliveRunner(deps), deps, tick: (ms: number) => (clock += ms) };
}

describe("keep-alive runner (FR-012-03, ADR-012-01)", () => {
	it("starts when a run starts, with the run's count and progress", async () => {
		const { runner, deps } = setup();

		await runner.sync({ entries: [entry(1, "uploading", 50), entry(2, "waiting")], runIds: [1, 2] });

		expect(deps.start).toHaveBeenCalledWith({ text: "Uploading 1 of 2", progress: 0.25 });
		expect(deps.requestNotifications).toHaveBeenCalledTimes(1);
	});

	it("updates at most once a second (S-012-02)", async () => {
		const { runner, deps, tick } = setup();
		await runner.sync({ entries: [entry(1, "uploading", 10), entry(2, "waiting")], runIds: [1, 2] });

		tick(500);
		await runner.sync({ entries: [entry(1, "uploading", 60), entry(2, "waiting")], runIds: [1, 2] });
		tick(600);
		await runner.sync({ entries: [entry(1, "done"), entry(2, "uploading", 0)], runIds: [1, 2] });

		expect(deps.update.mock.calls).toEqual([[{ text: "Uploading 2 of 2", progress: 0.5 }]]);
	});

	it("stops when the run ends, and starts again for the next one", async () => {
		const { runner, deps } = setup();
		await runner.sync({ entries: [entry(1, "uploading")], runIds: [1] });

		await runner.sync({ entries: [entry(1, "done")], runIds: [1] });
		await runner.sync({ entries: [entry(1, "done"), entry(2, "waiting")], runIds: [2] });

		expect(deps.stop).toHaveBeenCalledTimes(1);
		expect(deps.start).toHaveBeenCalledTimes(2);
		expect(deps.requestNotifications).toHaveBeenCalledTimes(1);
	});

	it("does nothing while idle", async () => {
		const { runner, deps } = setup();

		await runner.sync({ entries: [entry(1, "failed")], runIds: [1] });

		expect(deps.start).not.toHaveBeenCalled();
		expect(deps.stop).not.toHaveBeenCalled();
	});

	it("keeps uploading when the native side fails (e.g. in a browser)", async () => {
		const { runner, deps } = setup();
		deps.start.mockRejectedValue(new Error("not implemented"));
		deps.requestNotifications.mockRejectedValue(new Error("not implemented"));

		await expect(runner.sync({ entries: [entry(1, "uploading")], runIds: [1] })).resolves.toBeUndefined();
	});
});
