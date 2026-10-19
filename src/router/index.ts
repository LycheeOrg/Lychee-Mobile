/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { createRouter, createWebHistory } from "@ionic/vue-router";
import type { RouteRecordRaw } from "vue-router";
import HomePage from "@/views/HomePage.vue";
import LoginPage from "@/views/LoginPage.vue";

const routes: RouteRecordRaw[] = [
	{
		path: "/",
		redirect: "/home",
	},
	{
		path: "/home",
		name: "home",
		component: HomePage,
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
