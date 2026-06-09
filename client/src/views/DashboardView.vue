<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';

const auth = useAuthStore();
const importInput = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  if (!auth.user) await auth.bootstrap();
});

async function onImportJson(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !auth.currentWorkspaceId) return;
  const payload = JSON.parse(await file.text());
  await api.importProject(auth.currentWorkspaceId, payload);
  await auth.refreshWorkspaceData();
}
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex justify-space-between align-center mb-6 flex-wrap ga-3">
      <div>
        <h1 class="text-h4">Dashboard</h1>
        <p class="text-medium-emphasis">Welcome back, {{ auth.user?.displayName }}</p>
      </div>
      <div class="d-flex ga-2 flex-wrap">
        <v-btn to="/" color="primary">New field plan</v-btn>
        <v-btn to="/wall" variant="outlined">New wall</v-btn>
        <v-btn to="/floor" variant="outlined">New floor plan</v-btn>
        <v-btn variant="outlined" @click="importInput?.click()">Import JSON</v-btn>
        <input ref="importInput" type="file" accept="application/json" hidden @change="onImportJson" />
      </div>
    </div>

    <v-row>
      <v-col cols="12" md="4">
        <v-card class="pa-4">
          <h3 class="text-h6">Workspace</h3>
          <p>{{ auth.currentWorkspace?.name }}</p>
          <v-btn to="/colors" variant="outlined" class="mt-2">Manage colors</v-btn>
        </v-card>
      </v-col>
      <v-col cols="12" md="8">
        <v-card class="pa-4">
          <h3 class="text-h6 mb-4">Your projects</h3>
          <v-list v-if="auth.projects.length">
            <v-list-item
              v-for="project in auth.projects"
              :key="project.id"
              :to="project.type === 'field' ? `/projects/${project.id}` : project.type === 'wall' ? `/wall/${project.id}` : `/floor/${project.id}`"
            >
              <v-list-item-title>{{ project.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ project.type }} · updated {{ new Date(project.updatedAt).toLocaleString() }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <p v-else class="text-medium-emphasis">No saved projects yet. Start from the home page demo and save to your account.</p>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
