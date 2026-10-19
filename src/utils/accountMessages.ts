/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import type { OtherMethods, SignInFailure } from "@/services/auth";
import { failureMessage } from "@/utils/serverMessages";

const SIGN_IN_MESSAGES: Record<SignInFailure, string> = {
	wrong_credentials: "Wrong username or password.",
	throttled: "Too many sign-in attempts. Try again later.",
	unreachable: failureMessage("unreachable"),
	failed: "Sign-in failed. Try again.",
};

/** UI-002-03: the message shown for a failed sign-in. */
export function signInFailureMessage(kind: SignInFailure): string {
	return SIGN_IN_MESSAGES[kind];
}

/** UI-002-04: the note for sign-in methods the app doesn't support yet, or `null`. */
export function otherMethodsNote(methods: OtherMethods): string | null {
	const names = [methods.oauth ? "OAuth" : null, methods.passkeys ? "passkey" : null].filter((name) => name !== null);
	return names.length === 0 ? null : `This server also offers ${names.join(" and ")} sign-in. The app supports only username and password for now.`;
}
