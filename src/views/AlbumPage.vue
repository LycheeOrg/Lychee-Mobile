<template>
	<IonPage>
		<IonHeader :translucent="true">
			<IonToolbar>
				<IonButtons slot="start">
					<IonButton v-if="selection.state.active" @click="selection.clear()">Cancel</IonButton>
					<IonBackButton v-else default-href="/albums" />
				</IonButtons>
				<IonTitle>{{ selection.state.active ? selectionTitle(selection.count()) : state.title }}</IonTitle>
				<IonButtons v-if="!selection.state.active" slot="end">
					<IonButton v-if="canSelect" @click="selection.start()">Select</IonButton>
					<AddButton v-if="state.status === 'ready' && hasItems(addMenu)" :menu="addMenu" @created="openCreated" />
				</IonButtons>
			</IonToolbar>
		</IonHeader>

		<IonContent :fullscreen="true" class="ion-padding">
			<IonRefresher slot="fixed" @ion-refresh="refresh">
				<IonRefresherContent />
			</IonRefresher>

			<div v-if="state.status === 'loading'" class="center"><IonSpinner /></div>
			<GalleryMessage
				v-else-if="state.status === 'failed' && state.failure !== null"
				:text="albumFailureMessage(state.failure)"
				:action-label="retryable ? 'Retry' : undefined"
				@action="load"
			/>
			<GalleryMessage
				v-else-if="state.status === 'sign_in'"
				:text="signInNeededMessage(state.sessionEnded)"
				action-label="Sign in"
				@action="router.push('/settings')"
			/>
			<PasswordPrompt
				v-else-if="state.status === 'password'"
				:message="ALBUM_PASSWORD"
				:unlocking="state.unlocking"
				:failure="state.unlockFailure === null ? null : unlockFailureMessage(state.unlockFailure)"
				@unlock="unlock"
			/>
			<GalleryMessage v-else-if="state.status === 'sensitive'" :text="SENSITIVE_WARNING" action-label="Continue" @action="continueSensitive">
				<IonButton expand="block" fill="clear" @click="router.back()">Back</IonButton>
			</GalleryMessage>
			<template v-else>
				<AlbumTileGrid
					v-if="subAlbums.albums.length > 0"
					class="sub-albums"
					:albums="subAlbums.albums"
					:blur-nsfw="sensitiveDisplay.settings.nsfwBlurred"
					@open="open"
				/>
				<div v-if="subAlbums.hiddenCount > 0" class="hidden-line">
					<span>{{ hiddenSensitiveMessage(subAlbums.hiddenCount) }}</span>
					<IonButton size="small" fill="outline" @click="sensitiveDisplay.revealed = true">Show</IonButton>
				</div>
				<PhotoGrid
					:photos="state.photos"
					:selecting="selection.state.active"
					:selected="selection.state.ids"
					:selectable="canSelect"
					@open="openViewer"
					@hold="selection.start($event)"
					@toggle="selection.toggle($event)"
				/>
				<GalleryMessage v-if="state.albums.length === 0 && state.photos.length === 0 && !state.hasMore" :text="EMPTY_ALBUM" />
				<GalleryMessage v-if="state.moreFailed" :text="LOAD_MORE_FAILED" action-label="Retry" @action="more" />
			</template>

			<IonModal :is-open="viewerStart !== null" class="photo-viewer-modal" @did-dismiss="viewerClosed">
				<PhotoViewer
					v-if="viewerStart !== null"
					:photos="state.photos"
					:start-index="viewerStart"
					:total="state.photoTotal"
					:has-more="state.hasMore"
					:load-more="more"
					:info-allowed="!sensitiveDisplay.settings.exifDisabled"
					:map-allowed="state.mapAllowed"
					:gallery-context="currentGalleryContext"
					@index="viewerIndex = $event"
					@close="viewerStart = null"
				/>
			</IonModal>

			<IonInfiniteScroll :disabled="state.status !== 'ready' || !state.hasMore || state.moreFailed" @ion-infinite="infinite">
				<IonInfiniteScrollContent />
			</IonInfiniteScroll>
		</IonContent>

		<IonFooter v-if="selection.state.active || downloadRun.state.status !== 'idle'">
			<DownloadBar
				v-if="downloadRun.state.status !== 'idle'"
				:run="downloadRun.state"
				@retry="retryDownloads"
				@dismiss="downloadRun.dismiss()"
				@sign-in="router.push('/settings')"
			/>
			<IonToolbar v-if="selection.state.active">
				<div class="actions">
					<IonSpinner v-if="state.deleting" />
					<template v-else>
						<IonButton fill="clear" :disabled="!enabled.download" @click="download">
							<IonIcon slot="start" :icon="downloadOutline" />
							Download
						</IonButton>
						<IonButton fill="clear" color="danger" :disabled="!enabled.delete" @click="confirmDelete">
							<IonIcon slot="start" :icon="trashOutline" />
							Delete
						</IonButton>
					</template>
				</div>
			</IonToolbar>
		</IonFooter>
	</IonPage>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
	alertController,
	IonBackButton,
	IonButton,
	IonButtons,
	IonContent,
	IonFooter,
	IonHeader,
	IonIcon,
	IonInfiniteScroll,
	IonInfiniteScrollContent,
	IonModal,
	IonPage,
	IonRefresher,
	IonRefresherContent,
	IonSpinner,
	IonTitle,
	IonToolbar,
	onIonViewDidEnter,
	onIonViewWillEnter,
	onIonViewWillLeave,
	useBackButton,
	useIonRouter,
	type InfiniteScrollCustomEvent,
	type RefresherCustomEvent,
} from "@ionic/vue";
import { downloadOutline, trashOutline } from "ionicons/icons";
import AlbumTileGrid from "@/components/AlbumTileGrid.vue";
import DownloadBar from "@/components/DownloadBar.vue";
import GalleryMessage from "@/components/GalleryMessage.vue";
import PasswordPrompt from "@/components/PasswordPrompt.vue";
import PhotoGrid from "@/components/PhotoGrid.vue";
import PhotoViewer from "@/components/PhotoViewer.vue";
import AddButton from "@/components/AddButton.vue";
import type { PhotoTile } from "@/services/galleryParsers";
import { addMenuFor, hasItems } from "@/stores/addMenu";
import { createAlbumPage } from "@/stores/albumPage";
import { downloadRun } from "@/stores/downloadRun";
import { enabledActions, photoActionsFor } from "@/stores/photoRights";
import { currentGalleryContext } from "@/stores/galleryContext";
import { sensitiveDisplay, showsSensitive, visibleAlbums } from "@/stores/sensitive";
import { uploadQueue, uploadTargetFor } from "@/stores/uploadQueue";
import {
	ALBUM_PASSWORD,
	albumFailureMessage,
	EMPTY_ALBUM,
	hiddenSensitiveMessage,
	LOAD_MORE_FAILED,
	SENSITIVE_WARNING,
	signInNeededMessage,
	unlockFailureMessage,
} from "@/utils/galleryMessages";
import { DELETE_CONFIRM_TEXT, deleteConfirmTitle, deleteFailureMessage, SAVE_PERMISSION_DENIED, selectionTitle } from "@/utils/photoActionMessages";

