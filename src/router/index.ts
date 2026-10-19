/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { createRouter, createWebHistory } from "@ionic/vue-router";
import type { RouteRecordRaw } from "vue-router";
import AlbumPage from "@/views/AlbumPage.vue";
import AlbumsPage from "@/views/AlbumsPage.vue";
import LoginPage from "@/views/LoginPage.vue";
import SettingsPage from "@/views/SettingsPage.vue";

// FR-003-08: the album list is the start page; it sends a first launch to settings.
const routes: RouteRecordRaw[] = [
	{
		path: "/",
		redirect: "/albums",
	},
	{
		path: "/albums",
		name: "albums",
		component: AlbumsPage,
	},
	{
		path: "/albums/:id",
		name: "album",
		component: AlbumPage,
	},
	{
		path: "/settings",
		name: "settings",
		component: SettingsPage,
	},
	{
		path: "/login",
		name: "login",
		component: LoginPage,
	},
];

export default createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
});
