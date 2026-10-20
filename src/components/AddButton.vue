<template>
	<IonButton :disabled="picking" aria-label="Add" @click="openMenu">
		<IonIcon slot="icon-only" :icon="add" />
		<IonBadge v-if="left > 0 && !uploadSheet.open" class="badge">{{ left }}</IonBadge>
	</IonButton>
	<IonPopover :is-open="menuOpen" :event="menuEvent" @did-dismiss="menuOpen = false">
		<IonContent>
			<IonList lines="none">
				<IonItem v-if="menu.upload !== null" button :detail="false" @click="choose(upload)">
					<IonIcon slot="start" :icon="cloudUploadOutline" />
					<IonLabel>Upload photos</IonLabel>
				</IonItem>
				<IonItem v-if="menu.upload !== null && hasCamera" button :detail="false" @click="choose(photograph)">
					<IonIcon slot="start" :icon="cameraOutline" />
					<IonLabel>Take photo</IonLabel>
				</IonItem>
				<IonItem v-if="menu.createIn !== null" button :detail="false" @click="choose(create)">
					<IonIcon slot="start" :icon="folderOutline" />
					<IonLabel>Create album</IonLabel>
				</IonItem>
			</IonList>
		</IonContent>
	</IonPopover>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { alertController, IonBadge, IonButton, IonContent, IonIcon, IonItem, IonLabel, IonList, IonPopover } from "@ionic/vue";
import { add, cameraOutline, cloudUploadOutline, folderOutline } from "ionicons/icons";
import { cameraAvailable, takePhoto } from "@/services/camera";
import { pickForUpload } from "@/services/picker";
import { createAlbumIn, MAX_TITLE_LENGTH, promptForAlbum, type AddMenu } from "@/stores/addMenu";
import { currentGalleryContext } from "@/stores/galleryContext";
import { pendingCaptures } from "@/stores/pendingCaptures";
import { serverStore } from "@/stores/server";
import { uploadQueue } from "@/stores/uploadQueue";
import { uploadSheet } from "@/stores/uploadSheet";
import { captureFailureMessage, pickFailureMessage } from "@/utils/uploadMessages";

/**
 * FR-010-01: the toolbar's "+" with Upload photos (FR-005-01, FR-005-02) and
 * Create album (FR-010-03); it keeps the upload badge (UI-005-01).
 */
const props = defineProps<{ menu: AddMenu }>();
const emit = defineEmits<{ created: [id: string] }>();

const picking = ref(false);
const menuOpen = ref(false);
const menuEvent = ref<Event | undefined>(undefined);
const left = computed(() => uploadQueue.remaining());
// FR-011-01: Take photo only on phones with a camera.
const hasCamera = ref(false);

onMounted(async () => {
	hasCamera.value = await cameraAvailable();
});

function openMenu(event: Event): void {
	menuEvent.value = event;
	menuOpen.value = true;
}

function choose(action: () => Promise<void>): void {
	menuOpen.value = false;
	void action();
}

async function upload(): Promise<void> {
	const target = props.menu.upload;
	if (target === null) {
		return;
	}
	picking.value = true;
	const outcome = await pickForUpload();
	picking.value = false;
	if (outcome.kind === "picked" && outcome.files.length > 0) {
		uploadQueue.add(outcome.files, target.albumId);
		uploadSheet.open = true;
	} else if (outcome.kind === "permission_denied" || outcome.kind === "failed") {
		const alert = await alertController.create({ message: pickFailureMessage(outcome.kind), buttons: ["OK"] });
		await alert.present();
	}
}

/** FR-011-02, FR-011-04: the photo is recorded as pending before it is queued, so it is never lost. */
async function photograph(): Promise<void> {
	const target = props.menu.upload;
	const server = serverStore.state.saved?.url;
	if (target === null || server === undefined) {
		return;
	}
	const outcome = await takePhoto();
	if (outcome.kind === "taken") {
		await pendingCaptures.record({ file: outcome.file, albumId: target.albumId, server });
		uploadQueue.add([outcome.file], target.albumId);
		uploadSheet.open = true;
	} else if (outcome.kind !== "cancelled") {
		const alert = await alertController.create({ message: captureFailureMessage(outcome.kind), buttons: ["OK"] });
		await alert.present();
	}
}

async function create(): Promise<void> {
	const into = props.menu.createIn;
	const ctx = currentGalleryContext();
	if (into === null || ctx === null) {
		return;
	}
	const id = await promptForAlbum({ ask: askTitle, create: (title) => createAlbumIn(ctx, into.parentId, title) });
	if (id !== null) {
		emit("created", id);
	}
}

/** FR-010-03: the title dialog; resolves the title, or `null` on Cancel. */
async function askTitle(initial: string, message: string | null): Promise<string | null> {
	const alert = await alertController.create({
		header: "New album",
		message: message ?? undefined,
		inputs: [{ name: "title", value: initial, placeholder: "Title", attributes: { maxlength: MAX_TITLE_LENGTH, autocapitalize: "sentences" } }],
		buttons: [
			{ text: "Cancel", role: "cancel" },
			{ text: "Create", role: "confirm" },
		],
	});
	await alert.present();
	const { data, role } = await alert.onDidDismiss<{ values: { title?: string } }>();
	return role === "confirm" ? (data?.values.title ?? "") : null;
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
