<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Color, WallProjectData } from '@domino-art/shared';
import { countWallColors, totalDominoCount, wallDimensionsFt } from '@domino-art/shared';
import SetupListPanel from '@/components/field/SetupListPanel.vue';

const props = defineProps<{
  projectData: WallProjectData;
  colors: Color[];
}>();

const emit = defineEmits<{ update: [WallProjectData] }>();

const layers = ref(props.projectData.layers);
const width = ref(props.projectData.width);
const activeColorId = ref(props.colors[0]?.id ?? null);
const gridWidth = computed(() => width.value * 5 - 4);

const colorMap = computed(() => new Map(props.colors.map((color) => [color.id, color])));
const setupList = computed(() => countWallColors(props.projectData, props.colors));
const dimensions = computed(() => wallDimensionsFt(layers.value, width.value));

function resizeWall() {
  const oldCells = props.projectData.cells;
  const oldWidth = props.projectData.width * 5 - 4;
  const newWidth = gridWidth.value;
  const cells = Array.from({ length: layers.value * newWidth }, (_, index) => {
    const row = Math.floor(index / newWidth);
    const col = index % newWidth;
    if (row < props.projectData.layers && col < oldWidth && col % 5 === 0) {
      const oldIndex = row * oldWidth + col;
      return oldCells[oldIndex] ?? null;
    }
    return null;
  });
  emit('update', { ...props.projectData, layers: layers.value, width: width.value, cells });
}

function onCellClick(index: number) {
  const cells = [...props.projectData.cells];
  cells[index] = activeColorId.value;
  emit('update', { ...props.projectData, cells });
}
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" md="8">
        <v-card class="pa-4 mb-4">
          <v-row dense>
            <v-col cols="4"><v-text-field v-model.number="layers" label="Layers" @change="resizeWall" /></v-col>
            <v-col cols="4"><v-text-field v-model.number="width" label="Width" @change="resizeWall" /></v-col>
            <v-col cols="4" class="d-flex align-center">
              {{ dimensions.total }} dominoes · {{ dimensions.widthFt }}ft × {{ dimensions.lengthFt }}ft
            </v-col>
          </v-row>
        </v-card>
        <v-card class="pa-3">
          <div
            :style="{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridWidth}, 16px)`,
              gap: '1px',
            }"
          >
            <template v-for="(cell, index) in projectData.cells" :key="index">
              <button
                v-if="index % 5 === 0"
                type="button"
                class="grid-cell"
                :style="{ background: cell ? colorMap.get(cell)?.hex ?? '#333' : '#222', width: '16px', height: '16px' }"
                @click="onCellClick(index)"
              />
              <span v-else style="width: 16px; height: 16px" />
            </template>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <SetupListPanel :entries="setupList" />
      </v-col>
    </v-row>
  </v-container>
</template>
