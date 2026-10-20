/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { KEEP_PASSWORD, otherMethodsNote, PASSWORD_REJECTED, saveOutcomeMessage, signInFailureMessage } from "@/utils/accountMessages";
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

describe("Settings messages (FR-009-03, FR-009-04)", () => {
	it("asks for the missing field", () => {
		expect(saveOutcomeMessage("password_needed")).toBe("Enter the password.");
		expect(saveOutcomeMessage("username_needed")).toBe("Enter the username.");
	});

	it("leaves the other outcomes to the server and sign-in messages", () => {
		expect(saveOutcomeMessage("server_failed")).toBeNull();
		expect(saveOutcomeMessage("sign_in_failed")).toBeNull();
		expect(saveOutcomeMessage("albums")).toBeNull();
	});

	it("explains a rejected stored password and the blank password field", () => {
		expect(PASSWORD_REJECTED).toBe("Your password changed or was reset. Sign in again.");
		expect(KEEP_PASSWORD).toBe("Leave blank to keep the existing password");
	});
});
