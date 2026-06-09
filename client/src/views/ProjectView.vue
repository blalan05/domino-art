<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { FieldProjectData, Project } from '@domino-art/shared';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import FieldPlannerEditor from '@/components/field/FieldPlannerEditor.vue';
import Preview3D from '@/components/preview/Preview3D.vue';

const route = useRoute();
const auth = useAuthStore();
const project = ref<Project | null>(null);
const shareUrl = ref('');
const exporting = ref(false);
const visibility = ref<'private' | 'unlisted' | 'public'>('private');

const fieldData = computed(() => project.value?.data as FieldProjectData | undefined);
const imageDataUrl = computed(() => fieldData.value?.sourceImageId ?? null);

onMounted(async () => {
  if (!auth.user) await auth.bootstrap();
  if (!auth.currentWorkspaceId) return;
  const data = await api.getProject(auth.currentWorkspaceId, String(route.params.id));
  project.value = data.project;
  visibility.value = data.project.visibility;
});

async function saveProject(data: FieldProjectData) {
  if (!project.value || !auth.currentWorkspaceId) return;
  const updated = await api.updateProject(auth.currentWorkspaceId, project.value.id, { data });
  project.value = updated.project;
}

async function onGenerate(cells: string[]) {
  if (!fieldData.value) return;
  await saveProject({ ...fieldData.value, cells });
}

async function createShare(mode: 'view' | 'copy') {
  if (!project.value || !auth.currentWorkspaceId) return;
  const result = await api.createShare(auth.currentWorkspaceId, project.value.id, mode) as { share: { url: string } };
  shareUrl.value = `${window.location.origin}${result.share.url}`;
}

async function updateVisibility(value: 'private' | 'unlisted' | 'public') {
  if (!project.value || !auth.currentWorkspaceId) return;
  visibility.value = value;
  const updated = await api.updateProject(auth.currentWorkspaceId, project.value.id, { visibility: value });
  project.value = updated.project;
}

async function exportProject() {
  if (!project.value || !auth.currentWorkspaceId) return;
  exporting.value = true;
  try {
    const payload = await api.exportProject(auth.currentWorkspaceId, project.value.id);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${project.value.name}.domino-art.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <div v-if="project && fieldData">
    <v-container class="py-4">
      <div class="d-flex justify-space-between align-center mb-2">
        <h1 class="text-h5">{{ project.name }}</h1>
        <div class="d-flex ga-2 no-print align-center">
          <v-select
            :model-value="visibility"
            :items="[
              { title: 'Private', value: 'private' },
              { title: 'Unlisted', value: 'unlisted' },
              { title: 'Public', value: 'public' },
            ]"
            label="Visibility"
            density="compact"
            hide-details
            style="max-width: 160px"
            @update:model-value="updateVisibility($event as 'private' | 'unlisted' | 'public')"
          />
          <v-btn size="small" variant="outlined" :loading="exporting" @click="exportProject">Export JSON</v-btn>
          <v-btn size="small" variant="outlined" @click="createShare('view')">Share view</v-btn>
          <v-btn size="small" color="primary" @click="createShare('copy')">Share copy</v-btn>
        </div>
      </div>
      <v-alert v-if="shareUrl" type="success" class="mb-4">{{ shareUrl }}</v-alert>
    </v-container>
    <FieldPlannerEditor
      :project-data="fieldData"
      :colors="auth.colors"
      :image-data-url="imageDataUrl"
      @update="saveProject"
      @generate="onGenerate"
    />
    <v-container>
      <Preview3D :project-data="fieldData" :colors="auth.colors" />
      <div class="text-center mt-2 no-print">
        <v-btn :to="`/preview/${project.id}`" variant="outlined">Open full-screen 3D preview</v-btn>
      </div>
    </v-container>
  </div>
  <v-container v-else class="py-16 text-center">
    <v-progress-circular indeterminate color="primary" />
  </v-container>
</template>
