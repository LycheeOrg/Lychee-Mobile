<template>
	<IonPage>
		<IonHeader :translucent="true">
			<IonToolbar>
				<IonButtons slot="start">
					<IonBackButton default-href="/settings" />
				</IonButtons>
				<IonTitle>Sign in</IonTitle>
			</IonToolbar>
		</IonHeader>

		<IonContent :fullscreen="true" class="ion-padding">
			<p v-if="host !== null" class="server">{{ host }}</p>
			<p v-if="account.passwordRejected !== null" class="message failure">Your password changed or was reset. Sign in again.</p>
			<IonList>
				<IonItem>
					<IonInput
						v-model="username"
						label="Username"
						label-placement="stacked"
						autocomplete="username"
						autocapitalize="off"
						:readonly="account.signingIn"
					/>
				</IonItem>
				<IonItem>
					<IonInput
						v-model="password"
						label="Password"
						label-placement="stacked"
						type="password"
						autocomplete="current-password"
						:readonly="account.signingIn"
						@keyup.enter="submit"
					/>
				</IonItem>
			</IonList>

			<p v-if="account.failure !== null" class="message failure">{{ signInFailureMessage(account.failure) }}</p>

			<IonButton expand="block" :disabled="!canSubmit" @click="submit">
				<IonSpinner v-if="account.signingIn" name="crescent" />
				<span v-else>Sign in</span>
			</IonButton>
			<IonButton expand="block" fill="clear" :disabled="account.signingIn" @click="leave">Continue as guest</IonButton>

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
import { otherMethodsNote, signInFailureMessage } from "@/utils/accountMessages";

const router = useIonRouter();
const account = accountStore.state;
const username = ref("");
const password = ref("");

const host = computed(() => (serverStore.state.saved === null ? null : new URL(serverStore.state.saved.url).host));
const canSubmit = computed(() => !account.signingIn && username.value.trim() !== "" && password.value !== "");
const note = computed(() => otherMethodsNote(account.otherMethods));

// FR-002-06: needs a stored server; FR-002-07: note for other methods.
onIonViewWillEnter(async () => {
	accountStore.clearFailure();
	// FR-006-03: the stored password was rejected; keep the username.
	if (account.passwordRejected !== null) {
		username.value = account.passwordRejected;
	}
	if (serverStore.state.saved === null) {
		await serverStore.load();
	}
	if (serverStore.state.saved === null) {
		leave();
		return;
	}
	void accountStore.loadOtherMethods(serverStore.state.saved.url);
});

async function submit(): Promise<void> {
	const saved = serverStore.state.saved;
	if (!canSubmit.value || saved === null) {
		return;
	}
	const signedIn = await accountStore.signIn(saved.url, username.value.trim(), password.value);
	// NFR-002-01: the password never outlives the attempt.
	password.value = "";
	if (signedIn) {
		leave();
	}
}

// FR-003-08: signed in or not, the album list becomes the root.
function leave(): void {
	accountStore.clearPasswordRejected();
	router.navigate("/albums", "root", "replace");
}
</script>

<style scoped>
.server {
	margin: 0 4px 8px;
	color: var(--ion-color-medium);
}

.message {
	margin: 8px 4px 16px;
	font-size: 0.9rem;
}

.failure {
	color: var(--ion-color-danger);
}

.note {
	margin: 16px 4px 0;
	font-size: 0.85rem;
	color: var(--ion-color-medium);
}
</style>
