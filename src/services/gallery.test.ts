/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { createGallery, GALLERY_TIMEOUT_MS } from "@/services/gallery";
import type { LycheeHttpDeps } from "@/services/lycheeHttp";
import albums from "@/services/__fixtures__/lychee-7.11.1/albums.json";
import albumHead from "@/services/__fixtures__/lychee-7.11.1/album-head.json";
import albumAlbums from "@/services/__fixtures__/lychee-7.11.1/album-albums.json";
import albumPhotos from "@/services/__fixtures__/lychee-7.11.1/album-photos.json";
import galleryInit from "@/services/__fixtures__/lychee-7.11.1/gallery-init.json";
import error401 from "@/services/__fixtures__/lychee-7.11.1/error-401-album.json";
import error403 from "@/services/__fixtures__/lychee-7.11.1/error-403-album.json";
import error404 from "@/services/__fixtures__/lychee-7.11.1/error-404-album.json";
import passwordRequired from "@/services/__fixtures__/lychee-7.11.1/error-password-required.json";
import galleryLocked from "@/services/__fixtures__/lychee-7.11.1/error-gallery-locked.json";
import wrongPassword from "@/services/__fixtures__/lychee-7.11.1/error-wrong-password.json";

const SERVER = "https://photos.example.com";

type Route = () => Response | Promise<Response>;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const never: Route = () => new Promise<Response>(() => undefined);

/** A server answering `METHOD path` (without the query) from `routes`. */
function server(routes: Record<string, Route>) {
	const fetch = vi.fn<LycheeHttpDeps["fetch"]>(async (url, init) => {
		if (url === `${SERVER}/`) {
			return new Response("<html></html>");
		}
		const path = url.replace(`${SERVER}/api/v2/`, "").split("?")[0];
		const route = routes[`${init?.method ?? "GET"} ${path}`];
		return route === undefined ? new Response("", { status: 404 }) : route();
	});
	const readCookies = vi.fn<LycheeHttpDeps["readCookies"]>(async () => ({ "XSRF-TOKEN": "t" }));
	const clearCookies = vi.fn<LycheeHttpDeps["clearCookies"]>(async () => undefined);
	return { fetch, readCookies, clearCookies };
}

function urlsOf(deps: ReturnType<typeof server>): string[] {
	return deps.fetch.mock.calls.map((call) => call[0]).filter((url) => url !== `${SERVER}/`);
}

afterEach(() => {
	vi.useRealTimers();
});

describe("gallery requests (ADR-003-01)", () => {
	it("loads the root list", async () => {
		const deps = server({ "GET Albums": () => json(albums) });

		const result = await createGallery(SERVER, deps).root();

		expect(result.kind).toBe("ok");
		expect(result.kind === "ok" && result.value.sections.length).toBe(4);
	});

	it("loads the gallery settings", async () => {
		const deps = server({ "GET Gallery::Init": () => json(galleryInit) });

		expect(await createGallery(SERVER, deps).settings()).toEqual({ kind: "ok", value: { nsfwVisible: true, nsfwBlurred: false } });
	});

	it("asks for an album's head, sub-albums and photos by id and page", async () => {
		const deps = server({
			"GET Album::head": () => json(albumHead),
			"GET Album::albums": () => json(albumAlbums),
			"GET Album::photos": () => json(albumPhotos),
		});
		const gallery = createGallery(SERVER, deps);

		expect((await gallery.head("a1")).kind).toBe("ok");
		expect((await gallery.albums("a1", 2)).kind).toBe("ok");
		expect((await gallery.photos("a1", 3)).kind).toBe("ok");

		expect(urlsOf(deps)).toEqual([
			`${SERVER}/api/v2/Album::head?album_id=a1`,
			`${SERVER}/api/v2/Album::albums?album_id=a1&page=2`,
			`${SERVER}/api/v2/Album::photos?album_id=a1&page=3`,
		]);
	});

	it("shares one session across calls (FR-003-07)", async () => {
		const deps = server({ "GET Albums": () => json(albums), "GET Gallery::Init": () => json(galleryInit) });
		const gallery = createGallery(SERVER, deps);

		await gallery.root();
		await gallery.settings();

		expect(deps.fetch.mock.calls.filter((call) => call[0] === `${SERVER}/`)).toHaveLength(1);
	});
});

describe("gallery failures (FR-003-01, FR-003-02, FR-003-06)", () => {
	it.each([
		["404", () => json(error404, 404), "not_found"],
		["401", () => json(error401, 401), "unauthenticated"],
		["403", () => json(error403, 403), "forbidden"],
		["a password-protected album (guest)", () => json(passwordRequired, 401), "password_required"],
		["a password-protected album (signed in)", () => json(passwordRequired, 403), "password_required"],
		["a locked gallery", () => json(galleryLocked, 401), "gallery_locked"],
		["a server error", () => json({ message: "Server error" }, 500), "failed"],
		["an unreadable body", () => new Response("<html></html>", { status: 200 }), "failed"],
		["a network error", () => Promise.reject(new TypeError("Failed to fetch")), "unreachable"],
	] as [string, Route, string][])("maps %s to %s", async (_, route, kind) => {
		const deps = server({ "GET Album::head": route });

		expect(await createGallery(SERVER, deps).head("a1")).toEqual({ kind });
	});

	it("gives up after the timeout (NFR-003-01)", async () => {
		vi.useFakeTimers();
		const result = createGallery(SERVER, server({ "GET Album::photos": never })).photos("a1", 1);

		await vi.advanceTimersByTimeAsync(GALLERY_TIMEOUT_MS);

		expect(await result).toEqual({ kind: "unreachable" });
	});
});

describe("unlocking (FR-003-05)", () => {
	it("unlocks an album", async () => {
		const deps = server({ "POST Album::unlock": () => new Response(null, { status: 204 }) });

		expect(await createGallery(SERVER, deps).unlockAlbum("a1", "secret")).toEqual({ kind: "ok" });
		expect(JSON.parse(String(deps.fetch.mock.calls[1][1]?.body))).toEqual({ album_id: "a1", password: "secret" });
	});

	it("unlocks the gallery", async () => {
		const deps = server({ "POST Gallery::unlock": () => new Response(null, { status: 204 }) });

		expect(await createGallery(SERVER, deps).unlockGallery("secret")).toEqual({ kind: "ok" });
		expect(JSON.parse(String(deps.fetch.mock.calls[1][1]?.body))).toEqual({ password: "secret" });
	});

	it.each([
		["a wrong password", () => json(wrongPassword, 403), "wrong_password"],
		["the throttle", () => json({ message: "Too Many Attempts." }, 429), "throttled"],
		["a server error", () => json({}, 500), "failed"],
		["a network error", () => Promise.reject(new TypeError("Failed to fetch")), "unreachable"],
	] as [string, Route, string][])("reports %s", async (_, route, kind) => {
		const deps = server({ "POST Album::unlock": route });

		expect(await createGallery(SERVER, deps).unlockAlbum("a1", "secret")).toEqual({ kind });
	});
});
