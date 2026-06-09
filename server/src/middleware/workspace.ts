import type { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, workspaceMembers } from '../db/schema.js';

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.userId) {
    next();
    return;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, req.session.userId),
  });

  if (user) {
    req.user = user;
  }

  next();
}

export async function attachWorkspace(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    next();
    return;
  }

  const workspaceId = req.header('x-workspace-id') ?? req.query.workspaceId?.toString();
  if (!workspaceId) {
    const membership = await db.query.workspaceMembers.findFirst({
      where: eq(workspaceMembers.userId, req.user.id),
    });
    if (membership) {
      req.workspaceId = membership.workspaceId;
    }
    next();
    return;
  }

  const membership = await db.query.workspaceMembers.findFirst({
    where: (fields, { and, eq: eqOp }) =>
      and(eqOp(fields.workspaceId, workspaceId), eqOp(fields.userId, req.user!.id)),
  });

  if (!membership) {
    res.status(403).json({ error: 'Invalid workspace' });
    return;
  }

  req.workspaceId = workspaceId;
  next();
}
