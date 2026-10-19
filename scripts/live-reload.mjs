#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

/**
 * Live reload on a phone, emulator or simulator: starts the Vite+ dev server,
 * then `cap run <platform>` with the app pointed at it. Edits under src/ show
 * up on the device without rebuilding.
 *
 *   npm run android:live [-- --target <id>]   Android, over the adb connection
 *   npm run ios:live [-- --target <id>]       iOS simulator
 *   ... -- --external                          physical iPhone, or Android without adb reverse:
 *                                              serve on the Mac's LAN address (same Wi-Fi)
 *
 * Other arguments go to `cap run`. Without --external, Android reaches the dev
 * server through `adb reverse` (USB or wireless debugging), so the phone and
 * the Mac do not need to share a network.
 *
 * A later `npm run android` / `npm run ios` syncs again and removes the
 * live-reload URL from the installed app.
 */

import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

const PORT = 5173;
const PLATFORMS = ["android", "ios"];

const [platform, ...args] = process.argv.slice(2);
if (!PLATFORMS.includes(platform)) {
	console.error("Usage: node scripts/live-reload.mjs <android|ios> [--external] [cap run options]");
	process.exit(1);
}

const external = args.includes("--external");
const capOptions = args.filter((arg) => arg !== "--external");
const host = external ? lanAddress() : "localhost";
if (host === null) {
	console.error("No LAN IPv4 address found for --external.");
	process.exit(1);
}

// The dev server runs in its own process group: `npx vp dev` starts Vite as a
// child, and stopping only the wrapper would leave Vite holding the port.
const dev = spawn("npx", ["vp", "dev", "--host", external ? "0.0.0.0" : "127.0.0.1", "--port", String(PORT), "--strictPort"], {
	stdio: "inherit",
	detached: true,
});
const stop = () => {
	try {
		process.kill(-dev.pid, "SIGTERM");
	} catch {
		// Already gone.
	}
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
// Exit with cap run's failure code, if it failed, once the dev server is gone.
let failure = 0;
dev.on("exit", (code) => process.exit(failure !== 0 ? failure : (code ?? 0)));

await waitForDevServer();

const forward = platform === "android" && !external ? ["--forwardPorts", `${PORT}:${PORT}`] : [];
const run = spawn("npx", ["cap", "run", platform, "--live-reload", "--host", host, "--port", String(PORT), ...forward, ...capOptions], {
	stdio: "inherit",
});
// With --live-reload, `cap run` stays in the foreground after deploying
// ("App running with live reload …") until Ctrl+C; when it ends, for any
// reason, the dev server goes too.
run.on("exit", (code, signal) => {
	if (code !== 0 && signal === null) {
		console.error(`cap run failed (exit ${code}); stopping the dev server.`);
		failure = code ?? 1;
	}
	stop();
});

/** First non-internal IPv4 address of this machine, or null. */
function lanAddress() {
	for (const addresses of Object.values(networkInterfaces())) {
		const match = (addresses ?? []).find((address) => address.family === "IPv4" && !address.internal);
		if (match !== undefined) {
			return match.address;
		}
	}
	return null;
}

/** Resolves once the dev server answers, or exits after 60 s. */
async function waitForDevServer() {
	const deadline = Date.now() + 60_000;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(`http://127.0.0.1:${PORT}/`);
			if (response.ok) {
				return;
			}
		} catch {
			// Not listening yet.
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	console.error(`The dev server did not start on port ${PORT}.`);
	stop();
	process.exit(1);
}
