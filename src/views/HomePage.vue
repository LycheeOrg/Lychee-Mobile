<template>
	<IonPage>
		<IonHeader :translucent="true">
			<IonToolbar>
				<IonTitle>Lychee</IonTitle>
			</IonToolbar>
		</IonHeader>

		<IonContent :fullscreen="true" class="ion-padding">
			<div v-if="state.launchFailure !== null && state.saved !== null" class="launch-banner" role="alert">
				<p>{{ hostOf(state.saved.url) }}: {{ failureMessage(state.launchFailure) }}</p>
				<IonButton size="small" fill="outline" color="warning" :disabled="retrying" @click="retry">Retry</IonButton>
			</div>

			<p>Connect to your Lychee server.</p>
			<IonList>
				<IonItem>
					<IonInput
						v-model="serverInput"
						label="Server address"
						label-placement="stacked"
						type="url"
						inputmode="url"
						autocapitalize="off"
						placeholder="photos.example.com"
						:readonly="state.status === 'checking'"
						@keyup.enter="connect"
					/>
				</IonItem>
			</IonList>

			<p v-if="state.status === 'failed' && state.failure !== null" class="message failure">{{ failureMessage(state.failure) }}</p>
			<p v-else-if="state.status === 'connected' && state.saved !== null" class="message connected">
				✓ {{ connectedMessage(state.saved.version) }}
			</p>

			<IonButton expand="block" :disabled="state.status === 'checking'" @click="connect">
				<IonSpinner v-if="state.status === 'checking'" name="crescent" />
				<span v-else>Connect</span>
			</IonButton>
		</IonContent>
	</IonPage>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { IonButton, IonContent, IonHeader, IonInput, IonItem, IonList, IonPage, IonSpinner, IonTitle, IonToolbar } from "@ionic/vue";
import { serverStore } from "@/stores/server";
import { connectedMessage, failureMessage } from "@/utils/serverMessages";

const { state } = serverStore;
const serverInput = ref("");
const retrying = ref(false);

onMounted(async () => {
	await serverStore.load();
	serverInput.value = state.saved?.url ?? "";
});

async function connect(): Promise<void> {
	await serverStore.connect(serverInput.value);
	if (state.status === "connected" && state.saved !== null) {
		serverInput.value = state.saved.url;
	}
}

async function retry(): Promise<void> {
	retrying.value = true;
	await serverStore.launchCheck();
	retrying.value = false;
}

function hostOf(url: string): string {
	return new URL(url).host;
}
</script>

<style scoped>
.launch-banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 16px;
	padding: 8px 12px;
	border-radius: 8px;
	background: rgba(var(--ion-color-warning-rgb), 0.15);
	color: var(--ion-color-warning-shade);
}

.launch-banner p {
	margin: 0;
}

.message {
	margin: 8px 4px 16px;
	font-size: 0.9rem;
}

.failure {
	color: var(--ion-color-danger);
}

.connected {
	color: var(--ion-color-success);
}
</style>
