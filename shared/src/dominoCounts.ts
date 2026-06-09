import type { Color, FieldProjectData, SetupListEntry, WallProjectData } from './types.js';

export function countFieldColors(
  data: FieldProjectData,
  colors: Color[],
): SetupListEntry[] {
  const counts = new Map<string, number>();
  for (const colorId of data.cells) {
    if (!colorId) continue;
    counts.set(colorId, (counts.get(colorId) ?? 0) + 1);
  }
  return buildSetupList(counts, colors);
}

export function countWallColors(
  data: WallProjectData,
  colors: Color[],
): SetupListEntry[] {
  const counts = new Map<string, number>();
  const width = data.width * 5 - 4;

  for (let layer = 0; layer < data.layers; layer += 1) {
    for (let col = 0; col < width; col += 5) {
      const index = layer * width + col;
      const colorId = data.cells[index];
      if (!colorId) continue;
      const increment = layer % 2 === 0 && col === 0 ? 2 : 1;
      counts.set(colorId, (counts.get(colorId) ?? 0) + increment);
    }
  }

  return buildSetupList(counts, colors);
}

function buildSetupList(counts: Map<string, number>, colors: Color[]): SetupListEntry[] {
  const colorMap = new Map(colors.map((c) => [c.id, c]));
  const entries: SetupListEntry[] = [];

  for (const [colorId, needed] of counts) {
    const color = colorMap.get(colorId);
    if (!color || needed === 0) continue;
    const owned = color.quantityOwned;
    entries.push({
      colorId,
      colorName: color.name,
      hex: color.hex,
      code: color.code,
      needed,
      owned,
      remaining: owned - needed,
      notEnough: needed > owned,
    });
  }

  return entries.sort((a, b) => a.colorName.localeCompare(b.colorName));
}

export function totalDominoCount(cells: (string | null)[]): number {
  return cells.filter(Boolean).length;
}

export function fieldDimensionsFt(rows: number, cols: number): { widthFt: number; lengthFt: number } {
  const lengthFt = cols * 0.0246063 + (cols - 1) * 0.0278871;
  const widthFt = rows * 0.0787402 + (rows - 1) * 0.0131234;
  return {
    widthFt: round2(widthFt),
    lengthFt: round2(lengthFt),
  };
}

export function wallDimensionsFt(layers: number, width: number): { widthFt: number; lengthFt: number; total: number } {
  const lengthFt = width * 0.0246063 + (width - 1) * 0.104987;
  const widthFt = 0.15748;
  const oddLayers = Math.ceil(layers / 2);
  const total = layers * width + oddLayers;
  return {
    widthFt: round2(widthFt),
    lengthFt: round2(lengthFt),
    total,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
