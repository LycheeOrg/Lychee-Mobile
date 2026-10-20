<template>
	<IonModal :is-open="uploadSheet.open" :initial-breakpoint="0.5" :breakpoints="[0, 0.5, 1]" @did-dismiss="uploadSheet.open = false">
		<IonHeader>
			<IonToolbar>
				<IonTitle>Uploads</IonTitle>
				<IonButtons slot="end">
					<IonButton aria-label="Close" @click="uploadSheet.open = false"><IonIcon slot="icon-only" :icon="close" /></IonButton>
				</IonButtons>
			</IonToolbar>
		</IonHeader>
		<IonContent class="ion-padding">
			<p v-if="entries.length === 0" class="empty">No uploads.</p>
			<IonList v-else>
				<IonItem v-for="entry in entries" :key="entry.id">
					<IonLabel>
						<h3>{{ entry.file.name }}</h3>
						<IonProgressBar v-if="entry.state === 'uploading'" :value="entry.sent / Math.max(entry.file.size, 1)" />
						<p :class="[entry.state, { warning: entry.result?.kind === 'done' && entry.result.withoutLocation }]">
							{{ entryStatus(entry) }}
						</p>
					</IonLabel>
					<IonButton v-if="entry.state === 'failed'" slot="end" size="small" fill="outline" @click="uploadQueue.retry(entry.id)"
						>Retry</IonButton
					>
					<IonButton
						v-if="entry.state === 'failed' && pendingCaptures.isPending(entry.file.path)"
						slot="end"
						size="small"
						fill="clear"
						color="danger"
						@click="discard(entry.file.path)"
						>{{ pendingCaptures.cleanupOf(entry.file.path) === "capture" ? "Delete photo" : "Remove" }}</IonButton
					>
				</IonItem>
			</IonList>
			<IonButton v-if="hasFinished" expand="block" fill="clear" @click="uploadQueue.clearFinished()">Clear finished</IonButton>
		</IonContent>
	</IonModal>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
	alertController,
	IonButton,
	IonButtons,
	IonContent,
	IonHeader,
	IonIcon,
	IonItem,
	IonLabel,
	IonList,
	IonModal,
	IonProgressBar,
	IonTitle,
	IonToolbar,
} from "@ionic/vue";
import { close } from "ionicons/icons";
import { pendingCaptures } from "@/stores/pendingCaptures";
import { uploadQueue } from "@/stores/uploadQueue";
import { uploadSheet } from "@/stores/uploadSheet";
import { DISCARD_PHOTO, entryStatus } from "@/utils/uploadMessages";

// FR-005-04, UI-005-02: every file's progress and result; Retry; Clear finished.
const entries = computed(() => uploadQueue.state.entries);
const hasFinished = computed(() => entries.value.some((entry) => entry.state === "done" || entry.state === "skipped"));

/**
 * FR-011-06: a taken photo that can't upload can be deleted, after a
 * confirmation; FR-012-04: a picked file is only removed from the uploads,
 * its original stays on the phone.
 */
async function discard(path: string): Promise<void> {
	if (pendingCaptures.cleanupOf(path) !== "capture") {
		await pendingCaptures.discard(path);
		return;
	}
	const confirm = await alertController.create({
		message: DISCARD_PHOTO,
		buttons: [
			{ text: "Cancel", role: "cancel" },
			{ text: "Delete", role: "destructive" },
		],
	});
	await confirm.present();
	if ((await confirm.onDidDismiss()).role === "destructive") {
		await pendingCaptures.discard(path);
	}
}
</script>

<style scoped>
.empty {
	color: var(--ion-color-medium);
	text-align: center;
}

.done {
	color: var(--ion-color-success);
}

.failed {
	color: var(--ion-color-danger);
}

/* NFR-005-04: uploaded, but without GPS data. */
.done.warning {
	color: var(--ion-color-warning-shade);
}
</style>
