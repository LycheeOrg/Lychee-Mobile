/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import AddButton from "@/components/AddButton.vue";
import type { AddMenu } from "@/stores/addMenu";

const PopoverStub = defineComponent({
	props: { isOpen: Boolean },
	setup(props, { slots }) {
		return () => (props.isOpen ? h("div", { class: "popover" }, slots.default?.()) : null);
	},
});

function button(menu: AddMenu) {
	return mount(AddButton, {
		props: { menu },
		global: { stubs: { IonIcon: true, IonBadge: true, IonPopover: PopoverStub, IonContent: { template: "<div><slot /></div>" } } },
	});
}

describe("AddButton (FR-010-01)", () => {
	it("opens a menu with both items when both are allowed (S-010-01)", async () => {
		const wrapper = button({ upload: { albumId: null }, createIn: { parentId: null } });
		expect(wrapper.find(".popover").exists()).toBe(false);

		await wrapper.get('[aria-label="Add"]').trigger("click");

		expect(wrapper.get(".popover").text()).toContain("Upload photos");
		expect(wrapper.get(".popover").text()).toContain("Create album");
	});

	it("shows only the allowed items (S-010-04)", async () => {
		const uploadOnly = button({ upload: { albumId: "a1" }, createIn: null });
		await uploadOnly.get('[aria-label="Add"]').trigger("click");
		const createOnly = button({ upload: null, createIn: { parentId: "a1" } });
		await createOnly.get('[aria-label="Add"]').trigger("click");

		expect(uploadOnly.get(".popover").text()).not.toContain("Create album");
		expect(createOnly.get(".popover").text()).not.toContain("Upload photos");
	});
});
