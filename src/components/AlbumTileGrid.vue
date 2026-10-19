<template>
	<div class="album-grid">
		<button v-for="album in albums" :key="album.id" type="button" class="album-tile" @click="emit('open', album.id)">
			<div class="cover">
				<ThumbImage :thumb="album.thumb" :alt="album.title" :blurred="blurNsfw && album.isNsfw" :placeholder-icon="albumsOutline" />
				<span v-if="album.isLocked" class="badge" aria-label="Locked"><IonIcon :icon="lockClosed" /></span>
			</div>
			<span class="title">{{ album.title }}</span>
			<span v-if="album.photoCount !== null" class="count">{{ album.photoCount }}</span>
		</button>
	</div>
</template>

<script setup lang="ts">
import { IonIcon } from "@ionic/vue";
import { albumsOutline, lockClosed } from "ionicons/icons";
import ThumbImage from "@/components/ThumbImage.vue";
import type { AlbumTile } from "@/services/galleryParsers";

// FR-003-01, FR-003-09: album tiles with cover, title, count and lock.
defineProps<{ albums: readonly AlbumTile[]; blurNsfw: boolean }>();
const emit = defineEmits<{ open: [id: string] }>();
</script>

<style scoped>
.album-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

@media (min-width: 600px) {
	.album-grid {
		grid-template-columns: repeat(5, minmax(0, 1fr));
	}
}

@media (min-width: 900px) {
	.album-grid {
		grid-template-columns: repeat(7, minmax(0, 1fr));
	}
}

.album-tile {
	display: flex;
	flex-direction: column;
	padding: 0;
	border: 0;
	background: none;
	color: inherit;
	text-align: left;
	font: inherit;
}

.cover {
	position: relative;
	aspect-ratio: 1;
	overflow: hidden;
	border-radius: 8px;
}

.badge {
	position: absolute;
	right: 6px;
	bottom: 6px;
	display: flex;
	padding: 4px;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.55);
	color: #fff;
}

.title {
	margin-top: 4px;
	overflow: hidden;
	font-size: 0.85rem;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.count {
	font-size: 0.75rem;
	color: var(--ion-color-medium);
}
</style>
