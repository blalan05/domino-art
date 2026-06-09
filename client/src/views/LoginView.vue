<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const email = ref('');
const password = ref('');

async function submit() {
  await auth.login({ email: email.value, password: password.value });
  await router.push(String(route.query.redirect ?? '/dashboard'));
}
</script>

<template>
  <v-container class="py-12" style="max-width: 480px">
    <v-card class="pa-6">
      <h1 class="text-h5 mb-4">Login</h1>
      <v-alert v-if="auth.error" type="error" class="mb-4">{{ auth.error }}</v-alert>
      <v-form @submit.prevent="submit">
        <v-text-field v-model="email" label="Email" type="email" required />
        <v-text-field v-model="password" label="Password" type="password" required />
        <v-btn type="submit" color="primary" block :loading="auth.loading">Login</v-btn>
      </v-form>
      <p class="mt-4">No account? <router-link to="/register">Sign up</router-link></p>
    </v-card>
  </v-container>
</template>
