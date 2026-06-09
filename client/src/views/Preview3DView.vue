<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { FieldProjectData, Project } from '@domino-art/shared';
import { useAuthStore } from '@/stores/auth';
import { useDemoStore } from '@/stores/demo';
import { api } from '@/lib/api';
import Preview3D from '@/components/preview/Preview3D.vue';

const route = useRoute();
const auth = useAuthStore();
const demo = useDemoStore();
const projectData = ref<FieldProjectData | null>(null);
const colors = ref(demo.colors);

onMounted(async () => {
  await demo.init();
  if (route.params.id && auth.currentWorkspaceId) {
    const data = await api.getProject(auth.currentWorkspaceId, String(route.params.id));
    projectData.value = data.project.data as FieldProjectData;
    colors.value = auth.colors;
  } else if (demo.project) {
    projectData.value = demo.project.data;
    colors.value = demo.colors;
  }
});
</script>

<template>
  <v-container class="py-8">
    <Preview3D v-if="projectData" :project-data="projectData" :colors="colors" />
  </v-container>
</template>
