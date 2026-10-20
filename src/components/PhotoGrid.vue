<template>
	<div class="photo-grid">
		<button
			v-for="(photo, index) in photos"
			:key="photo.id"
			type="button"
			class="photo-tile"
			:class="{ selected: isSelected(photo.id) }"
			:data-photo-id="photo.id"
			:aria-pressed="selecting ? isSelected(photo.id) : undefined"
			@pointerdown="down(photo.id, $event)"
			@pointermove="hold.move($event.clientX, $event.clientY)"
			@pointerup="hold.up()"
			@pointercancel="hold.cancel()"
			@pointerleave="hold.cancel()"
			@contextmenu.prevent
			@click="tap(photo.id, index)"
		>
			<ThumbImage :thumb="photo.thumb" :alt="photo.title" />
			<span v-if="photo.kind === 'video'" class="badge" aria-label="Video"><IonIcon :icon="play" /></span>
			<span v-else-if="photo.kind === 'live'" class="badge" aria-label="Live photo"><IonIcon :icon="radioButtonOn" /></span>
			<span v-if="isSelected(photo.id)" class="check"><IonIcon :icon="checkmarkCircle" /></span>
		</button>
	</div>
</template>

<script setup lang="ts">
import { IonIcon } from "@ionic/vue";
import { checkmarkCircle, play, radioButtonOn } from "ionicons/icons";
import ThumbImage from "@/components/ThumbImage.vue";
import type { PhotoTile } from "@/services/galleryParsers";
import { createPressAndHold } from "@/utils/pressAndHold";

/**
 * FR-003-02, FR-003-03: square thumbnails; FR-004-01: a tap opens the viewer.
 * FR-007-01: holding a tile selects it; in selection mode a tap toggles.
 */
const props = defineProps<{
	photos: readonly PhotoTile[];
	selecting: boolean;
	selected: readonly string[];
	/** Whether holding a tile may start selection mode (FR-007-02). */
	selectable: boolean;
}>();
const emit = defineEmits<{ open: [index: number]; hold: [id: string]; toggle: [id: string] }>();

/** FR-007-01: 500 ms, as on the platforms' own galleries. */
const HOLD_MS = 500;

let held: string | null = null;
// The click that ends a hold must neither open nor toggle the photo.
let swallowClick = false;
const hold = createPressAndHold({
	delayMs: HOLD_MS,
	onStart: () => {
		if (held !== null) {
			swallowClick = true;
			emit("hold", held);
		}
	},
	onEnd: () => undefined,
});

function down(id: string, event: PointerEvent): void {
	swallowClick = false;
	if (!props.selectable || props.selecting) {
		return;
	}
	held = id;
	hold.down(event.clientX, event.clientY);
}

function tap(id: string, index: number): void {
	if (swallowClick) {
		swallowClick = false;
		return;
	}
	if (props.selecting) {
		emit("toggle", id);
	} else {
		emit("open", index);
	}
}

function isSelected(id: string): boolean {
	return props.selecting && props.selected.includes(id);
}
</script>

<style scoped>
.photo-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 2px;
}

@media (min-width: 600px) {
	.photo-grid {
		grid-template-columns: repeat(5, minmax(0, 1fr));
	}
}

@media (min-width: 900px) {
	.photo-grid {
		grid-template-columns: repeat(7, minmax(0, 1fr));
	}
}

.photo-tile {
	position: relative;
	aspect-ratio: 1;
	overflow: hidden;
	padding: 0;
	border: 0;
	background: none;
	/* No system callout or text selection on a long press (FR-007-01). */
	-webkit-touch-callout: none;
	user-select: none;
}

.photo-tile.selected :deep(img) {
	opacity: 0.6;
}

.badge {
	position: absolute;
	top: 6px;
	right: 6px;
	display: flex;
	color: #fff;
	filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.8));
}

.check {
	position: absolute;
	bottom: 6px;
	right: 6px;
	display: flex;
	font-size: 24px;
	color: var(--ion-color-primary);
	background: #fff;
	border-radius: 50%;
}
</style>
