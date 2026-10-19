<template>
	<div class="gallery-message">
		<p>{{ text }}</p>
		<IonButton v-if="actionLabel !== undefined" expand="block" @click="emit('action')">{{ actionLabel }}</IonButton>
		<slot />
	</div>
</template>

<script setup lang="ts">
import { IonButton } from "@ionic/vue";

// UI-003-03: a message with an optional action.
defineProps<{ text: string; actionLabel?: string }>();
const emit = defineEmits<{ action: [] }>();
</script>

<style scoped>
.gallery-message {
	margin: 32px 4px;
	text-align: center;
}
</style>
