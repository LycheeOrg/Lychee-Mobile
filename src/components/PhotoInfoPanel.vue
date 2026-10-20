<template>
	<div class="photo-info">
		<h1>About</h1>

		<div class="header">
			<IonIcon class="kind" :icon="photo.kind === 'video' ? videocamOutline : imageOutline" />
			<div>
				<div class="name">{{ photo.title }}</div>
				<div class="muted">{{ sizeLine }}</div>
			</div>
		</div>

		<div class="muted dates">
			<div v-if="d.createdAt !== ''" class="line"><IonIcon :icon="cloudUploadOutline" />{{ d.createdAt }}</div>
			<div v-if="d.takenAt !== null" class="line taken">
				<IonIcon :icon="cameraOutline" />{{ d.takenAt }}<span v-if="d.takenAtModified" class="modified">*</span>
			</div>
		</div>

		<template v-if="d.description !== ''">
			<h2>Description</h2>
			<p class="description">{{ d.description }}</p>
		</template>

		<template v-if="d.tags.length > 0">
			<h2>Tags</h2>
			<div class="tags">
				<span v-for="tag in d.tags" :key="tag" class="tag">{{ tag }}</span>
			</div>
		</template>

		<template v-if="albums?.kind !== 'unsupported'">
			<h2>Albums</h2>
			<div v-if="albums === undefined || albums.kind === 'loading'" class="muted line"><IonSpinner name="dots" />Loading albums…</div>
			<div v-else-if="albums.kind === 'ok' && albums.albums.length === 0" class="muted">In no album you can see</div>
			<ul v-else-if="albums.kind === 'ok'" class="albums">
				<li v-for="album in albums.albums" :key="album.id">{{ album.title }}</li>
			</ul>
			<div v-else class="muted">Couldn't load albums</div>
		</template>

		<template v-if="showsExif">
			<h2>EXIF data</h2>
			<div class="muted exif">
				<div v-if="camera !== ''" class="line wide"><IonIcon :icon="cameraOutline" />{{ camera }}</div>
				<div v-if="d.lens !== ''" class="line wide"><IonIcon :icon="apertureOutline" />{{ d.lens }}</div>
				<div v-if="d.aperture !== ''" class="line"><IonIcon :icon="apertureOutline" />ƒ / {{ d.aperture }}</div>
				<div v-if="d.focal !== ''" class="line"><IonIcon :icon="scanOutline" />{{ d.focal }}</div>
				<div v-if="d.shutter !== ''" class="line"><IonIcon :icon="timerOutline" />{{ d.shutter }}</div>
				<div v-if="d.iso !== ''" class="line"><IonIcon :icon="sunnyOutline" />{{ d.iso }}</div>
			</div>
		</template>

		<template v-if="showsLocation">
			<h2>Location</h2>
			<StaticMap
				v-if="mapAllowed && mapProvider !== null && point !== null"
				:layer="mapProvider.layer"
				:attribution="mapProvider.attribution"
				:latitude="point.latitude"
				:longitude="point.longitude"
				@open="openMaps"
			/>
			<button v-if="coordinates !== ''" type="button" class="muted coordinates" :disabled="point === null" @click="openMaps">
				{{ coordinates }}
			</button>
			<div v-if="d.address !== ''" class="address">{{ d.address }}</div>
		</template>

		<template v-if="d.license !== ''">
			<h2>License</h2>
			<div class="muted">{{ d.license }}</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { IonIcon, IonSpinner } from "@ionic/vue";
import {
	apertureOutline,
	cameraOutline,
	cloudUploadOutline,
	imageOutline,
	scanOutline,
	sunnyOutline,
	timerOutline,
	videocamOutline,
} from "ionicons/icons";
import StaticMap from "@/components/StaticMap.vue";
import type { MapProvider, PhotoTile } from "@/services/galleryParsers";
import type { PhotoAlbumsState } from "@/stores/photoAlbums";
import { cameraLine, mapsUrl } from "@/utils/photoInfo";

/**
 * FR-008-02 … 06: Lychee's About panel for one photo. Everything is shown as
 * text (NFR-008-02); sections without content are left out.
 */
const props = defineProps<{
	photo: PhotoTile;
	albums: PhotoAlbumsState | undefined;
	mapProvider: MapProvider | null;
	/** `Album::head` `config.is_map_accessible`. */
	mapAllowed: boolean;
	platform: string;
}>();
const emit = defineEmits<{ open: [url: string] }>();

const d = computed(() => props.photo.details);
const sizeLine = computed(() => {
	const video = props.photo.kind === "video" ? [d.value.duration, d.value.fps] : [];
	return [d.value.resolution, ...video, d.value.filesize].filter((part) => part !== "").join("   ");
});
const camera = computed(() => cameraLine(d.value.make, d.value.model));
const showsExif = computed(
	() =>
		d.value.hasExif && [camera.value, d.value.lens, d.value.aperture, d.value.focal, d.value.shutter, d.value.iso].some((value) => value !== ""),
);
const coordinates = computed(() => [d.value.latitudeText, d.value.longitudeText, d.value.altitudeText].filter((part) => part !== "").join("   "));
const point = computed(() =>
	d.value.latitude === null || d.value.longitude === null ? null : { latitude: d.value.latitude, longitude: d.value.longitude },
);
const showsLocation = computed(() => d.value.hasLocation && (coordinates.value !== "" || d.value.address !== "" || point.value !== null));

function openMaps(): void {
	if (point.value !== null) {
		emit("open", mapsUrl(props.platform, point.value.latitude, point.value.longitude));
	}
}
</script>

<style scoped>
.photo-info {
	padding: 8px 20px 32px;
}

h1 {
	margin: 8px 0 16px;
	font-size: 1.5rem;
	font-weight: 700;
	text-align: center;
}

h2 {
	margin: 20px 0 6px;
	font-size: 1rem;
	font-weight: 700;
}

.muted {
	color: var(--ion-color-medium);
	font-size: 0.875rem;
}

.header {
	display: flex;
	gap: 12px;
	align-items: center;
	margin-bottom: 8px;
}

.kind {
	font-size: 44px;
	color: var(--ion-color-medium);
}

.name {
	font-weight: 700;
	font-size: 1.1rem;
	word-break: break-all;
}

.line {
	display: flex;
	gap: 8px;
	align-items: center;
	padding: 2px 0;
}

.line ion-icon {
	flex: none;
	font-size: 18px;
}

.modified {
	color: var(--ion-color-warning);
}

.description {
	margin: 0;
	white-space: pre-line;
}

.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.tag {
	padding: 4px 10px;
	border-radius: 999px;
	font-size: 0.75rem;
	background: var(--ion-color-step-150, rgba(0, 0, 0, 0.1));
}

.albums {
	margin: 0;
	padding: 0;
	list-style: none;
}

.exif {
	display: grid;
	grid-template-columns: 1fr 1fr;
	column-gap: 12px;
}

.exif .wide {
	grid-column: 1 / -1;
}

.coordinates {
	display: block;
	width: 100%;
	margin-top: 6px;
	padding: 0;
	border: 0;
	background: none;
	text-align: left;
	white-space: pre;
}

.address {
	margin-top: 4px;
	font-size: 0.875rem;
}
</style>
