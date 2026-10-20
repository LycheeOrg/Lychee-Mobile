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
import { keepAliveRunner } from "@/stores/keepAlive";
import { pendingCaptures } from "@/stores/pendingCaptures";
import { session } from "@/stores/session";
import { uploadQueue } from "@/stores/uploadQueue";
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

// FR-012-03: keep the app alive while an upload run lasts.
watch(
	() => uploadQueue.state,
	(queue) => void keepAliveRunner.sync(queue),
	{ deep: true },
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
onMounted(async () => {
	await session.whenLaunched();
	// FR-011-04: taken photos not yet in Lychee upload again, now and whenever the app returns.
	await pendingCaptures.resume();
	await CapacitorApp.addListener("resume", () => void pendingCaptures.resume());
});
</script>
