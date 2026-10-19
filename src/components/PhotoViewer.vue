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
			<IonButton fill="clear" color="light" aria-label="Close" @click="emit('close')">
				<IonIcon slot="icon-only" :icon="close" />
			</IonButton>
			<span class="title">{{ photos[activeIndex]?.title ?? "" }}</span>
			<span class="counter">{{ counterText(activeIndex, total, photos.length) }}</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { IonButton, IonIcon } from "@ionic/vue";
import { close } from "ionicons/icons";
import Swiper from "swiper";
import { Virtual, Zoom } from "swiper/modules";
import type { VirtualData } from "swiper/types";
import "swiper/css";
import "swiper/css/virtual";
import "swiper/css/zoom";
import PhotoSlide from "@/components/PhotoSlide.vue";
import type { PhotoTile } from "@/services/galleryParsers";
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
/* The viewer's modal covers the whole screen, also on tablets. */
ion-modal.photo-viewer-modal {
	--width: 100%;
	--height: 100%;
	--border-radius: 0;
	--background: #000;
}
</style>
