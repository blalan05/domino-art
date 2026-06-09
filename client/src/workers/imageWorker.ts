import { generateFieldGrid } from '@domino-art/shared';
import type { GenerateGridRequest, GenerateGridResponse } from '../workers/imageEngine';

self.onmessage = (event: MessageEvent<{ id: number; request: GenerateGridRequest }>) => {
  try {
    const { id, request } = event.data;
    const result: GenerateGridResponse = {
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
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({
      id: event.data.id,
      error: error instanceof Error ? error.message : 'Worker failed',
    });
  }
};
