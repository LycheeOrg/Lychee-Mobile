/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { createGallery, DELETE_TIMEOUT_MS, GALLERY_TIMEOUT_MS } from "@/services/gallery";
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
import error422Delete from "@/services/__fixtures__/lychee-7.11.1/error-422-delete.json";
import photoAlbums from "@/services/__fixtures__/lychee-7.11.1/photo-albums.json";
import mapProvider from "@/services/__fixtures__/lychee-7.11.1/map-provider.json";

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

		expect(await createGallery(SERVER, deps).settings()).toEqual({
			kind: "ok",
			value: { nsfwVisible: true, nsfwBlurred: false, exifDisabled: false },
		});
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

describe("deleting photos (FR-007-03, API-007-01)", () => {
	it("deletes the photos from the album and answers ok on 204 (S-007-05)", async () => {
		const deps = server({ "DELETE Photo": () => new Response(null, { status: 204 }) });

		expect(await createGallery(SERVER, deps).deletePhotos(["p1", "p2"], "a1")).toEqual({ kind: "ok" });
		const init = deps.fetch.mock.calls.find((call) => call[1]?.method === "DELETE")?.[1];
		expect(JSON.parse(String(init?.body))).toEqual({ photo_ids: ["p1", "p2"], from_id: "a1" });
	});

	it("deletes from Unsorted by its smart album id (S-007-06)", async () => {
		const deps = server({ "DELETE Photo": () => new Response(null, { status: 204 }) });

		await createGallery(SERVER, deps).deletePhotos(["p1"], "unsorted");

		const init = deps.fetch.mock.calls.find((call) => call[1]?.method === "DELETE")?.[1];
		expect(JSON.parse(String(init?.body))).toMatchObject({ from_id: "unsorted" });
	});

	it.each([
		["401", () => json(error401, 401), "unauthenticated"],
		["403 (S-007-07)", () => json(error403, 403), "forbidden"],
		["422", () => json(error422Delete, 422), "failed"],
		["500", () => json({ message: "Server error" }, 500), "failed"],
		["a network error", () => Promise.reject(new TypeError("Failed to fetch")), "unreachable"],
	] as [string, Route, string][])("maps %s", async (_, route, kind) => {
		const deps = server({ "DELETE Photo": route });

		expect(await createGallery(SERVER, deps).deletePhotos(["p1"], "a1")).toEqual({ kind });
	});

	it("reports a timeout separately, since photos may be gone (S-007-09)", async () => {
		vi.useFakeTimers();
		const result = createGallery(SERVER, server({ "DELETE Photo": never })).deletePhotos(["p1"], "a1");

		await vi.advanceTimersByTimeAsync(DELETE_TIMEOUT_MS);

		expect(await result).toEqual({ kind: "timeout" });
	});

	it("allows 30 seconds", () => {
		expect(DELETE_TIMEOUT_MS).toBe(30_000);
	});
});

describe("download requests (FR-007-04, API-007-02)", () => {
	it("asks for one photo's original from its album, with the session cookie", async () => {
		const deps = server({});

		expect(await createGallery(SERVER, deps).downloadRequest("p1", "a1")).toEqual({
			url: `${SERVER}/api/v2/Zip?photo_ids=p1&variant=ORIGINAL&from_id=a1`,
			headers: { Cookie: "XSRF-TOKEN=t" },
		});
	});

	it("sends no Cookie header without cookies", async () => {
		const deps = server({});
		deps.readCookies.mockResolvedValue({});

		expect((await createGallery(SERVER, deps).downloadRequest("p1", "a1")).headers).toEqual({});
	});
});

describe("photo albums (FR-008-06, API-008-02)", () => {
	it("lists the albums the user can see", async () => {
		const deps = server({ "GET Photo/p1/albums": () => json(photoAlbums) });

		expect(await createGallery(SERVER, deps).photoAlbums("p1")).toEqual({
			kind: "ok",
			albums: [
				{ id: "a1Bc2De3Fg4Hi5Jk6Lm7No8P", title: "Mallory LaPaglia" },
				{ id: "b2Cd3Ef4Gh5Ij6Kl7Mn8Op9Q", title: "Holidays" },
			],
		});
		expect(urlsOf(deps)).toEqual([`${SERVER}/api/v2/Photo/p1/albums`]);
	});

	it("reads an empty list", async () => {
		const deps = server({ "GET Photo/p1/albums": () => json([]) });

		expect(await createGallery(SERVER, deps).photoAlbums("p1")).toEqual({ kind: "ok", albums: [] });
	});

	it.each([
		["404 (Lychee before 7.4.0, S-008-08)", () => new Response("", { status: 404 }), "unsupported"],
		["401", () => json(error401, 401), "unauthenticated"],
		["500 (S-008-09)", () => json({ message: "Server error" }, 500), "failed"],
		["a network error", () => Promise.reject(new TypeError("Failed to fetch")), "failed"],
		["an unreadable body", () => json({ albums: [] }), "failed"],
	] as [string, Route, string][])("maps %s", async (_, route, kind) => {
		const deps = server({ "GET Photo/p1/albums": route });

		expect(await createGallery(SERVER, deps).photoAlbums("p1")).toEqual({ kind });
	});

	it("gives up after the timeout", async () => {
		vi.useFakeTimers();
		const result = createGallery(SERVER, server({ "GET Photo/p1/albums": never })).photoAlbums("p1");

		await vi.advanceTimersByTimeAsync(GALLERY_TIMEOUT_MS);

		expect(await result).toEqual({ kind: "failed" });
	});
});

describe("map provider (API-008-03)", () => {
	it("reads the tile layer and attribution, once per server", async () => {
		const deps = server({ "GET Map::provider": () => json(mapProvider) });
		const gallery = createGallery(SERVER, deps);

		expect(await gallery.mapProvider()).toEqual({
			layer: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
			attribution: "© OpenStreetMap contributors",
		});
		await gallery.mapProvider();

		expect(urlsOf(deps)).toEqual([`${SERVER}/api/v2/Map::provider`]);
	});

	it("gives null on failure and asks again next time", async () => {
		const deps = server({ "GET Map::provider": () => json({ message: "Server error" }, 500) });
		const gallery = createGallery(SERVER, deps);

		expect(await gallery.mapProvider()).toBeNull();
		await gallery.mapProvider();

		expect(urlsOf(deps)).toHaveLength(2);
	});
});
