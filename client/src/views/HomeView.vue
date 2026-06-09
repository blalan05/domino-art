<script setup lang="ts">
import { onMounted } from 'vue';
import { useDemoStore } from '@/stores/demo';
import FieldPlannerEditor from '@/components/field/FieldPlannerEditor.vue';
import Preview3D from '@/components/preview/Preview3D.vue';

const demo = useDemoStore();

onMounted(async () => {
  await demo.init();
});

function onUpdate(data: import('@domino-art/shared').FieldProjectData) {
  if (!demo.project) return;
  demo.project.data = data;
  if (data.sourceImageId) {
    demo.setImageDataUrl(data.sourceImageId);
  }
  void demo.persist();
}

function onGenerate(cells: string[]) {
  demo.applyGeneratedCells(cells);
}
</script>

<template>
  <div v-if="demo.project">
    <v-container class="py-8">
      <v-row>
        <v-col cols="12" md="8">
          <h1 class="text-h4 mb-2">Domino Art Planner</h1>
          <p class="text-medium-emphasis mb-4">
            Upload an image, resize your grid, and generate a domino art plan in seconds. No account required.
          </p>
        </v-col>
        <v-col cols="12" md="4" class="d-flex align-center justify-end ga-2">
          <v-btn to="/register" color="primary">Save to account</v-btn>
          <v-btn to="/login" variant="outlined">Login</v-btn>
        </v-col>
      </v-row>
    </v-container>
    <FieldPlannerEditor
      :project-data="demo.project.data"
      :colors="demo.colors"
      :image-data-url="demo.imageDataUrl ?? demo.project.data.sourceImageId ?? null"
      @update="onUpdate"
      @generate="onGenerate"
    />
    <v-container>
      <Preview3D :project-data="demo.project.data" :colors="demo.colors" />
    </v-container>
  </div>
  <v-container v-else class="py-16 text-center">
    <v-progress-circular indeterminate color="primary" />
  </v-container>
</template>
