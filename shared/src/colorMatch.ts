export interface MatchColor {
  id: string;
  name: string;
  hex: string;
  code?: string | null;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  let rn = r / 255;
  let gn = g / 255;
  let bn = b / 255;

  rn = rn > 0.04045 ? ((rn + 0.055) / 1.055) ** 2.4 : rn / 12.92;
  gn = gn > 0.04045 ? ((gn + 0.055) / 1.055) ** 2.4 : gn / 12.92;
  bn = bn > 0.04045 ? ((bn + 0.055) / 1.055) ** 2.4 : bn / 12.92;

  const x = (rn * 0.4124 + gn * 0.3576 + bn * 0.1805) / 0.95047;
  const y = (rn * 0.2126 + gn * 0.7152 + bn * 0.0722) / 1.0;
  const z = (rn * 0.0193 + gn * 0.1192 + bn * 0.9505) / 1.08883;

  const fx = x > 0.008856 ? x ** (1 / 3) : 7.787 * x + 16 / 116;
  const fy = y > 0.008856 ? y ** (1 / 3) : 7.787 * y + 16 / 116;
  const fz = z > 0.008856 ? z ** (1 / 3) : 7.787 * z + 16 / 116;

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE(l1: number, a1: number, b1: number, l2: number, a2: number, b2: number): number {
  return (l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2;
}

function rgbDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
}

export function findClosestColor(
  rgb: [number, number, number],
  palette: MatchColor[],
  mode: 'lab' | 'rgb' = 'lab',
): MatchColor {
  if (palette.length === 0) {
    throw new Error('Palette must contain at least one color');
  }

  const [r, g, b] = rgb;
  const [l, a, bb] = mode === 'lab' ? rgbToLab(r, g, b) : [0, 0, 0];

  let best = palette[0];
  let bestDist = Number.POSITIVE_INFINITY;

  for (const color of palette) {
    const [cr, cg, cb] = hexToRgb(color.hex);
    const dist = mode === 'lab'
      ? deltaE(l, a, bb, ...rgbToLab(cr, cg, cb))
      : rgbDistance(r, g, b, cr, cg, cb);

    if (dist < bestDist) {
      bestDist = dist;
      best = color;
    }
  }

  return best;
}

export function averageRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  const startX = Math.max(0, Math.floor(x0));
  const startY = Math.max(0, Math.floor(y0));
  const endX = Math.min(width, Math.ceil(x1));
  const endY = Math.min(height, Math.ceil(y1));

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const idx = (y * width + x) * 4;
      r += data[idx];
      g += data[idx + 1];
      b += data[idx + 2];
      count += 1;
    }
  }

  if (count === 0) return [0, 0, 0];
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

export function generateFieldGrid(
  imageData: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  rows: number,
  cols: number,
  palette: MatchColor[],
  mode: 'lab' | 'rgb' = 'lab',
): string[] {
  const cells: string[] = [];
  const cellWidth = imageWidth / cols;
  const cellHeight = imageHeight / rows;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const rgb = averageRegion(
        imageData,
        imageWidth,
        imageHeight,
        col * cellWidth,
        row * cellHeight,
        (col + 1) * cellWidth,
        (row + 1) * cellHeight,
      );
      cells.push(findClosestColor(rgb, palette, mode).id);
    }
  }

  return cells;
}
