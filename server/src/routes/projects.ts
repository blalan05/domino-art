import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { ProjectData, ProjectType, ProjectVisibility } from '@domino-art/shared';
import { db } from '../db/index.js';
import { projects } from '../db/schema.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';
import { paramId } from '../lib/params.js';

const projectSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['field', 'wall', 'floorplan']),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
  data: z.record(z.unknown()),
  thumbnail: z.string().nullable().optional(),
});

export const projectsRouter = Router();

projectsRouter.use(requireAuth, requireWorkspace);

projectsRouter.get('/', async (req, res) => {
  const rows = await db.query.projects.findMany({
    where: eq(projects.workspaceId, req.workspaceId!),
    orderBy: [desc(projects.updatedAt)],
  });

  res.json({
    projects: rows.map(serializeProject),
  });
});

projectsRouter.get('/:id', async (req, res) => {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, paramId(req.params.id)), eq(projects.workspaceId, req.workspaceId!)),
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  res.json({ project: serializeProject(project) });
});

projectsRouter.post('/', async (req, res) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [project] = await db
    .insert(projects)
    .values({
      workspaceId: req.workspaceId!,
      name: parsed.data.name,
      type: parsed.data.type as ProjectType,
      visibility: (parsed.data.visibility ?? 'private') as ProjectVisibility,
      data: parsed.data.data as unknown as ProjectData,
      thumbnail: parsed.data.thumbnail ?? null,
    })
    .returning();

  res.status(201).json({ project: serializeProject(project) });
});

projectsRouter.patch('/:id', async (req, res) => {
  const parsed = projectSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [project] = await db
    .update(projects)
    .set({
      ...parsed.data,
      data: parsed.data.data as unknown as ProjectData | undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, paramId(req.params.id)), eq(projects.workspaceId, req.workspaceId!)))
    .returning();

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  res.json({ project: serializeProject(project) });
});

projectsRouter.delete('/:id', async (req, res) => {
  const [project] = await db
    .delete(projects)
    .where(and(eq(projects.id, paramId(req.params.id)), eq(projects.workspaceId, req.workspaceId!)))
    .returning();

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  res.json({ ok: true });
});

function serializeProject(project: typeof projects.$inferSelect) {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    type: project.type,
    visibility: project.visibility,
    data: project.data,
    thumbnail: project.thumbnail,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
