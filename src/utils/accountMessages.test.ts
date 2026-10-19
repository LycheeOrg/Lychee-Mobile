/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { otherMethodsNote, signInFailureMessage } from "@/utils/accountMessages";
import { failureMessage } from "@/utils/serverMessages";

describe("signInFailureMessage (FR-002-01)", () => {
	it.each([
		["wrong_credentials", "Wrong username or password."],
		["throttled", "Too many sign-in attempts. Try again later."],
		["failed", "Sign-in failed. Try again."],
	] as const)("%s", (kind, message) => {
		expect(signInFailureMessage(kind)).toBe(message);
	});

	it("uses Feature 001's message for an unreachable server", () => {
		expect(signInFailureMessage("unreachable")).toBe(failureMessage("unreachable"));
	});
});

describe("otherMethodsNote (FR-002-07)", () => {
	it("is empty when the server offers only passwords", () => {
		expect(otherMethodsNote({ oauth: false, passkeys: false })).toBeNull();
	});

	it.each([
		[{ oauth: true, passkeys: false }, "OAuth"],
		[{ oauth: false, passkeys: true }, "passkey"],
		[{ oauth: true, passkeys: true }, "OAuth and passkey"],
	])("names %o", (methods, names) => {
		expect(otherMethodsNote(methods)).toBe(`This server also offers ${names} sign-in. The app supports only username and password for now.`);
	});
});
