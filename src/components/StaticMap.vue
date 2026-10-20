<template>
	<button type="button" class="static-map" aria-label="Open in Maps" @click="emit('open')">
		<img
			v-for="tile in tiles"
			:key="tile.url + tile.left"
			class="tile"
			:src="tile.url"
			alt=""
			draggable="false"
			:style="{ left: `calc(50% + ${tile.left}px)`, top: `calc(50% + ${tile.top}px)` }"
		/>
		<IonIcon class="marker" :icon="location" />
		<span v-if="attribution !== ''" class="attribution">{{ attribution }}</span>
	</button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { IonIcon } from "@ionic/vue";
import { location } from "ionicons/icons";
import { mapTiles } from "@/utils/photoInfo";

/** FR-008-05, ADR-008-01: tiles around the point from Lychee's provider, a marker on the point. */
const props = defineProps<{ layer: string; attribution: string; latitude: number; longitude: number }>();
const emit = defineEmits<{ open: [] }>();

const tiles = computed(() => mapTiles(props.layer, props.latitude, props.longitude));
</script>

<style scoped>
.static-map {
	position: relative;
	display: block;
	width: 100%;
	height: 180px;
	overflow: hidden;
	padding: 0;
	border: 0;
	border-radius: 8px;
	background: var(--ion-color-step-150, #ddd);
}

.tile {
	position: absolute;
	width: 256px;
	height: 256px;
	max-width: none;
}

.marker {
	position: absolute;
	left: 50%;
	top: 50%;
	font-size: 36px;
	color: var(--ion-color-primary);
	transform: translate(-50%, -100%);
	filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.attribution {
	position: absolute;
	right: 0;
	bottom: 0;
	padding: 1px 4px;
	font-size: 10px;
	color: #333;
	background: rgba(255, 255, 255, 0.8);
}
</style>
