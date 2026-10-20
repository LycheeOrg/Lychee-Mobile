<template>
	<IonPage>
		<IonHeader :translucent="true">
			<IonToolbar>
				<IonTitle>Lychee</IonTitle>
				<IonButtons slot="end">
					<AddButton v-if="state.status === 'ready' && hasItems(addMenu)" :menu="addMenu" @created="openCreated" />
					<IonButton router-link="/settings" aria-label="Settings">
						<IonIcon slot="icon-only" :icon="settingsOutline" />
					</IonButton>
				</IonButtons>
			</IonToolbar>
		</IonHeader>

		<IonContent :fullscreen="true" class="ion-padding">
			<IonRefresher slot="fixed" @ion-refresh="refresh">
				<IonRefresherContent />
			</IonRefresher>

			<div v-if="state.status === 'loading'" class="center"><IonSpinner /></div>
			<GalleryMessage v-else-if="state.status === 'too_old'" :text="TOO_OLD" />
			<GalleryMessage
				v-else-if="state.status === 'failed' && state.failure !== null"
				:text="listFailureMessage(state.failure)"
				action-label="Retry"
				@action="retry"
			/>
			<GalleryMessage
				v-else-if="state.status === 'sign_in'"
				:text="signInNeededMessage(state.sessionEnded)"
				action-label="Sign in"
				@action="router.push('/settings')"
			/>
			<template v-else-if="state.status === 'gallery_locked'">
				<PasswordPrompt
					:message="GALLERY_PASSWORD"
					:unlocking="state.unlocking"
					:failure="state.unlockFailure === null ? null : unlockFailureMessage(state.unlockFailure)"
					@unlock="unlock"
				/>
				<IonButton expand="block" fill="clear" router-link="/settings">Sign in instead</IonButton>
			</template>
			<template v-else>
				<GalleryMessage v-if="view.sections.length === 0 && view.hiddenCount === 0" :text="EMPTY_LIST" />
				<section v-for="section in view.sections" :key="section.key" class="section">
					<h2>{{ sectionTitle(section.key) }}</h2>
					<AlbumTileGrid :albums="section.albums" :blur-nsfw="sensitiveDisplay.settings.nsfwBlurred" @open="open" />
				</section>
				<div v-if="view.hiddenCount > 0" class="hidden-line">
					<span>{{ hiddenSensitiveMessage(view.hiddenCount) }}</span>
					<IonButton size="small" fill="outline" @click="list.revealSensitive()">Show</IonButton>
				</div>
			</template>
		</IonContent>
	</IonPage>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import {
	IonButton,
	IonButtons,
	IonContent,
	IonHeader,
	IonIcon,
	IonPage,
	IonRefresher,
	IonRefresherContent,
	IonSpinner,
	IonTitle,
	IonToolbar,
	onIonViewWillEnter,
	useIonRouter,
	type RefresherCustomEvent,
} from "@ionic/vue";
import { settingsOutline } from "ionicons/icons";
import AlbumTileGrid from "@/components/AlbumTileGrid.vue";
import AddButton from "@/components/AddButton.vue";
import GalleryMessage from "@/components/GalleryMessage.vue";
import PasswordPrompt from "@/components/PasswordPrompt.vue";
import { addMenuForRoot, hasItems } from "@/stores/addMenu";
import { createAlbumList } from "@/stores/albumList";
import { currentGalleryContext, galleryKey } from "@/stores/galleryContext";
import { sensitiveDisplay } from "@/stores/sensitive";
import { serverStore } from "@/stores/server";
import { session } from "@/stores/session";
import { uploadQueue } from "@/stores/uploadQueue";
import {
	EMPTY_LIST,
	GALLERY_PASSWORD,
	hiddenSensitiveMessage,
	listFailureMessage,
	sectionTitle,
	signInNeededMessage,
	TOO_OLD,
	unlockFailureMessage,
} from "@/utils/galleryMessages";

const router = useIonRouter();
const list = createAlbumList();
const state = list.state;
const view = computed(() => list.view());
let loadedKey: string | null = null;
// FR-010-02: upload into Unsorted and create top-level albums.
const addMenu = computed(() => addMenuForRoot({ canUpload: state.canUpload, canEdit: state.canEdit }));
// FR-010-03: an album created from here shows when the user comes back.
let stale = false;

// FR-003-08: no server → settings. FR-003-01: reload when the server or account changed.
onIonViewWillEnter(async () => {
	await session.whenLaunched();
	if (serverStore.state.saved === null) {
		router.replace("/settings");
		return;
	}
	if (galleryKey() !== loadedKey || stale) {
		stale = false;
		await load();
	}
});

// FR-005-05: reload after uploads into Unsorted.
watch(
	() => uploadQueue.state.finishedRuns,
	() => {
		if (uploadQueue.state.lastDoneAlbums.has(null)) {
			void load();
		}
	},
);

async function load(): Promise<void> {
	const ctx = currentGalleryContext();
	if (ctx === null) {
		return;
	}
	loadedKey = galleryKey();
	await list.load(ctx, serverStore.state.saved?.version ?? null);
}

async function refresh(event: RefresherCustomEvent): Promise<void> {
	await load();
	await event.target.complete();
}

async function retry(): Promise<void> {
	await session.launch();
	await load();
}

async function unlock(password: string): Promise<void> {
	const ctx = currentGalleryContext();
	if (ctx !== null) {
		await list.unlock(ctx, password);
	}
}

/** FR-010-03: opens the new album. */
function openCreated(id: string): void {
	stale = true;
	open(id);
}

function open(id: string): void {
	router.push(`/albums/${encodeURIComponent(id)}`);
}
</script>

<style scoped>
.center {
	display: flex;
	justify-content: center;
	margin-top: 32px;
}

.section h2 {
	margin: 16px 4px 8px;
	font-size: 1rem;
	font-weight: 600;
}

.hidden-line {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin: 24px 4px 0;
	color: var(--ion-color-medium);
}
</style>
