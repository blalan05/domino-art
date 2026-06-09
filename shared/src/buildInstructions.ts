import type { BuildInstructionRow, Color, FieldProjectData, RunLengthSegment } from './types.js';

export function buildFieldInstructions(
  data: FieldProjectData,
  colors: Color[],
  blockSize = 0,
): BuildInstructionRow[] {
  const colorMap = new Map(colors.map((c) => [c.id, c]));
  const rows: BuildInstructionRow[] = [];

  for (let row = 0; row < data.rows; row += 1) {
    const segments: RunLengthSegment[] = [];
    let totalInBlock = 0;

    const pushSegment = (colorId: string | null, count: number) => {
      if (!colorId || count <= 0) return;
      const color = colorMap.get(colorId);
      if (!color) return;
      segments.push({
        count,
        colorId,
        colorName: color.name,
        hex: color.hex,
        code: color.code,
      });
    };

    let currentColorId: string | null = null;
    let currentCount = 0;

    for (let col = 0; col < data.cols; col += 1) {
      const colorId = data.cells[row * data.cols + col] ?? null;

      if (colorId === currentColorId) {
        currentCount += 1;
      } else {
        pushSegment(currentColorId, currentCount);
        currentColorId = colorId;
        currentCount = 1;
      }

      totalInBlock += 1;
      if (blockSize > 0 && totalInBlock >= blockSize && col < data.cols - 1) {
        pushSegment(currentColorId, currentCount);
        currentColorId = null;
        currentCount = 0;
        totalInBlock = 0;
      }
    }

    pushSegment(currentColorId, currentCount);
    rows.push({ rowIndex: row + 1, segments });
  }

  return rows;
}

export function formatInstructionRow(row: BuildInstructionRow): string {
  return row.segments
    .map((segment) => `${segment.count} ${segment.colorName}${segment.code ? ` (${segment.code})` : ''}`)
    .join(', ');
}

export function setupListToCsv(entries: Array<{ colorName: string; needed: number; owned: number; notEnough: boolean }>): string {
  const lines = ['Color,Needed,Owned,Status'];
  for (const entry of entries) {
    lines.push(`${entry.colorName},${entry.needed},${entry.owned},${entry.notEnough ? 'NOT ENOUGH' : 'OK'}`);
  }
  return lines.join('\n');
}
