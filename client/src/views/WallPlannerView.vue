<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Project, WallProjectData } from '@domino-art/shared';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import WallPlannerEditor from '@/components/wall/WallPlannerEditor.vue';

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
      name: 'Untitled Wall',
      type: 'wall',
      data: {
        layers: 5,
        width: 10,
        cells: Array.from({ length: 5 * (10 * 5 - 4) }, () => null),
        selectedColorIds: auth.colors.map((c: import('@domino-art/shared').Color) => c.id),
        matchMode: 'lab',
      },
    });
    project.value = created.project;
  }
});

async function save(data: WallProjectData) {
  if (!project.value || !auth.currentWorkspaceId) return;
  const updated = await api.updateProject(auth.currentWorkspaceId, project.value.id, { data });
  project.value = updated.project;
}
</script>

<template>
  <div v-if="project">
    <v-container class="py-4"><h1 class="text-h5">{{ project.name }} · Wall Planner</h1></v-container>
    <WallPlannerEditor :project-data="project.data as WallProjectData" :colors="auth.colors" @update="save" />
  </div>
</template>
