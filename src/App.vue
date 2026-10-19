<template>
	<IonApp>
		<IonRouterOutlet />
	</IonApp>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { IonApp, IonRouterOutlet } from "@ionic/vue";
import { serverStore } from "@/stores/server";

// FR-001-03: re-check the stored server at every launch.
onMounted(() => {
	void serverStore.launchCheck();
});
</script>
