import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { colors } from '../db/schema.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';
import { paramId } from '../lib/params.js';

const colorSchema = z.object({
  name: z.string().min(1),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  code: z.string().nullable().optional(),
  quantityOwned: z.number().int().min(0).default(0),
  weight: z.number().int().nullable().optional(),
  sortOrder: z.number().int().optional(),
  archived: z.boolean().optional(),
});

export const colorsRouter = Router();

colorsRouter.use(requireAuth, requireWorkspace);

colorsRouter.get('/', async (req, res) => {
  const rows = await db.query.colors.findMany({
    where: eq(colors.workspaceId, req.workspaceId!),
    orderBy: (fields, { asc }) => [asc(fields.sortOrder), asc(fields.name)],
  });

  res.json({
    colors: rows.map((color) => ({
      id: color.id,
      workspaceId: color.workspaceId,
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

colorsRouter.post('/', async (req, res) => {
  const parsed = colorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [color] = await db
    .insert(colors)
    .values({
      workspaceId: req.workspaceId!,
      ...parsed.data,
    })
    .returning();

  res.status(201).json({ color });
});

colorsRouter.patch('/:id', async (req, res) => {
  const parsed = colorSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [color] = await db
    .update(colors)
    .set(parsed.data)
    .where(eq(colors.id, paramId(req.params.id)))
    .returning();

  if (!color || color.workspaceId !== req.workspaceId) {
    res.status(404).json({ error: 'Color not found' });
    return;
  }

  res.json({ color });
});

colorsRouter.delete('/:id', async (req, res) => {
  const [color] = await db.delete(colors).where(eq(colors.id, paramId(req.params.id))).returning();
  if (!color || color.workspaceId !== req.workspaceId) {
    res.status(404).json({ error: 'Color not found' });
    return;
  }
  res.json({ ok: true });
});
