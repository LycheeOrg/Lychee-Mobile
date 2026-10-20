<template>
	<IonApp>
		<IonRouterOutlet />
		<UploadSheet />
	</IonApp>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { App as CapacitorApp } from "@capacitor/app";
import { IonApp, IonRouterOutlet, useBackButton } from "@ionic/vue";
import UploadSheet from "@/components/UploadSheet.vue";
import { accountStore } from "@/stores/account";
import { session } from "@/stores/session";
import { rootBackHandler } from "@/utils/backButton";

const router = useRouter();

// FR-006-03, FR-009-03: a silent login found the stored password rejected; Settings asks again.
watch(
	() => accountStore.state.passwordRejected,
	(username) => {
		if (username !== null) {
			void router.push("/settings");
		}
	},
);

// FR-009-01: above the router's handler (0), below overlays (100) and selection mode (15).
useBackButton(
	10,
	rootBackHandler(
		() => router.currentRoute.value.name,
		() => void CapacitorApp.exitApp(),
	),
);

// FR-001-03, FR-002-03: re-check the stored server, then read the account;
// a page that asked first may have started it already (FR-009-03).
onMounted(() => {
	void session.whenLaunched();
});
</script>
