import type { NextFunction, Request, Response } from 'express';
import type { UserRow } from '../db/schema.js';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: UserRow;
      workspaceId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

export function requireWorkspace(req: Request, res: Response, next: NextFunction) {
  if (!req.workspaceId) {
    res.status(403).json({ error: 'Workspace access required' });
    return;
  }
  next();
}
