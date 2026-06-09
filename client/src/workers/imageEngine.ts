import type { MatchColor } from '@domino-art/shared';
import { generateFieldGrid } from '@domino-art/shared';

export interface GenerateGridRequest {
  imageData: Uint8ClampedArray;
  width: number;
  height: number;
  rows: number;
  cols: number;
  palette: MatchColor[];
  mode: 'lab' | 'rgb';
}

export interface GenerateGridResponse {
  cells: string[];
}

const worker = new Worker(new URL('./imageWorker.ts', import.meta.url), { type: 'module' });

let requestId = 0;
const pending = new Map<number, { resolve: (value: GenerateGridResponse) => void; reject: (error: Error) => void }>();

worker.onmessage = (event: MessageEvent<{ id: number; result?: GenerateGridResponse; error?: string }>) => {
  const handler = pending.get(event.data.id);
  if (!handler) return;
  pending.delete(event.data.id);
  if (event.data.error) {
    handler.reject(new Error(event.data.error));
    return;
  }
  handler.resolve(event.data.result!);
};

export function generateGridInWorker(request: GenerateGridRequest): Promise<GenerateGridResponse> {
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, request });
  });
}

export async function loadImageData(url: string): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const image = await createImageBitmap(await (await fetch(url)).blob());
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  return { data: imageData.data, width: image.width, height: image.height };
}

export function generateGridSync(request: GenerateGridRequest): GenerateGridResponse {
  return {
    cells: generateFieldGrid(
      request.imageData,
      request.width,
      request.height,
      request.rows,
      request.cols,
      request.palette,
      request.mode,
    ),
  };
}
