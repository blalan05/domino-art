<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Color, FieldProjectData } from '@domino-art/shared';
import { api } from '@/lib/api';
import FieldPlannerEditor from '@/components/field/FieldPlannerEditor.vue';

const route = useRoute();
const payload = ref<{
  mode: 'view' | 'copy';
  project: { name: string; type: string; data: FieldProjectData; thumbnail: string | null };
  colors: Array<Omit<Color, 'id' | 'workspaceId'>>;
} | null>(null);

onMounted(async () => {
  payload.value = await api.getShare(String(route.params.token)) as typeof payload.value;
});
</script>

<template>
  <div v-if="payload">
    <v-container class="py-4">
      <h1 class="text-h5">{{ payload.project.name }}</h1>
      <p class="text-medium-emphasis">Shared project ({{ payload.mode }})</p>
    </v-container>
    <FieldPlannerEditor
      v-if="payload.project.type === 'field'"
      :project-data="payload.project.data"
      :colors="payload.colors.map((color, index) => ({ ...color, id: `share-${index}`, workspaceId: 'share' }))"
      readonly
    />
  </div>
  <v-container v-else class="py-16 text-center">
    <v-progress-circular indeterminate color="primary" />
  </v-container>
</template>
