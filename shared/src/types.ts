export type WorkspaceKind = 'personal' | 'team';
export type WorkspaceRole = 'owner' | 'editor' | 'viewer';
export type ProjectType = 'field' | 'wall' | 'floorplan';
export type ProjectVisibility = 'private' | 'unlisted' | 'public';
export type ShareMode = 'view' | 'copy';

export interface User {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  kind: WorkspaceKind;
  createdAt: string;
}

export interface Color {
  id: string;
  workspaceId: string;
  name: string;
  hex: string;
  code: string | null;
  quantityOwned: number;
  weight: number | null;
  sortOrder: number;
  archived: boolean;
}

/** Direction the field topples: horizontal = along rows (left to right), vertical = along columns (top to bottom). */
export type ToppleDirection = 'horizontal' | 'vertical';

export interface FieldProjectData {
  rows: number;
  cols: number;
  cells: (string | null)[];
  selectedColorIds: string[];
  matchMode: 'lab' | 'rgb';
  sourceImageId?: string | null;
  toppleDirection?: ToppleDirection;
}

export interface WallProjectData {
  layers: number;
  width: number;
  cells: (string | null)[];
  selectedColorIds: string[];
  matchMode: 'lab' | 'rgb';
  sourceImageId?: string | null;
}

export type FloorPlanItemKind =
  | 'field'
  | 'wall'
  | 'field2dPyramid'
  | 'field3dPyramid'
  | 'circleField'
  | 'cuboid'
  | 'spiral'
  | 'triangle'
  | 'upArrow'
  | 'downArrow'
  | 'leftArrow'
  | 'rightArrow';

export interface FloorPlanItem {
  id: string;
  kind: FloorPlanItemKind;
  label: string;
  x: number;
  y: number;
  rotation: number;
  widthFt: number;
  heightFt: number;
  dominoCount: number;
  projectRefId?: string | null;
  params?: Record<string, number>;
}

export interface FloorPlanProjectData {
  items: FloorPlanItem[];
  scale: number;
}

export type ProjectData = FieldProjectData | WallProjectData | FloorPlanProjectData;

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  type: ProjectType;
  visibility: ProjectVisibility;
  data: ProjectData;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SetupListEntry {
  colorId: string;
  colorName: string;
  hex: string;
  code: string | null;
  needed: number;
  owned: number;
  remaining: number;
  notEnough: boolean;
}

export interface RunLengthSegment {
  count: number;
  colorId: string;
  colorName: string;
  hex: string;
  code: string | null;
}

export interface BuildInstructionRow {
  rowIndex: number;
  segments: RunLengthSegment[];
}

export interface PortableProjectExport {
  version: 1;
  exportedAt: string;
  project: Omit<Project, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>;
  colors: Omit<Color, 'id' | 'workspaceId'>[];
}
