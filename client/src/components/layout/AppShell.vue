<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();

onMounted(() => {
  void auth.bootstrap();
});
</script>

<template>
  <v-layout class="fill-height">
    <v-app-bar color="surface" elevation="1" class="no-print">
      <v-app-bar-title>
        <router-link to="/" class="text-decoration-none text-white">Domino Art</router-link>
      </v-app-bar-title>
      <v-spacer />
      <v-btn variant="text" to="/discover">Discover</v-btn>
      <template v-if="auth.isAuthenticated">
        <v-btn variant="text" to="/dashboard">Dashboard</v-btn>
        <v-btn variant="text" to="/colors">Colors</v-btn>
        <v-btn variant="text" :to="`/@${auth.user?.handle}`">Profile</v-btn>
        <v-btn variant="outlined" color="primary" @click="auth.logout()">Logout</v-btn>
      </template>
      <template v-else>
        <v-btn variant="text" to="/login">Login</v-btn>
        <v-btn variant="flat" color="primary" to="/register">Sign up</v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <router-view :key="route.fullPath" />
    </v-main>
  </v-layout>
</template>
