<script setup lang="ts">
import { computed } from 'vue';
import type { Color, FieldProjectData } from '@domino-art/shared';
import { buildFieldInstructions, formatInstructionRow } from '@domino-art/shared';
import jsPDF from 'jspdf';

const props = defineProps<{
  projectData: FieldProjectData;
  colors: Color[];
  blockSize: number;
}>();

const emit = defineEmits<{ 'update:blockSize': [number] }>();

const rows = computed(() => buildFieldInstructions(props.projectData, props.colors, props.blockSize));

function printInstructions() {
  window.print();
}

function exportPdf() {
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text('Domino Art Build Instructions', 14, 16);
  let y = 26;
  for (const row of rows.value) {
    doc.text(`Row ${row.rowIndex}: ${formatInstructionRow(row)}`, 14, y);
    y += 8;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  }
  doc.save('build-instructions.pdf');
}
</script>

<template>
  <v-card class="pa-4">
    <div class="d-flex justify-space-between align-center mb-3">
      <h3 class="text-h6">Build instructions</h3>
      <div class="d-flex ga-2">
        <v-btn size="small" variant="outlined" @click="printInstructions">Print</v-btn>
        <v-btn size="small" color="primary" @click="exportPdf">PDF</v-btn>
      </div>
    </div>
    <v-text-field
      :model-value="blockSize"
      type="number"
      label="Block size (0 = off)"
      min="0"
      @update:model-value="emit('update:blockSize', Number($event))"
    />
    <v-list density="compact">
      <v-list-item v-for="row in rows" :key="row.rowIndex">
        <v-list-item-title>Row {{ row.rowIndex }}</v-list-item-title>
        <v-list-item-subtitle>{{ formatInstructionRow(row) }}</v-list-item-subtitle>
      </v-list-item>
    </v-list>
  </v-card>
</template>
