<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Color, FieldProjectData } from '@domino-art/shared';
import { countFieldColors, totalDominoCount } from '@domino-art/shared';
import SetupListPanel from '@/components/field/SetupListPanel.vue';
import BuildInstructionsPanel from '@/components/field/BuildInstructionsPanel.vue';
import { generateGridInWorker, loadImageData } from '@/workers/imageEngine';

const props = defineProps<{
  projectData: FieldProjectData;
  colors: Color[];
  imageDataUrl?: string | null;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  update: [FieldProjectData];
  generate: [string[]];
}>();

const rows = ref(props.projectData.rows);
const cols = ref(props.projectData.cols);
const activeColorId = ref(props.colors[0]?.id ?? null);
const tool = ref<'paint' | 'fill' | 'select'>('paint');
const blockSize = ref(0);
const generating = ref(false);
const selectedForReplace = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const colorMap = computed(() => new Map(props.colors.map((color) => [color.id, color])));
const activePalette = computed(() =>
  props.colors.filter((color) => props.projectData.selectedColorIds.includes(color.id)),
);
const setupList = computed(() => countFieldColors(props.projectData, props.colors));
const total = computed(() => totalDominoCount(props.projectData.cells));

function emitUpdate(cells: (string | null)[]) {
  emit('update', { ...props.projectData, rows: rows.value, cols: cols.value, cells });
}

function resizeGrid() {
  const oldCells = props.projectData.cells;
  const oldRows = props.projectData.rows;
  const oldCols = props.projectData.cols;
  const cells = Array.from({ length: rows.value * cols.value }, (_, index) => {
    const row = Math.floor(index / cols.value);
    const col = index % cols.value;
    if (row < oldRows && col < oldCols) {
      return oldCells[row * oldCols + col] ?? null;
    }
    return null;
  });
  emitUpdate(cells);
}

function onCellClick(index: number) {
  if (props.readonly) return;
  const cells = [...props.projectData.cells];
  if (tool.value === 'fill') {
    floodFill(cells, index, activeColorId.value);
  } else if (tool.value === 'select') {
    selectedForReplace.value = cells[index];
  } else {
    cells[index] = activeColorId.value;
  }
  emitUpdate(cells);
}

function floodFill(cells: (string | null)[], startIndex: number, colorId: string | null) {
  const target = cells[startIndex];
  if (target === colorId) return;
  const stack = [startIndex];
  while (stack.length) {
    const index = stack.pop()!;
    if (cells[index] !== target) continue;
    cells[index] = colorId;
    const row = Math.floor(index / cols.value);
    const col = index % cols.value;
    if (col > 0) stack.push(index - 1);
    if (col < cols.value - 1) stack.push(index + 1);
    if (row > 0) stack.push(index - cols.value);
    if (row < rows.value - 1) stack.push(index + cols.value);
  }
}

function replaceSelectedColor() {
  if (!selectedForReplace.value || !activeColorId.value) return;
  const cells = props.projectData.cells.map((cell) =>
    cell === selectedForReplace.value ? activeColorId.value : cell,
  );
  selectedForReplace.value = null;
  emitUpdate(cells);
}

function togglePaletteColor(colorId: string) {
  const selected = new Set(props.projectData.selectedColorIds);
  if (selected.has(colorId)) selected.delete(colorId);
  else selected.add(colorId);
  emit('update', { ...props.projectData, selectedColorIds: [...selected] });
}

async function generateFromImage() {
  const imageUrl = props.imageDataUrl ?? props.projectData.sourceImageId;
  if (!imageUrl) return;
  generating.value = true;
  try {
    const image = await loadImageData(imageUrl);
    const palette = activePalette.value.map((color) => ({
      id: color.id,
      name: color.name,
      hex: color.hex,
      code: color.code,
    }));
    const result = await generateGridInWorker({
      imageData: image.data,
      width: image.width,
      height: image.height,
      rows: rows.value,
      cols: cols.value,
      palette,
      mode: props.projectData.matchMode,
    });
    emit('generate', result.cells);
  } finally {
    generating.value = false;
  }
}

function onImageSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result as string;
    emit('update', { ...props.projectData, sourceImageId: dataUrl });
  };
  reader.readAsDataURL(file);
}

function exportCsv() {
  const lines = ['Color,Needed,Owned,Status'];
  for (const entry of setupList.value) {
    lines.push(`${entry.colorName},${entry.needed},${entry.owned},${entry.notEnough ? 'NOT ENOUGH' : 'OK'}`);
  }
  downloadText('setup-list.csv', lines.join('\n'));
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12" lg="8">
        <v-card class="pa-4 mb-4 no-print">
          <v-row dense align="center">
            <v-col cols="6" md="2">
              <v-text-field v-model.number="rows" type="number" label="Rows" min="1" @change="resizeGrid" />
            </v-col>
            <v-col cols="6" md="2">
              <v-text-field v-model.number="cols" type="number" label="Columns" min="1" @change="resizeGrid" />
            </v-col>
            <v-col cols="12" md="3">
              <v-btn prepend-icon="mdi-image" @click="fileInput?.click()">Upload image</v-btn>
              <input ref="fileInput" type="file" accept="image/*" hidden @change="onImageSelected" />
            </v-col>
            <v-col cols="12" md="3">
              <v-btn color="primary" :loading="generating" @click="generateFromImage">Generate field</v-btn>
            </v-col>
            <v-col cols="12" md="2">
              <v-select
                v-model="tool"
                :items="[
                  { title: 'Paint', value: 'paint' },
                  { title: 'Fill', value: 'fill' },
                  { title: 'Select color', value: 'select' },
                ]"
                label="Tool"
              />
            </v-col>
          </v-row>
          <v-row dense class="mt-2">
            <v-col cols="12">
              <div class="d-flex flex-wrap ga-2">
                <v-chip
                  v-for="color in colors"
                  :key="color.id"
                  :color="projectData.selectedColorIds.includes(color.id) ? 'primary' : undefined"
                  variant="outlined"
                  @click="togglePaletteColor(color.id)"
                >
                  <span class="swatch mr-2" :style="{ background: color.hex }" />
                  {{ color.name }}
                </v-chip>
              </div>
            </v-col>
          </v-row>
          <v-row dense class="mt-2">
            <v-col cols="12">
              <div class="d-flex flex-wrap ga-2">
                <v-btn
                  v-for="color in activePalette"
                  :key="`active-${color.id}`"
                  size="small"
                  :variant="activeColorId === color.id ? 'flat' : 'outlined'"
                  :color="activeColorId === color.id ? 'primary' : undefined"
                  @click="activeColorId = color.id"
                >
                  <span class="swatch mr-2" :style="{ background: color.hex }" />
                  {{ color.code || color.name }}
                </v-btn>
                <v-btn v-if="selectedForReplace" size="small" color="secondary" @click="replaceSelectedColor">
                  Replace selected color
                </v-btn>
              </div>
            </v-col>
          </v-row>
        </v-card>

        <v-card class="pa-3">
          <div class="d-flex justify-space-between mb-2">
            <strong>Field grid</strong>
            <span>{{ total }} dominoes</span>
          </div>
          <div
            class="grid-wrapper"
            :style="{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, minmax(12px, 1fr))`,
              gap: '1px',
              maxWidth: '100%',
              overflow: 'auto',
            }"
          >
            <button
              v-for="(cell, index) in projectData.cells"
              :key="index"
              type="button"
              class="grid-cell"
              :style="{
                background: cell ? colorMap.get(cell)?.hex ?? '#333' : '#222',
                aspectRatio: '1',
                minWidth: '12px',
              }"
              @click="onCellClick(index)"
            >
              <span v-if="cell && colorMap.get(cell)?.code" class="mono" style="font-size: 8px">
                {{ colorMap.get(cell)?.code }}
              </span>
            </button>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <SetupListPanel :entries="setupList" @export-csv="exportCsv" />
        <BuildInstructionsPanel
          class="mt-4"
          :project-data="projectData"
          :colors="colors"
          :block-size="blockSize"
          @update:block-size="blockSize = $event"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.grid-wrapper {
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
