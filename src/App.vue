<template>
	<IonApp>
		<IonRouterOutlet />
	</IonApp>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { IonApp, IonRouterOutlet } from "@ionic/vue";
import { session } from "@/stores/session";

// FR-001-03, FR-002-03: re-check the stored server, then read the account.
onMounted(() => {
	void session.launch();
});
</script>
