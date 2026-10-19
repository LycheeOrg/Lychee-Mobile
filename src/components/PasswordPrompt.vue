<template>
	<div class="password-prompt">
		<p>{{ message }}</p>
		<IonList>
			<IonItem>
				<IonInput v-model="password" label="Password" label-placement="stacked" type="password" :readonly="unlocking" @keyup.enter="submit" />
			</IonItem>
		</IonList>
		<p v-if="failure !== null" class="failure">{{ failure }}</p>
		<IonButton expand="block" :disabled="unlocking || password === ''" @click="submit">
			<IonSpinner v-if="unlocking" name="crescent" />
			<span v-else>Unlock</span>
		</IonButton>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { IonButton, IonInput, IonItem, IonList, IonSpinner } from "@ionic/vue";

// FR-003-05: the password goes to `unlock` and is cleared right away (NFR-003-05).
defineProps<{ message: string; unlocking: boolean; failure: string | null }>();
const emit = defineEmits<{ unlock: [password: string] }>();

const password = ref("");

function submit(): void {
	if (password.value === "") {
		return;
	}
	emit("unlock", password.value);
	password.value = "";
}
</script>

<style scoped>
.failure {
	margin: 8px 4px 16px;
	font-size: 0.9rem;
	color: var(--ion-color-danger);
}
</style>
