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

			<p v-if="account.passwordRejected !== null" class="message failure">{{ PASSWORD_REJECTED }}</p>
			<p v-else>Connect to your Lychee server.</p>
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
						:readonly="saving"
					/>
				</IonItem>
				<IonItem>
					<IonInput
						v-model="username"
						label="Username"
						label-placement="stacked"
						autocomplete="username"
						autocapitalize="off"
						:readonly="saving"
					/>
				</IonItem>
				<IonItem>
					<IonInput
						v-model="password"
						label="Password"
						label-placement="stacked"
						type="password"
						autocomplete="current-password"
						:placeholder="hasStored ? KEEP_PASSWORD : ''"
						:readonly="saving"
						@keyup.enter="save"
					/>
				</IonItem>
			</IonList>

			<p v-if="state.status === 'failed' && state.failure !== null" class="message failure">{{ failureMessage(state.failure) }}</p>
			<p v-else-if="fieldMessage !== null" class="message failure">{{ fieldMessage }}</p>
			<p v-else-if="account.failure !== null && account.passwordRejected === null" class="message failure">
				{{ signInFailureMessage(account.failure) }}
			</p>
			<p v-else-if="state.status === 'connected' && state.saved !== null" class="message connected">
				✓ {{ connectedMessage(state.saved.version) }}
			</p>

			<IonButton expand="block" :disabled="saving" @click="save">
				<IonSpinner v-if="saving" name="crescent" />
				<span v-else>Save</span>
			</IonButton>

			<div v-if="state.saved !== null && account.status !== 'unknown'" class="account">
				<span v-if="account.status === 'signed_in'">Signed in as {{ account.account?.username }}</span>
				<span v-else>Not signed in</span>
				<IonButton v-if="account.status === 'signed_in'" size="small" fill="outline" :disabled="saving" @click="signOut">Sign out</IonButton>
			</div>
			<p v-if="note !== null" class="note">{{ note }}</p>
		</IonContent>
	</IonPage>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
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
	onIonViewWillEnter,
	useIonRouter,
} from "@ionic/vue";
import { accountStore } from "@/stores/account";
import { serverStore } from "@/stores/server";
import { session } from "@/stores/session";
import { KEEP_PASSWORD, otherMethodsNote, PASSWORD_REJECTED, saveOutcomeMessage, signInFailureMessage } from "@/utils/accountMessages";
import { connectedMessage, failureMessage } from "@/utils/serverMessages";

// FR-009-04: server address, username and password on one page (replaces the Sign in page).
const { state } = serverStore;
const account = accountStore.state;
const router = useIonRouter();
const serverInput = ref("");
const username = ref("");
const password = ref("");
const hasStored = ref(false);
const saving = ref(false);
const retrying = ref(false);
const fieldMessage = ref<string | null>(null);
const note = computed(() => otherMethodsNote(account.otherMethods));

onIonViewWillEnter(async () => {
	accountStore.clearFailure();
	fieldMessage.value = null;
	await serverStore.load();
	serverInput.value = state.saved?.url ?? "";
	const stored = await refreshStored();
	username.value = account.account?.username ?? account.passwordRejected ?? stored ?? "";
	if (state.saved !== null) {
		void accountStore.loadOtherMethods(state.saved.url);
	}
});

/** Whether a password is stored for the saved server, for the placeholder; returns its username. */
async function refreshStored(): Promise<string | null> {
	const stored = state.saved === null ? null : await accountStore.storedUsername(state.saved.url);
	hasStored.value = stored !== null;
	return stored;
}

// FR-009-04: success opens the album list as root; anything else stays here with its message.
async function save(): Promise<void> {
	saving.value = true;
	fieldMessage.value = null;
	accountStore.clearFailure();
	const outcome = await session.save({ server: serverInput.value, username: username.value, password: password.value });
	// NFR-002-01: the password never outlives the attempt.
	password.value = "";
	saving.value = false;
	if (state.saved !== null) {
		serverInput.value = state.saved.url;
	}
	await refreshStored();
	if (outcome === "albums") {
		accountStore.clearPasswordRejected();
		router.navigate("/albums", "root", "replace");
		return;
	}
	fieldMessage.value = saveOutcomeMessage(outcome);
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
	saving.value = true;
	await accountStore.signOut(state.saved.url);
	saving.value = false;
	await refreshStored();
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

.note {
	margin: 16px 4px 0;
	font-size: 0.85rem;
	color: var(--ion-color-medium);
}
</style>
