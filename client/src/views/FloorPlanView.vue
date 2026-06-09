<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { FloorPlanProjectData, Project } from '@domino-art/shared';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import FloorPlanCanvas from '@/components/floor/FloorPlanCanvas.vue';

const route = useRoute();
const auth = useAuthStore();
const project = ref<Project | null>(null);

onMounted(async () => {
  if (!auth.user) await auth.bootstrap();
  if (route.params.id && auth.currentWorkspaceId) {
    const data = await api.getProject(auth.currentWorkspaceId, String(route.params.id));
    project.value = data.project;
  } else if (auth.currentWorkspaceId) {
    const created = await api.saveProject(auth.currentWorkspaceId, {
      name: 'Untitled Floor Plan',
      type: 'floorplan',
      data: { items: [], scale: 20 },
    });
    project.value = created.project;
  }
});

async function save(data: FloorPlanProjectData) {
  if (!project.value || !auth.currentWorkspaceId) return;
  const updated = await api.updateProject(auth.currentWorkspaceId, project.value.id, { data });
  project.value = updated.project;
}
</script>

<template>
  <div v-if="project">
    <v-container class="py-4"><h1 class="text-h5">{{ project.name }} · Floor Plan</h1></v-container>
    <FloorPlanCanvas :project-data="project.data as FloorPlanProjectData" @update="save" />
  </div>
</template>
