<template>
	<IonButton :disabled="picking" aria-label="Upload" @click="upload">
		<IonIcon slot="icon-only" :icon="cloudUploadOutline" />
		<IonBadge v-if="left > 0 && !uploadSheet.open" class="badge">{{ left }}</IonBadge>
	</IonButton>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { alertController, IonBadge, IonButton, IonIcon } from "@ionic/vue";
import { cloudUploadOutline } from "ionicons/icons";
import { pickForUpload } from "@/services/picker";
import { uploadQueue, type UploadTarget } from "@/stores/uploadQueue";
import { uploadSheet } from "@/stores/uploadSheet";
import { pickFailureMessage } from "@/utils/uploadMessages";

// FR-005-01, FR-005-02, UI-005-01: pick files and queue them for `target`.
const props = defineProps<{ target: UploadTarget }>();

const picking = ref(false);
const left = computed(() => uploadQueue.remaining());

async function upload(): Promise<void> {
	picking.value = true;
	const outcome = await pickForUpload();
	picking.value = false;
	if (outcome.kind === "picked" && outcome.files.length > 0) {
		uploadQueue.add(outcome.files, props.target.albumId);
		uploadSheet.open = true;
	} else if (outcome.kind === "permission_denied" || outcome.kind === "failed") {
		const alert = await alertController.create({ message: pickFailureMessage(outcome.kind), buttons: ["OK"] });
		await alert.present();
	}
}
</script>

<style scoped>
.badge {
	position: absolute;
	top: 2px;
	right: 0;
	font-size: 0.6rem;
}
</style>
