<template>
	<div class="download-bar" role="status">
		<template v-if="run.status === 'running'">
			<div class="line">{{ progress.text }}</div>
			<IonProgressBar :type="progress.fraction === null ? 'indeterminate' : 'determinate'" :value="progress.fraction ?? 0" />
		</template>
		<div v-else class="line">
			<span class="summary">{{ summary }}</span>
			<IonButton v-if="run.stopReason === 'unauthenticated'" size="small" fill="clear" @click="emit('signIn')">Sign in</IonButton>
			<IonButton v-else-if="run.failed.length > 0" size="small" fill="clear" @click="emit('retry')">Retry failed</IonButton>
			<IonButton size="small" fill="clear" aria-label="Dismiss" @click="emit('dismiss')">
				<IonIcon slot="icon-only" :icon="close" />
			</IonButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { IonButton, IonIcon, IonProgressBar } from "@ionic/vue";
import { close } from "ionicons/icons";
import type { DownloadRun } from "@/stores/downloadRun";
import { downloadProgress, downloadSummary } from "@/utils/photoActionMessages";

/** UI-007-04: the running and finished states of a download run (FR-007-04). */
const props = defineProps<{ run: DownloadRun["state"] }>();
const emit = defineEmits<{ retry: []; dismiss: []; signIn: [] }>();

const progress = computed(() => downloadProgress(props.run));
const summary = computed(() => downloadSummary(props.run));
</script>

<style scoped>
.download-bar {
	padding: 8px 16px;
}

.line {
	display: flex;
	align-items: center;
	gap: 8px;
	min-height: 32px;
}

.summary {
	flex: 1;
}
</style>
