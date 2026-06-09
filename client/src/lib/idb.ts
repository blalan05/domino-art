import { get, set, del, keys } from 'idb-keyval';
import type { Color, FieldProjectData, Project } from '@domino-art/shared';
import { createDemoPaletteColors } from '@domino-art/shared';

const DEMO_PROJECT_KEY = 'domino-art:demo-project';
const DEMO_COLORS_KEY = 'domino-art:demo-colors';
const OFFLINE_QUEUE_KEY = 'domino-art:offline-queue';

export interface DemoState {
  project: {
    id: string;
    name: string;
    type: 'field';
    visibility: 'private';
    data: FieldProjectData;
    thumbnail: string | null;
    createdAt: string;
    updatedAt: string;
  };
  colors: Color[];
}

export function createEmptyFieldProject(rows = 20, cols = 30): DemoState['project'] {
  const now = new Date().toISOString();
  return {
    id: 'demo-local',
    name: 'Untitled Field',
    type: 'field',
    visibility: 'private',
    data: {
      rows,
      cols,
      cells: Array.from({ length: rows * cols }, () => null),
      selectedColorIds: createDemoPaletteColors().map((c) => c.id),
      matchMode: 'lab',
    },
    thumbnail: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function loadDemoState(): Promise<DemoState> {
  const [project, colors] = await Promise.all([
    get<DemoState['project']>(DEMO_PROJECT_KEY),
    get<Color[]>(DEMO_COLORS_KEY),
  ]);

  if (project && colors) {
    return { project, colors };
  }

  const demoColors = createDemoPaletteColors().map((color) => ({
    ...color,
    workspaceId: 'demo',
    weight: null,
    archived: false,
  }));

  const initial = {
    project: createEmptyFieldProject(),
    colors: demoColors,
  };

  await saveDemoState(initial);
  return initial;
}

export async function saveDemoState(state: DemoState) {
  await Promise.all([
    set(DEMO_PROJECT_KEY, state.project),
    set(DEMO_COLORS_KEY, state.colors),
  ]);
}

export async function clearDemoState() {
  await Promise.all([del(DEMO_PROJECT_KEY), del(DEMO_COLORS_KEY)]);
}

export async function queueOfflineAction(action: unknown) {
  const queue = (await get<unknown[]>(OFFLINE_QUEUE_KEY)) ?? [];
  queue.push(action);
  await set(OFFLINE_QUEUE_KEY, queue);
}

export async function getOfflineQueue() {
  return (await get<unknown[]>(OFFLINE_QUEUE_KEY)) ?? [];
}

export async function clearOfflineQueue() {
  await del(OFFLINE_QUEUE_KEY);
}

export async function cacheProject(project: Project) {
  await set(`project:${project.id}`, project);
}

export async function getCachedProject(id: string) {
  return get<Project>(`project:${id}`);
}

export async function listCachedProjectIds() {
  const allKeys = await keys();
  return allKeys.filter((key) => String(key).startsWith('project:')).map((key) => String(key).replace('project:', ''));
}
