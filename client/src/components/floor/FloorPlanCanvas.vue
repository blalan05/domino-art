<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FloorPlanItem, FloorPlanItemKind, FloorPlanProjectData } from '@domino-art/shared';
import { createFloorPlanItem, totalFloorPlanDominoes } from '@domino-art/shared';

const props = defineProps<{
  projectData: FloorPlanProjectData;
}>();

const emit = defineEmits<{ update: [FloorPlanProjectData] }>();

const selectedKind = ref<FloorPlanItemKind>('field');
const label = ref('New item');
const scale = ref(props.projectData.scale || 20);

const total = computed(() => totalFloorPlanDominoes(props.projectData.items));

const structureOptions: Array<{ title: string; value: FloorPlanItemKind }> = [
  { title: 'Field', value: 'field' },
  { title: 'Wall', value: 'wall' },
  { title: '2D Pyramid', value: 'field2dPyramid' },
  { title: '3D Pyramid', value: 'field3dPyramid' },
  { title: 'Circle Field', value: 'circleField' },
  { title: 'Cuboid', value: 'cuboid' },
  { title: 'Spiral', value: 'spiral' },
  { title: 'Triangle', value: 'triangle' },
  { title: 'Up Arrow', value: 'upArrow' },
  { title: 'Down Arrow', value: 'downArrow' },
  { title: 'Left Arrow', value: 'leftArrow' },
  { title: 'Right Arrow', value: 'rightArrow' },
];

function addItem() {
  const item = createFloorPlanItem(selectedKind.value, label.value, 1, 1, { rows: 10, cols: 10, layers: 5, width: 10, size: 5 });
  emit('update', {
    scale: scale.value,
    items: [...props.projectData.items, item],
  });
  label.value = 'New item';
}

function removeItem(id: string) {
  emit('update', {
    ...props.projectData,
    items: props.projectData.items.filter((item) => item.id !== id),
  });
}
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" md="4">
        <v-card class="pa-4">
          <h3 class="text-h6 mb-3">Floor plan tools</h3>
          <v-select v-model="selectedKind" :items="structureOptions" label="Structure" />
          <v-text-field v-model="label" label="Label" />
          <v-text-field v-model.number="scale" type="number" label="Pixels per foot" />
          <v-btn color="primary" block @click="addItem">Add to floor plan</v-btn>
          <p class="mt-4">Total dominoes: <strong>{{ total }}</strong></p>
        </v-card>
        <v-list class="mt-4">
          <v-list-item v-for="item in projectData.items" :key="item.id">
            <v-list-item-title>{{ item.label }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ item.kind }} · {{ item.dominoCount }} dominoes · {{ item.widthFt }}ft × {{ item.heightFt }}ft
            </v-list-item-subtitle>
            <template #append>
              <v-btn icon="mdi-delete" variant="text" @click="removeItem(item.id)" />
            </template>
          </v-list-item>
        </v-list>
      </v-col>
      <v-col cols="12" md="8">
        <v-card class="pa-4 floor-canvas">
          <svg :width="900" :height="600" viewBox="0 0 900 600">
            <rect width="900" height="600" fill="#111827" />
            <g v-for="(item, index) in projectData.items" :key="item.id">
              <rect
                :x="40 + index * 20 + item.x * scale"
                :y="40 + index * 10 + item.y * scale"
                :width="Math.max(item.widthFt * scale, 20)"
                :height="Math.max(item.heightFt * scale, 20)"
                fill="#e94560"
                fill-opacity="0.35"
                stroke="#ffd166"
              />
              <text
                :x="48 + index * 20 + item.x * scale"
                :y="58 + index * 10 + item.y * scale"
                fill="#fff"
                font-size="12"
              >
                {{ item.label }} ({{ item.dominoCount }})
              </text>
            </g>
          </svg>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.floor-canvas {
  overflow: auto;
}
</style>
