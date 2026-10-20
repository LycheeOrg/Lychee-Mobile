/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { createFailureMessage, titleProblemMessage } from "@/utils/albumMessages";

describe("album creation messages (FR-010-03)", () => {
	it("explains a title problem", () => {
		expect(titleProblemMessage("empty")).toBe("Enter a title.");
		expect(titleProblemMessage("too_long")).toBe("Album titles can be at most 100 characters.");
	});

	it.each([
		[{ kind: "busy" }, "The server is busy. Try again."],
		[{ kind: "forbidden" }, "You can't create albums here."],
		[{ kind: "invalid", message: "The title is not valid." }, "The title is not valid."],
		[{ kind: "unreachable" }, "Couldn't reach the server."],
		[{ kind: "unauthenticated" }, "Sign in again to create albums."],
		[{ kind: "failed" }, "Couldn't create the album."],
	] as const)("explains %o", (result, text) => {
		expect(createFailureMessage(result)).toBe(text);
	});
});
