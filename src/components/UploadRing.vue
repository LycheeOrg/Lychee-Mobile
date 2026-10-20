<template>
	<IonButton v-if="shown !== 'hidden'" aria-label="Uploads" @click="uploadSheet.open = true">
		<span v-if="shown === 'done'" class="done"><IonIcon :icon="checkmarkCircle" /></span>
		<span v-else-if="shown === 'failed'" class="failed"><IonIcon :icon="alertCircle" /></span>
		<svg v-else class="ring" viewBox="0 0 24 24" aria-hidden="true">
			<circle class="track" cx="12" cy="12" :r="RADIUS" />
			<circle
				class="progress"
				cx="12"
				cy="12"
				:r="RADIUS"
				:stroke-dasharray="CIRCUMFERENCE"
				:stroke-dashoffset="CIRCUMFERENCE * (1 - fraction)"
			/>
		</svg>
	</IonButton>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { IonButton, IonIcon } from "@ionic/vue";
import { alertCircle, checkmarkCircle } from "ionicons/icons";
import { uploadQueue } from "@/stores/uploadQueue";
import { uploadSheet } from "@/stores/uploadSheet";
import { ringState, type RingSource } from "@/utils/uploadRing";

/**
 * FR-012-01: the toolbar's progress ring for the current upload run; ✓ for a
 * few seconds after a clean run, a warning while failed files remain; a tap
 * opens the upload sheet (FR-012-02).
 */
const props = withDefaults(defineProps<{ queue?: RingSource }>(), { queue: () => uploadQueue.state });

const RADIUS = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DONE_MS = 3000;

const ring = computed(() => ringState(props.queue));
const fraction = computed(() => (ring.value.kind === "progress" ? ring.value.fraction : 0));
const done = ref(false);
let doneTimer: ReturnType<typeof setTimeout> | undefined;

watch(
	() => ring.value.kind,
	(kind, previous) => {
		if (previous === "progress" && kind === "hidden") {
			done.value = true;
			clearTimeout(doneTimer);
			doneTimer = setTimeout(() => {
				done.value = false;
			}, DONE_MS);
		} else if (kind !== "hidden") {
			done.value = false;
		}
	},
);

onBeforeUnmount(() => clearTimeout(doneTimer));

const shown = computed(() => (ring.value.kind === "hidden" ? (done.value ? "done" : "hidden") : ring.value.kind));
</script>

<style scoped>
.ring {
	width: 24px;
	height: 24px;
	transform: rotate(-90deg);
}

.track,
.progress {
	fill: none;
	stroke-width: 3;
}

.track {
	stroke: var(--ion-color-step-200, rgba(127, 127, 127, 0.3));
}

.progress {
	stroke: var(--ion-color-primary);
	stroke-linecap: round;
	transition: stroke-dashoffset 0.3s ease;
}

.done,
.failed {
	display: flex;
	font-size: 24px;
}

.done {
	color: var(--ion-color-success);
}

.failed {
	color: var(--ion-color-warning);
}
</style>
