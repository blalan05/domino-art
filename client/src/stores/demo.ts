import { defineStore } from 'pinia';
import type { Color, FieldProjectData } from '@domino-art/shared';
import { loadDemoState, saveDemoState, type DemoState } from '@/lib/idb';

export const useDemoStore = defineStore('demo', {
  state: () => ({
    project: null as DemoState['project'] | null,
    colors: [] as Color[],
    activeColorId: null as string | null,
    tool: 'paint' as 'paint' | 'fill' | 'select',
    imageDataUrl: null as string | null,
    loading: false,
  }),
  getters: {
    colorMap: (state) => new Map(state.colors.map((color) => [color.id, color])),
    activePalette: (state) =>
      state.colors.filter((color) => state.project?.data.selectedColorIds.includes(color.id)),
  },
  actions: {
    async init() {
      const state = await loadDemoState();
      this.project = state.project;
      this.colors = state.colors;
      this.activeColorId = state.colors[0]?.id ?? null;
    },
    async persist() {
      if (!this.project) return;
      this.project.updatedAt = new Date().toISOString();
      await saveDemoState({ project: this.project, colors: this.colors });
    },
    setGridSize(rows: number, cols: number) {
      if (!this.project) return;
      const old = this.project.data;
      const cells = Array.from({ length: rows * cols }, (_, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        if (row < old.rows && col < old.cols) {
          return old.cells[row * old.cols + col];
        }
        return null;
      });
      this.project.data = { ...old, rows, cols, cells };
      void this.persist();
    },
    setCell(index: number, colorId: string | null) {
      if (!this.project) return;
      this.project.data.cells[index] = colorId;
      void this.persist();
    },
    replaceColor(fromId: string, toId: string) {
      if (!this.project) return;
      this.project.data.cells = this.project.data.cells.map((cell: string | null) => (cell === fromId ? toId : cell));
      void this.persist();
    },
    floodFill(startIndex: number, colorId: string | null) {
      if (!this.project) return;
      const { rows, cols, cells } = this.project.data;
      const target = cells[startIndex];
      if (target === colorId) return;
      const stack = [startIndex];
      while (stack.length) {
        const index = stack.pop()!;
        if (cells[index] !== target) continue;
        cells[index] = colorId;
        const row = Math.floor(index / cols);
        const col = index % cols;
        if (col > 0) stack.push(index - 1);
        if (col < cols - 1) stack.push(index + 1);
        if (row > 0) stack.push(index - cols);
        if (row < rows - 1) stack.push(index + cols);
      }
      void this.persist();
    },
    applyGeneratedCells(cells: string[]) {
      if (!this.project) return;
      this.project.data.cells = cells;
      void this.persist();
    },
    updateInventory(colorId: string, quantityOwned: number) {
      const color = this.colors.find((entry) => entry.id === colorId);
      if (!color) return;
      color.quantityOwned = quantityOwned;
      void this.persist();
    },
    setImageDataUrl(url: string | null) {
      this.imageDataUrl = url;
    },
    updateFieldData(data: Partial<FieldProjectData>) {
      if (!this.project) return;
      this.project.data = { ...this.project.data, ...data };
      void this.persist();
    },
  },
});