const router = useIonRouter();
const albumId = String(useRoute().params.id);
const album = createAlbumPage(albumId);
const state = album.state;
const selection = album.selection;
const subAlbums = computed(() => visibleAlbums([...state.albums], showsSensitive(sensitiveDisplay)));
const retryable = computed(() => state.failure === "unreachable" || state.failure === "failed");
let loaded = false;
// FR-005-02: where this page's Upload button sends files, if anywhere.
const uploadTarget = computed(() => uploadTargetFor({ id: albumId, kind: state.kind, canUpload: state.canUpload }));

// FR-007-01, FR-007-02: selection is offered for any photos; the buttons follow the rights.
const actions = computed(() => photoActionsFor({ id: albumId, kind: state.kind, canDownload: state.canDownload, canDelete: state.canDelete }));
const enabled = computed(() => enabledActions(actions.value, selection.count()));
const canSelect = computed(() => state.status === "ready" && state.photos.length > 0);
// Ionic keeps earlier pages alive; only the visible one answers Back and shows alerts.
let visible = false;

// FR-010-02: the "+" menu of this album.
const addMenu = computed(() => addMenuFor({ id: albumId, kind: state.kind, canUpload: state.canUpload, canEdit: state.canEdit }));
// FR-010-03: a sub-album created from here shows when the user comes back.
let stale = false;

// FR-005-05: reload after uploads into this album.
watch(
	() => uploadQueue.state.finishedRuns,
	() => {
		const target = uploadTarget.value;
		if (target !== null && uploadQueue.state.lastDoneAlbums.has(target.albumId)) {
			void load();
		}
	},
);
// FR-004-01: the photo the viewer opened on, and the one it last showed.
const viewerStart = ref<number | null>(null);
const viewerIndex = ref(0);

