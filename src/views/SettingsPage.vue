<template>
	<IonPage>
		<IonHeader :translucent="true">
			<IonToolbar>
				<IonButtons v-if="state.saved !== null" slot="start">
					<IonBackButton default-href="/albums" />
				</IonButtons>
				<IonTitle>Settings</IonTitle>
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

			<div v-if="state.saved !== null && account.status !== 'unknown'" class="account">
				<span v-if="account.status === 'signed_in'">Signed in as {{ account.account?.username }}</span>
				<span v-else>Not signed in</span>
				<IonButton v-if="account.status === 'signed_in'" size="small" fill="outline" :disabled="signingOut" @click="signOut"
					>Sign out</IonButton
				>
				<IonButton v-else size="small" fill="outline" router-link="/login">Sign in</IonButton>
			</div>
		</IonContent>
	</IonPage>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
	IonBackButton,
	IonButton,
	IonButtons,
	IonContent,
	IonHeader,
	IonInput,
	IonItem,
	IonList,
	IonPage,
	IonSpinner,
	IonTitle,
	IonToolbar,
	useIonRouter,
} from "@ionic/vue";
import { accountStore } from "@/stores/account";
import { serverStore } from "@/stores/server";
import { session } from "@/stores/session";
import { connectedMessage, failureMessage } from "@/utils/serverMessages";

const { state } = serverStore;
const account = accountStore.state;
const router = useIonRouter();
const serverInput = ref("");
const retrying = ref(false);
const signingOut = ref(false);

onMounted(async () => {
	await serverStore.load();
	serverInput.value = state.saved?.url ?? "";
});

// FR-002-05, FR-003-08: a signed-out session continues to the sign-in page,
// anything else to the album list.
async function connect(): Promise<void> {
	const next = await session.connect(serverInput.value);
	if (state.status === "connected" && state.saved !== null) {
		serverInput.value = state.saved.url;
	}
	if (next === "sign_in") {
		router.push("/login");
	} else if (next === "albums") {
		router.navigate("/albums", "root", "replace");
	}
}

async function retry(): Promise<void> {
	retrying.value = true;
	await session.launch();
	retrying.value = false;
}

async function signOut(): Promise<void> {
	if (state.saved === null) {
		return;
	}
	signingOut.value = true;
	await accountStore.signOut(state.saved.url);
	signingOut.value = false;
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

.account {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin: 16px 4px 0;
}
</style>
