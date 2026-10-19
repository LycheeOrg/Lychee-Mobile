<template>
	<IonApp>
		<IonRouterOutlet />
		<UploadSheet />
	</IonApp>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { IonApp, IonRouterOutlet } from "@ionic/vue";
import UploadSheet from "@/components/UploadSheet.vue";
import { accountStore } from "@/stores/account";
import { session } from "@/stores/session";

const router = useRouter();

// FR-006-03: a silent login found the stored password rejected.
watch(
	() => accountStore.state.passwordRejected,
	(username) => {
		if (username !== null) {
			void router.push("/login");
		}
	},
);

// FR-001-03, FR-002-03: re-check the stored server, then read the account.
onMounted(() => {
	void session.launch();
});
</script>
