/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import {
	albumFailureMessage,
	hiddenSensitiveMessage,
	listFailureMessage,
	sectionTitle,
	signInNeededMessage,
	unlockFailureMessage,
} from "@/utils/galleryMessages";

describe("gallery messages (FR-003-01, FR-003-02)", () => {
	it.each([
		["unreachable", "Can't reach this server."],
		["failed", "Couldn't load the albums."],
		["forbidden", "Couldn't load the albums."],
	] as const)("list %s", (kind, message) => {
		expect(listFailureMessage(kind)).toBe(message);
	});

	it.each([
		["unreachable", "Can't reach this server."],
		["not_found", "This album no longer exists."],
		["forbidden", "You don't have access to this album."],
		["failed", "Couldn't load this album."],
	] as const)("album %s", (kind, message) => {
		expect(albumFailureMessage(kind)).toBe(message);
	});

	it.each([
		["pinned", "Pinned"],
		["smart", "Smart albums"],
		["albums", "Albums"],
		["shared", "Shared with me"],
		["tags", "Tag albums"],
		["people", "People"],
	] as const)("section %s", (key, title) => {
		expect(sectionTitle(key)).toBe(title);
	});
});

describe("unlock and sign-in messages (FR-003-05, FR-003-06)", () => {
	it.each([
		["wrong_password", "Wrong password."],
		["throttled", "Too many attempts. Try again later."],
		["unreachable", "Can't reach this server."],
		["failed", "Unlocking failed. Try again."],
	] as const)("unlock %s", (kind, message) => {
		expect(unlockFailureMessage(kind)).toBe(message);
	});

	it("tells a signed-in user the session ended", () => {
		expect(signInNeededMessage(true)).toBe("Your session ended. Sign in again.");
	});

	it("tells a guest to sign in", () => {
		expect(signInNeededMessage(false)).toBe("Sign in to see these albums.");
	});
});

describe("hiddenSensitiveMessage (FR-003-09)", () => {
	it.each([
		[1, "1 sensitive album hidden"],
		[3, "3 sensitive albums hidden"],
	])("%i", (count, message) => {
		expect(hiddenSensitiveMessage(count)).toBe(message);
	});
});
