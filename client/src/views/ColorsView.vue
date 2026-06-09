<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';

const auth = useAuthStore();
const editing = ref<{ id: string; quantityOwned: number } | null>(null);

onMounted(async () => {
  if (!auth.user) await auth.bootstrap();
  if (auth.currentWorkspaceId) await auth.refreshWorkspaceData();
});

async function saveQuantity(colorId: string) {
  if (!auth.currentWorkspaceId || !editing.value) return;
  await api.updateColor(auth.currentWorkspaceId, colorId, { quantityOwned: editing.value.quantityOwned });
  await auth.refreshWorkspaceData();
  editing.value = null;
}
</script>

<template>
  <v-container class="py-8">
    <h1 class="text-h4 mb-4">Color inventory</h1>
    <v-table>
      <thead>
        <tr>
          <th>Color</th>
          <th>Code</th>
          <th>Owned</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="color in auth.colors" :key="color.id">
          <td><span class="swatch mr-2" :style="{ background: color.hex }" />{{ color.name }}</td>
          <td>{{ color.code || '—' }}</td>
          <td>
            <v-text-field
              v-if="editing?.id === color.id"
              v-model.number="editing.quantityOwned"
              type="number"
              density="compact"
              hide-details
            />
            <span v-else>{{ color.quantityOwned }}</span>
          </td>
          <td>
            <v-btn
              size="small"
              variant="text"
              @click="editing?.id === color.id ? saveQuantity(color.id) : (editing = { id: color.id, quantityOwned: color.quantityOwned })"
            >
              {{ editing?.id === color.id ? 'Save' : 'Edit' }}
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
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
</style>
