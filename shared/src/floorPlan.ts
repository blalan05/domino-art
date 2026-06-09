import type { FloorPlanItem, FloorPlanItemKind } from './types.js';
import { fieldDimensionsFt, wallDimensionsFt } from './dominoCounts.js';

export function createFloorPlanItem(
  kind: FloorPlanItemKind,
  label: string,
  x: number,
  y: number,
  params: Record<string, number> = {},
): FloorPlanItem {
  const dimensions = computeItemDimensions(kind, params);
  return {
    id: cryptoRandomId(),
    kind,
    label,
    x,
    y,
    rotation: 0,
    widthFt: dimensions.widthFt,
    heightFt: dimensions.heightFt,
    dominoCount: dimensions.dominoCount,
    params,
  };
}

export function computeItemDimensions(
  kind: FloorPlanItemKind,
  params: Record<string, number>,
): { widthFt: number; heightFt: number; dominoCount: number } {
  switch (kind) {
    case 'field': {
      const rows = params.rows ?? 10;
      const cols = params.cols ?? 10;
      const dims = fieldDimensionsFt(rows, cols);
      return {
        widthFt: dims.widthFt,
        heightFt: dims.lengthFt,
        dominoCount: rows * cols,
      };
    }
    case 'wall': {
      const layers = params.layers ?? 5;
      const width = params.width ?? 10;
      const dims = wallDimensionsFt(layers, width);
      return {
        widthFt: dims.widthFt,
        heightFt: dims.lengthFt,
        dominoCount: dims.total,
      };
    }
    case 'field2dPyramid': {
      const size = params.size ?? 5;
      const count = (size * (size + 1)) / 2;
      const dims = fieldDimensionsFt(size, size);
      return { widthFt: dims.widthFt, heightFt: dims.lengthFt, dominoCount: count };
    }
    case 'field3dPyramid': {
      const size = params.size ?? 5;
      const count = (size * (size + 1) * (2 * size + 1)) / 6;
      const dims = fieldDimensionsFt(size, size);
      return { widthFt: dims.widthFt, heightFt: dims.lengthFt, dominoCount: count };
    }
    case 'circleField': {
      const rings = params.rings ?? 3;
      const count = rings * rings;
      const dims = fieldDimensionsFt(rings * 2, rings * 2);
      return { widthFt: dims.widthFt, heightFt: dims.lengthFt, dominoCount: count };
    }
    case 'cuboid': {
      const layers = params.layers ?? 3;
      const width = params.width ?? 5;
      const depth = params.depth ?? 5;
      const count = layers * width * depth;
      const dims = fieldDimensionsFt(layers, width);
      return { widthFt: dims.widthFt, heightFt: dims.lengthFt, dominoCount: count };
    }
    case 'spiral':
    case 'triangle':
    case 'upArrow':
    case 'downArrow':
    case 'leftArrow':
    case 'rightArrow': {
      const size = params.size ?? 5;
      const count = size * size;
      const dims = fieldDimensionsFt(size, size);
      return { widthFt: dims.widthFt, heightFt: dims.lengthFt, dominoCount: count };
    }
    default:
      return { widthFt: 1, heightFt: 1, dominoCount: 0 };
  }
}

export function totalFloorPlanDominoes(items: FloorPlanItem[]): number {
  return items.reduce((sum, item) => sum + item.dominoCount, 0);
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `fp-${Math.random().toString(36).slice(2, 10)}`;
}