// Loaded on first entry; Back keeps the page and its scroll position (FR-003-02).
onIonViewWillEnter(async () => {
	if (!loaded || state.status === "sign_in" || stale) {
		loaded = true;
		stale = false;
		await load();
	}
});

onIonViewDidEnter(() => {
	visible = true;
});

// FR-007-01: leaving the page ends selection mode.
onIonViewWillLeave(() => {
	visible = false;
	selection.clear();
});

// FR-007-01: Android back leaves selection mode before leaving the page.
useBackButton(15, (processNextHandler) => {
	if (visible && selection.state.active) {
		selection.clear();
		return;
	}
	processNextHandler();
});

// FR-007-05: a denied library permission stops the run; say why once.
watch(
	() => downloadRun.state.stopReason,
	async (reason) => {
		if (visible && reason === "permission_denied") {
			const alert = await alertController.create({ message: SAVE_PERMISSION_DENIED, buttons: ["OK"] });
			await alert.present();
		}
	},
);

async function load(): Promise<void> {
	const ctx = currentGalleryContext();
	if (ctx !== null) {
		await album.load(ctx);
	}
}

async function more(): Promise<void> {
	const ctx = currentGalleryContext();
	if (ctx !== null) {
		await album.loadMore(ctx);
	}
}

async function infinite(event: InfiniteScrollCustomEvent): Promise<void> {
	await more();
	await event.target.complete();
}

async function refresh(event: RefresherCustomEvent): Promise<void> {
	await load();
	await event.target.complete();
}

async function unlock(password: string): Promise<void> {
	const ctx = currentGalleryContext();
	if (ctx !== null) {
		await album.unlock(ctx, password);
	}
}

async function continueSensitive(): Promise<void> {
	const ctx = currentGalleryContext();
	if (ctx !== null) {
		await album.continueSensitive(ctx);
	}
}

function openViewer(index: number): void {
	viewerIndex.value = index;
	viewerStart.value = index;
}

// Closed by its button or Android's back button: show the last viewed photo in the grid.
async function viewerClosed(): Promise<void> {
	viewerStart.value = null;
	const photo = state.photos[viewerIndex.value];
	await nextTick();
	if (photo !== undefined) {
		document.querySelector(`[data-photo-id="${CSS.escape(photo.id)}"]`)?.scrollIntoView({ block: "center" });
	}
}

/** FR-007-03: confirm, delete, and explain a failure; a 401 the store can't fix shows sign-in instead. */
async function confirmDelete(): Promise<void> {
	const confirm = await alertController.create({
		header: deleteConfirmTitle(selection.count()),
		message: DELETE_CONFIRM_TEXT,
		buttons: [
			{ text: "Cancel", role: "cancel" },
			{ text: "Delete", role: "destructive" },
		],
	});
	await confirm.present();
	const { role } = await confirm.onDidDismiss();
	const ctx = currentGalleryContext();
	if (role !== "destructive" || ctx === null) {
		return;
	}
	const result = await album.deleteSelected(ctx);
	if (result !== "ok" && result !== "unauthenticated") {
		const failure = await alertController.create({ message: deleteFailureMessage(result), buttons: ["OK"] });
		await failure.present();
	}
}

/** FR-007-04: hands the selected photos to the app-wide run, in the order they were selected. */
function download(): void {
	const ctx = currentGalleryContext();
	if (ctx === null) {
		return;
	}
	const photos = selection
		.ids()
		.map((id) => state.photos.find((photo) => photo.id === id))
		.filter((photo): photo is PhotoTile => photo !== undefined);
	downloadRun.download(ctx, albumId, photos);
	selection.clear();
}

function retryDownloads(): void {
	const ctx = currentGalleryContext();
	if (ctx !== null) {
		downloadRun.retryFailed(ctx);
	}
}

/** FR-010-03: opens the new sub-album. */
function openCreated(id: string): void {
	stale = true;
	open(id);
}

function open(id: string): void {
	router.push(`/albums/${encodeURIComponent(id)}`);
}
</script>

<style scoped>
.actions {
	display: flex;
	justify-content: space-around;
	align-items: center;
}

.center {
	display: flex;
	justify-content: center;
	margin-top: 32px;
}

.sub-albums {
	margin-bottom: 16px;
}

.hidden-line {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin: 0 4px 16px;
	color: var(--ion-color-medium);
}
</style>
