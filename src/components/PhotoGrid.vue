<template>
	<div class="photo-grid">
		<div v-for="photo in photos" :key="photo.id" class="photo-tile">
			<ThumbImage :thumb="photo.thumb" :alt="photo.title" />
			<span v-if="photo.kind === 'video'" class="badge" aria-label="Video"><IonIcon :icon="play" /></span>
			<span v-else-if="photo.kind === 'live'" class="badge" aria-label="Live photo"><IonIcon :icon="radioButtonOn" /></span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { IonIcon } from "@ionic/vue";
import { play, radioButtonOn } from "ionicons/icons";
import ThumbImage from "@/components/ThumbImage.vue";
import type { PhotoTile } from "@/services/galleryParsers";

// FR-003-02, FR-003-03: square thumbnails; display-only until the viewer (Feature 004).
defineProps<{ photos: readonly PhotoTile[] }>();
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
}

.badge {
	position: absolute;
	top: 6px;
	right: 6px;
	display: flex;
	color: #fff;
	filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.8));
}
</style>
