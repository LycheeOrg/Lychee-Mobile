<template>
	<IonPage>
		<IonHeader :translucent="true">
			<IonToolbar>
				<IonButtons slot="start">
					<IonBackButton default-href="/albums" />
				</IonButtons>
				<IonTitle>{{ state.title }}</IonTitle>
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
				@action="router.push('/login')"
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
				<PhotoGrid :photos="state.photos" />
				<GalleryMessage v-if="state.albums.length === 0 && state.photos.length === 0 && !state.hasMore" :text="EMPTY_ALBUM" />
				<GalleryMessage v-if="state.moreFailed" :text="LOAD_MORE_FAILED" action-label="Retry" @action="more" />
			</template>

			<IonInfiniteScroll :disabled="state.status !== 'ready' || !state.hasMore || state.moreFailed" @ion-infinite="infinite">
				<IonInfiniteScrollContent />
			</IonInfiniteScroll>
		</IonContent>
	</IonPage>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import {
	IonBackButton,
	IonButton,
	IonButtons,
	IonContent,
	IonHeader,
	IonInfiniteScroll,
	IonInfiniteScrollContent,
	IonPage,
	IonRefresher,
	IonRefresherContent,
	IonSpinner,
	IonTitle,
	IonToolbar,
	onIonViewWillEnter,
	useIonRouter,
	type InfiniteScrollCustomEvent,
	type RefresherCustomEvent,
} from "@ionic/vue";
import AlbumTileGrid from "@/components/AlbumTileGrid.vue";
import GalleryMessage from "@/components/GalleryMessage.vue";
import PasswordPrompt from "@/components/PasswordPrompt.vue";
import PhotoGrid from "@/components/PhotoGrid.vue";
import { createAlbumPage } from "@/stores/albumPage";
import { currentGalleryContext } from "@/stores/galleryContext";
import { sensitiveDisplay, showsSensitive, visibleAlbums } from "@/stores/sensitive";
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

const router = useIonRouter();
const albumId = String(useRoute().params.id);
const album = createAlbumPage(albumId);
const state = album.state;
const subAlbums = computed(() => visibleAlbums([...state.albums], showsSensitive(sensitiveDisplay)));
const retryable = computed(() => state.failure === "unreachable" || state.failure === "failed");
let loaded = false;

// Loaded on first entry; Back keeps the page and its scroll position (FR-003-02).
onIonViewWillEnter(async () => {
	if (!loaded || state.status === "sign_in") {
		loaded = true;
		await load();
	}
});

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
