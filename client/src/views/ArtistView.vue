<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { User } from '@domino-art/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const auth = useAuthStore();
const artist = ref<User | null>(null);
const projects = ref<Array<{ id: string; name: string; type: string; thumbnail: string | null; updatedAt: string }>>([]);

onMounted(async () => {
  const data = await api.artist(String(route.params.handle)) as {
    artist: User;
    projects: typeof projects.value;
  };
  artist.value = data.artist;
  projects.value = data.projects;
});

async function follow() {
  if (!artist.value) return;
  await api.follow(artist.value.id);
}
</script>

<template>
  <v-container v-if="artist" class="py-8">
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4">@{{ artist.handle }}</h1>
        <p>{{ artist.displayName }}</p>
        <p class="text-medium-emphasis">{{ artist.bio || 'Domino artist' }}</p>
      </div>
      <v-btn v-if="auth.isAuthenticated" color="primary" @click="follow">Follow</v-btn>
    </div>
    <v-row>
      <v-col v-for="project in projects" :key="project.id" cols="12" md="4">
        <v-card>
          <v-card-title>{{ project.name }}</v-card-title>
          <v-card-subtitle>{{ project.type }}</v-card-subtitle>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
