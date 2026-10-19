<template>
	<img
		v-if="thumb !== null && !broken"
		class="thumb-image"
		:class="{ blurred }"
		:src="thumb.src"
		:srcset="thumb.src2x === null ? undefined : `${thumb.src} 1x, ${thumb.src2x} 2x`"
		:alt="alt"
		loading="lazy"
		decoding="async"
		@error="broken = true"
	/>
	<div v-else class="thumb-image placeholder" role="img" :aria-label="alt">
		<IonIcon :icon="placeholderIcon" />
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { IonIcon } from "@ionic/vue";
import { imageOutline } from "ionicons/icons";
import type { Thumb } from "@/services/galleryParsers";

// FR-003-03, ADR-003-02: the server's URL as is; a placeholder when there is
// none or it fails to load.
const props = withDefaults(defineProps<{ thumb: Thumb | null; alt: string; blurred?: boolean; placeholderIcon?: string }>(), {
	blurred: false,
	placeholderIcon: imageOutline,
});

const broken = ref(false);
watch(
	() => props.thumb?.src,
	() => {
		broken.value = false;
	},
);
</script>

<style scoped>
.thumb-image {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.blurred {
	filter: blur(16px);
	transform: scale(1.1);
}

.placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--ion-color-step-100, #e6e6e6);
	color: var(--ion-color-medium);
	font-size: 2rem;
}
</style>
