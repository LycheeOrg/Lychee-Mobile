<template>
	<div class="photo-slide">
		<template v-if="photo.kind === 'video'">
			<video
				v-if="videoSrc !== null && !failed"
				ref="videoEl"
				class="video"
				:src="videoSrc"
				:poster="poster"
				controls
				playsinline
				preload="metadata"
				@error="failed = true"
			/>
			<p v-else class="message">{{ VIDEO_FAILED }}</p>
		</template>

		<p v-else-if="image === null" class="message">{{ NOT_SHOWABLE }}</p>

		<template v-else>
			<img v-if="photo.thumb !== null && !loaded" class="backdrop" :src="photo.thumb.src" alt="" />
			<div
				class="swiper-zoom-container"
				@pointerdown="onPointerDown"
				@pointermove="hold.move($event.clientX, $event.clientY)"
				@pointerup="hold.up()"
				@pointercancel="hold.cancel()"
				@pointerleave="hold.cancel()"
				@contextmenu.prevent
			>
				<img class="image" :class="{ loaded }" :src="image.url" :alt="photo.title" @load="loaded = true" @error="failed = true" />
			</div>
			<video
				v-if="playingLive && photo.liveUrl !== null"
				class="live"
				:src="photo.liveUrl"
				muted
				playsinline
				autoplay
				loop
				@error="playingLive = false"
			/>
			<span v-if="photo.liveUrl !== null" class="live-badge" aria-label="Live photo"><IonIcon :icon="radioButtonOn" /> LIVE</span>
			<p v-if="failed" class="message overlay-message">{{ IMAGE_FAILED }}</p>
		</template>
	</div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { IonIcon } from "@ionic/vue";
import { radioButtonOn } from "ionicons/icons";
import type { PhotoTile } from "@/services/galleryParsers";
import { displayVariant, videoPoster, videoSource, zoomVariant } from "@/utils/photoVariant";
import { createPressAndHold } from "@/utils/pressAndHold";

const VIDEO_FAILED = "This video can't be played on this device.";
const NOT_SHOWABLE = "This file can't be shown.";
const IMAGE_FAILED = "Couldn't load this photo.";

// FR-004-03 … 06: one photo of the viewer.
const props = defineProps<{ photo: PhotoTile; active: boolean; useOriginal: boolean; zoomed: boolean }>();

const loaded = ref(false);
const failed = ref(false);
const playingLive = ref(false);
const videoEl = ref<HTMLVideoElement | null>(null);

const image = computed(() => {
	const original = props.useOriginal ? zoomVariant(props.photo.variants) : null;
	return original ?? displayVariant(props.photo.variants, window.devicePixelRatio);
});
const videoSrc = computed(() => videoSource(props.photo.variants));
const poster = computed(() => videoPoster(props.photo.variants));

const hold = createPressAndHold({
	onStart: () => {
		playingLive.value = true;
	},
	onEnd: () => {
		playingLive.value = false;
	},
});

function onPointerDown(event: PointerEvent): void {
	if (props.photo.liveUrl !== null && !props.zoomed) {
		hold.down(event.clientX, event.clientY);
	}
}

// FR-004-05: leaving the slide pauses a video; FR-004-06: and stops a live clip.
watch(
	() => props.active,
	(active) => {
		if (!active) {
			videoEl.value?.pause();
			hold.cancel();
		}
	},
);
watch(
	() => props.zoomed,
	(zoomed) => {
		if (zoomed) {
			hold.cancel();
		}
	},
);

onBeforeUnmount(() => hold.cancel());
</script>

<style scoped>
.photo-slide {
	position: relative;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #000;
	-webkit-touch-callout: none;
	user-select: none;
}

.backdrop,
.live {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.backdrop {
	filter: blur(8px);
}

.live {
	pointer-events: none;
}

.image {
	opacity: 0;
	transition: opacity 150ms;
	-webkit-touch-callout: none;
}

.image.loaded {
	opacity: 1;
}

.video {
	width: 100%;
	max-height: 100%;
}

.live-badge {
	position: absolute;
	top: calc(env(safe-area-inset-top) + 56px);
	left: 12px;
	display: flex;
	gap: 4px;
	align-items: center;
	padding: 2px 8px;
	border-radius: 12px;
	background: rgba(0, 0, 0, 0.5);
	color: #fff;
	font-size: 0.75rem;
	font-weight: 600;
	pointer-events: none;
}

.message {
	color: #ccc;
	text-align: center;
	padding: 0 24px;
}

.overlay-message {
	position: absolute;
	bottom: calc(env(safe-area-inset-bottom) + 24px);
	left: 0;
	right: 0;
}
</style>
