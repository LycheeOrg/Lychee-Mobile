/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The app identifier is a personal one for the proof of concept (ADR-0003);
 * it changes when the app moves to LycheeOrg's store accounts.
 */
const config: CapacitorConfig = {
	appId: "com.mlapaglia.lycheemobile",
	appName: "Lychee",
	webDir: "dist",
	// NFR-006-01: the bridge's debug logging prints plugin results, which
	// would include the stored credentials (ADR-006-01).
	loggingBehavior: "none",
	android: {
		// ADR-003-02: thumbnails from local-network http servers load in the
		// WebView, which serves the app from https://localhost.
		allowMixedContent: true,
	},
	plugins: {
		// ADR-001-01: `fetch` uses the native HTTP stack and cookie store, so
		// Lychee calls are not subject to WebView CORS.
		CapacitorHttp: {
			enabled: true,
		},
	},
};

export default config;
