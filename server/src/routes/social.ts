import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { follows, projects, users } from '../db/schema.js';
import { toPublicUser } from '../lib/serializers.js';
import { requireAuth } from '../middleware/auth.js';
import { paramId } from '../lib/params.js';

export const socialRouter = Router();

socialRouter.get('/artists/:handle', async (req, res) => {
  const artist = await db.query.users.findFirst({
    where: eq(users.handle, paramId(req.params.handle)),
  });

  if (!artist) {
    res.status(404).json({ error: 'Artist not found' });
    return;
  }

  const publicProjects = await db.query.projects.findMany({
    where: and(eq(projects.visibility, 'public')),
    orderBy: [desc(projects.updatedAt)],
    limit: 50,
  });

  res.json({
    artist: toPublicUser(artist),
    projects: publicProjects
      .filter((project) => project.workspaceId)
      .map((project) => ({
        id: project.id,
        name: project.name,
        type: project.type,
        thumbnail: project.thumbnail,
        updatedAt: project.updatedAt.toISOString(),
      })),
  });
});

socialRouter.get('/discover', async (_req, res) => {
  const publicProjects = await db.query.projects.findMany({
    where: eq(projects.visibility, 'public'),
    orderBy: [desc(projects.updatedAt)],
    limit: 50,
  });

  res.json({
    projects: publicProjects.map((project) => ({
      id: project.id,
      name: project.name,
      type: project.type,
      thumbnail: project.thumbnail,
      updatedAt: project.updatedAt.toISOString(),
    })),
  });
});

socialRouter.post('/follow/:artistId', requireAuth, async (req, res) => {
  const artistId = paramId(req.params.artistId);
  if (req.user!.id === artistId) {
    res.status(400).json({ error: 'Cannot follow yourself' });
    return;
  }

  await db
    .insert(follows)
    .values({ followerId: req.user!.id, artistId })
    .onConflictDoNothing({ target: [follows.followerId, follows.artistId] });

  res.status(201).json({ ok: true });
});

socialRouter.delete('/follow/:artistId', requireAuth, async (req, res) => {
  const artistId = paramId(req.params.artistId);
  await db
    .delete(follows)
    .where(and(eq(follows.followerId, req.user!.id), eq(follows.artistId, artistId)));

  res.json({ ok: true });
});

socialRouter.get('/following/feed', requireAuth, async (req, res) => {
  const following = await db.query.follows.findMany({
    where: eq(follows.followerId, req.user!.id),
  });

  const artistIds = following.map((row) => row.artistId);
  if (artistIds.length === 0) {
    res.json({ projects: [] });
    return;
  }

  const feedProjects = await db.query.projects.findMany({
    where: eq(projects.visibility, 'public'),
    orderBy: [desc(projects.updatedAt)],
    limit: 50,
  });

  res.json({
    projects: feedProjects.map((project) => ({
      id: project.id,
      name: project.name,
      type: project.type,
      thumbnail: project.thumbnail,
      updatedAt: project.updatedAt.toISOString(),
    })),
  });
});

socialRouter.patch('/profile', requireAuth, async (req, res) => {
  const schema = z.object({
    displayName: z.string().min(1).max(80).optional(),
    bio: z.string().max(500).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [user] = await db
    .update(users)
    .set(parsed.data)
    .where(eq(users.id, req.user!.id))
    .returning();

  res.json({ user: toPublicUser(user) });
});
