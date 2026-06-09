import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { PortableProjectExport } from '@domino-art/shared';
import { db } from '../db/index.js';
import { colors, projectShares, projects } from '../db/schema.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';
import { paramId } from '../lib/params.js';

export const sharingRouter = Router();

sharingRouter.post('/projects/:id/share', requireAuth, requireWorkspace, async (req, res) => {
  const mode = (req.body.mode === 'copy' ? 'copy' : 'view') as 'view' | 'copy';
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, paramId(req.params.id)), eq(projects.workspaceId, req.workspaceId!)),
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const token = randomUUID().replace(/-/g, '');
  const [share] = await db
    .insert(projectShares)
    .values({ projectId: project.id, token, mode })
    .returning();

  res.status(201).json({
    share: {
      token: share.token,
      mode: share.mode,
      url: `/share/${share.token}`,
    },
  });
});

sharingRouter.get('/share/:token', async (req, res) => {
  const share = await db.query.projectShares.findFirst({
    where: eq(projectShares.token, paramId(req.params.token)),
    with: {
      project: true,
    },
  });

  if (!share) {
    res.status(404).json({ error: 'Share link not found' });
    return;
  }

  const palette = await db.query.colors.findMany({
    where: eq(colors.workspaceId, share.project.workspaceId),
  });

  res.json({
    mode: share.mode,
    project: {
      id: share.project.id,
      name: share.project.name,
      type: share.project.type,
      visibility: share.project.visibility,
      data: share.project.data,
      thumbnail: share.project.thumbnail,
    },
    colors: palette.map((color) => ({
      name: color.name,
      hex: color.hex,
      code: color.code,
      quantityOwned: color.quantityOwned,
      weight: color.weight,
      sortOrder: color.sortOrder,
      archived: color.archived,
    })),
  });
});

sharingRouter.post('/share/:token/copy', requireAuth, requireWorkspace, async (req, res) => {
  const share = await db.query.projectShares.findFirst({
    where: eq(projectShares.token, paramId(req.params.token)),
    with: { project: true },
  });

  if (!share || share.mode !== 'copy') {
    res.status(404).json({ error: 'Copy link not found' });
    return;
  }

  const [project] = await db
    .insert(projects)
    .values({
      workspaceId: req.workspaceId!,
      name: `${share.project.name} (copy)`,
      type: share.project.type,
      visibility: 'private',
      data: share.project.data,
      thumbnail: share.project.thumbnail,
    })
    .returning();

  res.status(201).json({ project });
});

sharingRouter.get('/projects/:id/export', requireAuth, requireWorkspace, async (req, res) => {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, paramId(req.params.id)), eq(projects.workspaceId, req.workspaceId!)),
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const palette = await db.query.colors.findMany({
    where: eq(colors.workspaceId, req.workspaceId!),
  });

  const payload: PortableProjectExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    project: {
      name: project.name,
      type: project.type,
      visibility: project.visibility,
      data: project.data as PortableProjectExport['project']['data'],
      thumbnail: project.thumbnail,
    },
    colors: palette.map((color) => ({
      name: color.name,
      hex: color.hex,
      code: color.code,
      quantityOwned: color.quantityOwned,
      weight: color.weight,
      sortOrder: color.sortOrder,
      archived: color.archived,
    })),
  };

  res.json(payload);
});

const importSchema = z.object({
  payload: z.object({
    version: z.literal(1),
    exportedAt: z.string(),
    project: z.object({
      name: z.string(),
      type: z.enum(['field', 'wall', 'floorplan']),
      visibility: z.enum(['private', 'unlisted', 'public']).optional(),
      data: z.record(z.unknown()),
      thumbnail: z.string().nullable().optional(),
    }),
    colors: z.array(
      z.object({
        name: z.string(),
        hex: z.string(),
        code: z.string().nullable().optional(),
        quantityOwned: z.number().optional(),
        weight: z.number().nullable().optional(),
        sortOrder: z.number().optional(),
        archived: z.boolean().optional(),
      }),
    ),
  }),
});

sharingRouter.post('/projects/import', requireAuth, requireWorkspace, async (req, res) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { payload } = parsed.data;
  const [project] = await db
    .insert(projects)
    .values({
      workspaceId: req.workspaceId!,
      name: payload.project.name,
      type: payload.project.type,
      visibility: payload.project.visibility ?? 'private',
      data: payload.project.data,
      thumbnail: payload.project.thumbnail ?? null,
    })
    .returning();

  res.status(201).json({ project });
});
