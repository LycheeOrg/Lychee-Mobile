<template>
	<div class="photo-viewer">
		<div ref="container" class="swiper">
			<div class="swiper-wrapper">
				<div v-for="(photo, i) in rendered.slides" :key="photo.id" class="swiper-slide" :style="{ left: `${rendered.offset}px` }">
					<PhotoSlide
						:photo="photo"
						:active="rendered.from + i === activeIndex"
						:use-original="originals.has(photo.id)"
						:zoomed="rendered.from + i === activeIndex && zoomed"
					/>
				</div>
			</div>
		</div>

		<div v-show="chromeVisible" class="overlay">
			<IonButton class="overlay-button" fill="clear" aria-label="Close" @click="emit('close')">
				<IonIcon slot="icon-only" :icon="close" />
			</IonButton>
			<span class="title">{{ photos[activeIndex]?.title ?? "" }}</span>
			<span class="counter">{{ counterText(activeIndex, total, photos.length) }}</span>
			<IonButton v-if="infoAllowed" class="overlay-button" fill="clear" aria-label="Info" @click="openInfo">
				<IonIcon slot="icon-only" :icon="informationCircleOutline" />
			</IonButton>
		</div>

		<IonModal
			class="photo-info-sheet"
			:is-open="infoOpen"
			:breakpoints="[0, 0.5, 1]"
			:initial-breakpoint="0.5"
			:backdrop-breakpoint="0.75"
			@did-dismiss="infoOpen = false"
		>
			<IonContent>
				<PhotoInfoPanel
					v-if="infoPhoto !== undefined"
					:photo="infoPhoto"
					:albums="albums.state.byPhoto[infoPhoto.id]"
					:map-provider="mapProvider"
					:map-allowed="mapAllowed"
					:platform="platform"
					@open="openExternal"
				/>
			</IonContent>
		</IonModal>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { Capacitor } from "@capacitor/core";
import { IonButton, IonContent, IonIcon, IonModal } from "@ionic/vue";
import { close, informationCircleOutline } from "ionicons/icons";
import Swiper from "swiper";
import { Virtual, Zoom } from "swiper/modules";
import type { VirtualData } from "swiper/types";
import "swiper/css";
import "swiper/css/virtual";
import "swiper/css/zoom";
import PhotoInfoPanel from "@/components/PhotoInfoPanel.vue";
import PhotoSlide from "@/components/PhotoSlide.vue";
import type { MapProvider, PhotoTile } from "@/services/galleryParsers";
import type { GalleryContext } from "@/stores/galleryContext";
import { createPhotoAlbums } from "@/stores/photoAlbums";
import { createSingleTap } from "@/utils/singleTap";
import { counterText, shouldLoadMore } from "@/utils/viewerSlides";

// FR-004-01 … 07, ADR-004-01: Swiper with Zoom and Virtual; Vue renders the
// slides Swiper asks for (`renderExternal`).
const props = defineProps<{
	photos: readonly PhotoTile[];
	startIndex: number;
	total: number;
	hasMore: boolean;
	loadMore: () => Promise<void>;
	/** FR-008-01: false when the server disables EXIF for all. */
	infoAllowed: boolean;
	/** FR-008-05: `Album::head` `config.is_map_accessible`. */
	mapAllowed: boolean;
	/** For the info panel's album list (FR-008-06). */
	galleryContext: () => GalleryContext | null;
}>();
const emit = defineEmits<{ close: []; index: [index: number] }>();

type Rendered = { offset: number; from: number; slides: PhotoTile[] };

const container = ref<HTMLElement | null>(null);
const rendered = shallowRef<Rendered>({ offset: 0, from: 0, slides: [] });
const activeIndex = ref(props.startIndex);
const zoomed = ref(false);
const originals = ref(new Set<string>());
const chromeVisible = ref(true);
let swiper: Swiper | undefined;
let loadingMore = false;

