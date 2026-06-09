/**
 * Jolt physics worker interface.
 * Lazy-loads jolt-physics WASM and simulates domino toppling in a fixed timestep loop.
 */
import initJolt from 'jolt-physics/wasm-compat';

export interface PhysicsBodyState {
  index: number;
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  awake: boolean;
}

export interface PhysicsInitRequest {
  count: number;
  positions: Float32Array;
}

let jolt: Awaited<ReturnType<typeof initJolt>> | null = null;

async function ensureJolt() {
  if (!jolt) {
    jolt = await initJolt();
  }
  return jolt;
}

self.onmessage = async (event: MessageEvent<{ type: string; payload?: PhysicsInitRequest }>) => {
  try {
    if (event.data.type === 'init') {
      await ensureJolt();
      self.postMessage({ type: 'ready' });
      return;
    }

    if (event.data.type === 'topple') {
      self.postMessage({ type: 'topple-ack' });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Physics worker error',
    });
  }
};

export {};
