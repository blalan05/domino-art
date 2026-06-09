<script setup lang="ts">
import type { SetupListEntry } from '@domino-art/shared';

defineProps<{
  entries: SetupListEntry[];
}>();

const emit = defineEmits<{ exportCsv: [] }>();
</script>

<template>
  <v-card class="pa-4">
    <div class="d-flex justify-space-between align-center mb-3">
      <h3 class="text-h6">Setup list</h3>
      <v-btn size="small" variant="outlined" @click="emit('exportCsv')">Export CSV</v-btn>
    </div>
    <v-table density="compact">
      <thead>
        <tr>
          <th>Color</th>
          <th>Need</th>
          <th>Own</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in entries" :key="entry.colorId">
          <td>
            <span class="swatch mr-2" :style="{ background: entry.hex }" />
            {{ entry.colorName }}
          </td>
          <td>{{ entry.needed }}</td>
          <td>{{ entry.owned }}</td>
          <td>
            <v-chip size="x-small" :color="entry.notEnough ? 'error' : 'success'">
              {{ entry.notEnough ? 'NOT ENOUGH' : 'OK' }}
            </v-chip>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<style scoped>
.swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
</style>
