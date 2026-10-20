/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { enabledActions, photoActionsFor } from "@/stores/photoRights";
import type { AlbumKind } from "@/services/galleryParsers";

const album = (kind: AlbumKind, id = "a1", canDownload = true, canDelete = true) => ({ id, kind, canDownload, canDelete });

describe("photoActionsFor (FR-007-02, S-007-03, S-007-04)", () => {
	it("offers both in a regular album with both rights", () => {
		expect(photoActionsFor(album("album"))).toEqual({ download: true, delete: true });
	});

	it("follows each right on its own", () => {
		expect(photoActionsFor(album("album", "a1", false, true))).toEqual({ download: false, delete: true });
		expect(photoActionsFor(album("album", "a1", true, false))).toEqual({ download: true, delete: false });
	});

	it("offers delete in Unsorted", () => {
		expect(photoActionsFor(album("smart", "unsorted"))).toEqual({ download: true, delete: true });
	});

	it.each(["recent", "starred", "on_this_day"])("offers no delete in the %s smart album", (id) => {
		expect(photoActionsFor(album("smart", id))).toEqual({ download: true, delete: false });
	});

	it.each<AlbumKind>(["tag", "person"])("offers no delete in a %s album", (kind) => {
		expect(photoActionsFor(album(kind))).toEqual({ download: true, delete: false });
	});

	it("offers nothing without rights", () => {
		expect(photoActionsFor(album("album", "a1", false, false))).toEqual({ download: false, delete: false });
	});
});

describe("enabledActions (FR-007-01, FR-007-02, owner 2026-10-20)", () => {
	it("enables an allowed action once a photo is selected", () => {
		expect(enabledActions({ download: true, delete: true }, 1)).toEqual({ download: true, delete: true });
	});

	it("disables both with nothing selected", () => {
		expect(enabledActions({ download: true, delete: true }, 0)).toEqual({ download: false, delete: false });
	});

	it("disables an action the user may not take, whatever is selected (S-007-03)", () => {
		expect(enabledActions({ download: true, delete: false }, 3)).toEqual({ download: true, delete: false });
		expect(enabledActions({ download: false, delete: false }, 3)).toEqual({ download: false, delete: false });
	});
});
