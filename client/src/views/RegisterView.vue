<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const email = ref('');
const password = ref('');
const displayName = ref('');
const handle = ref('');

async function submit() {
  await auth.register({
    email: email.value,
    password: password.value,
    displayName: displayName.value,
    handle: handle.value || undefined,
  });
  await router.push('/dashboard');
}
</script>

<template>
  <v-container class="py-12" style="max-width: 520px">
    <v-card class="pa-6">
      <h1 class="text-h5 mb-4">Create account</h1>
      <v-alert v-if="auth.error" type="error" class="mb-4">{{ auth.error }}</v-alert>
      <v-form @submit.prevent="submit">
        <v-text-field v-model="displayName" label="Display name" required />
        <v-text-field v-model="handle" label="Handle (optional)" hint="@username" />
        <v-text-field v-model="email" label="Email" type="email" required />
        <v-text-field v-model="password" label="Password" type="password" required />
        <v-btn type="submit" color="primary" block :loading="auth.loading">Sign up</v-btn>
      </v-form>
    </v-card>
  </v-container>
</template>
