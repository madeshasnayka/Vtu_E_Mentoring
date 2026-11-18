import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export type AllowedRole = 'admin' | 'mentor' | 'student';

export const requireRole = (allowedRoles: AllowedRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = String(req.user?.role || '').trim().toLowerCase() as AllowedRole;

    if (!req.user || !allowedRoles.includes(userRole)) {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges for this resource' });
      return;
    }
    next();
  };
};