// FR-008-01: the info panel follows the photo on screen while it is open.
const infoOpen = ref(false);
const infoPhoto = computed(() => props.photos[activeIndex.value]);
const albums = createPhotoAlbums();
const mapProvider = ref<MapProvider | null>(null);
const platform = Capacitor.getPlatform();

async function openInfo(): Promise<void> {
	infoOpen.value = true;
	const ctx = props.galleryContext();
	if (ctx !== null && mapProvider.value === null) {
		mapProvider.value = await ctx.gallery.mapProvider();
	}
}

watch([infoOpen, infoPhoto], ([open, photo]) => {
	const ctx = props.galleryContext();
	if (open && photo !== undefined && ctx !== null) {
		void albums.load(ctx, photo.id);
	}
});

/** NC-008-01: Capacitor hands navigations outside the app (`geo:`, `maps://`) to the OS. */
function openExternal(url: string): void {
	window.location.href = url;
}

const taps = createSingleTap(() => {
	chromeVisible.value = !chromeVisible.value;
});

onMounted(() => {
	if (container.value === null) {
		return;
	}
	swiper = new Swiper(container.value, {
		modules: [Virtual, Zoom],
		initialSlide: props.startIndex,
		zoom: { maxRatio: 4, toggle: true },
		virtual: {
			slides: [...props.photos],
			renderExternalUpdate: false,
			renderExternal: (data: VirtualData<unknown>) => {
				rendered.value = { offset: data.offset, from: data.from, slides: data.slides as PhotoTile[] };
				// Vue renders on the next tick; then Swiper measures the new slides.
				void nextTick(() => {
					if (swiper !== undefined && !swiper.destroyed) {
						swiper.updateSlides();
						swiper.updateProgress();
						swiper.updateSlidesClasses();
					}
				});
			},
		},
		on: {
			slideChange(s) {
				activeIndex.value = s.activeIndex;
				zoomed.value = false;
				emit("index", s.activeIndex);
				void maybeLoadMore();
			},
			zoomChange(s, scale) {
				zoomed.value = scale > 1;
				const photo = props.photos[s.activeIndex];
				if (scale > 1.5 && photo !== undefined && !originals.value.has(photo.id)) {
					originals.value = new Set([...originals.value, photo.id]);
				}
			},
			tap: () => taps.tap(),
			doubleTap: () => taps.doubleTap(),
		},
	});
	emit("index", props.startIndex);
	void maybeLoadMore();
});

// FR-004-02: new pages from the album page model become new slides.
watch(
	() => props.photos.length,
	() => {
		if (swiper !== undefined && !swiper.destroyed) {
			swiper.virtual.slides = [...props.photos];
			swiper.virtual.update(true);
		}
	},
);

async function maybeLoadMore(): Promise<void> {
	if (loadingMore || !shouldLoadMore(activeIndex.value, props.photos.length, props.hasMore)) {
		return;
	}
	loadingMore = true;
	await props.loadMore();
	loadingMore = false;
}

onBeforeUnmount(() => {
	taps.dispose();
	swiper?.destroy(true, false);
});
</script>

<style scoped>
.photo-viewer {
	position: relative;
	width: 100%;
	height: 100%;
	background: #000;
}

.swiper {
	width: 100%;
	height: 100%;
}

.overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	z-index: 10;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: env(safe-area-inset-top) 12px 0 0;
	background: linear-gradient(rgba(0, 0, 0, 0.6), transparent);
	color: #fff;
}

/* FR-009-02: white on black in both themes; Ionic's "light" is dark grey in dark mode. */
.overlay-button {
	--color: #fff;
	filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.8));
}

.title {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.counter {
	font-size: 0.85rem;
	opacity: 0.8;
}
</style>

<style>
/* FR-008-01: the info sheet stays readable on tablets. */
ion-modal.photo-info-sheet {
	--max-width: 600px;
}

/* The viewer's modal covers the whole screen, also on tablets. */
ion-modal.photo-viewer-modal {
	--width: 100%;
	--height: 100%;
	--border-radius: 0;
	--background: #000;
}
</style>
