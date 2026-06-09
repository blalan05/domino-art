<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/lib/api';

const projects = ref<Array<{ id: string; name: string; type: string; thumbnail: string | null; updatedAt: string }>>([]);

onMounted(async () => {
  const data = await api.discover();
  projects.value = data.projects;
});
</script>

<template>
  <v-container class="py-8">
    <h1 class="text-h4 mb-6">Discover public plans</h1>
    <v-row>
      <v-col v-for="project in projects" :key="project.id" cols="12" md="4">
        <v-card>
          <v-card-title>{{ project.name }}</v-card-title>
          <v-card-subtitle>{{ project.type }} · {{ new Date(project.updatedAt).toLocaleDateString() }}</v-card-subtitle>
        </v-card>
      </v-col>
    </v-row>
    <p v-if="!projects.length" class="text-medium-emphasis">No public projects yet.</p>
  </v-container>
</template>
