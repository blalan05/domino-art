import { Router } from 'express';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users, workspaceMembers, workspaces } from '../db/schema.js';
import { seedWorkspaceColors } from '../db/seed.js';
import { slugifyHandle, toPublicUser } from '../lib/serializers.js';
import { requireAuth } from '../middleware/auth.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80),
  handle: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password, displayName } = parsed.data;
  let handle = parsed.data.handle ?? slugifyHandle(displayName);

  const existingEmail = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existingEmail) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  let suffix = 1;
  while (await db.query.users.findFirst({ where: eq(users.handle, handle) })) {
    handle = `${slugifyHandle(displayName).slice(0, 24)}_${suffix}`;
    suffix += 1;
  }

  const passwordHash = await argon2.hash(password);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, displayName, handle })
    .returning();

  const [workspace] = await db
    .insert(workspaces)
    .values({ name: `${displayName}'s Workspace`, kind: 'personal' })
    .returning();

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: user.id,
    role: 'owner',
  });

  await seedWorkspaceColors(workspace.id);

  req.session.userId = user.id;
  res.status(201).json({
    user: toPublicUser(user),
    workspace: {
      id: workspace.id,
      name: workspace.name,
      kind: workspace.kind,
      createdAt: workspace.createdAt.toISOString(),
    },
  });
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await argon2.verify(user.passwordHash, parsed.data.password);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  req.session.userId = user.id;
  res.json({ user: toPublicUser(user) });
});

authRouter.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const memberships = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, req.user!.id),
    with: {
      workspace: true,
    },
  });

  res.json({
    user: toPublicUser(req.user!),
    workspaces: memberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      kind: membership.workspace.kind,
      role: membership.role,
      createdAt: membership.workspace.createdAt.toISOString(),
    })),
  });
});
