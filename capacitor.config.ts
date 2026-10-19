/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The app identifier is a personal one for the proof of concept (ADR-0001);
 * it changes when the app moves to LycheeOrg's store accounts.
 */
const config: CapacitorConfig = {
	appId: "com.mlapaglia.lycheemobile",
	appName: "Lychee",
	webDir: "dist",
};

export default config;
