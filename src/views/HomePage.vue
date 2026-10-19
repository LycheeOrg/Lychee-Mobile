<template>
	<IonPage>
		<IonHeader :translucent="true">
			<IonToolbar>
				<IonTitle>Lychee</IonTitle>
			</IonToolbar>
		</IonHeader>

		<IonContent :fullscreen="true" class="ion-padding">
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
						:error-text="errorText"
						:class="{ 'ion-invalid ion-touched': errorText !== undefined }"
					/>
				</IonItem>
			</IonList>
			<IonButton expand="block" @click="save">Save</IonButton>
			<p v-if="savedUrl !== null">Server: {{ savedUrl }}</p>
		</IonContent>
	</IonPage>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { IonButton, IonContent, IonHeader, IonInput, IonItem, IonList, IonPage, IonTitle, IonToolbar } from "@ionic/vue";
import { Preferences } from "@capacitor/preferences";
import { normalizeServerUrl } from "@/utils/serverUrl";

const SERVER_URL_KEY = "server_url";

const serverInput = ref("");
const savedUrl = ref<string | null>(null);
const errorText = ref<string | undefined>(undefined);

onMounted(async () => {
	savedUrl.value = (await Preferences.get({ key: SERVER_URL_KEY })).value;
	serverInput.value = savedUrl.value ?? "";
});

async function save(): Promise<void> {
	const url = normalizeServerUrl(serverInput.value);
	errorText.value = url === null ? "Enter an http or https address." : undefined;
	if (url === null) {
		return;
	}

	await Preferences.set({ key: SERVER_URL_KEY, value: url });
	savedUrl.value = url;
	serverInput.value = url;
}
</script>
