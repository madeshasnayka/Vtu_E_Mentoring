import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const requireRole = (allowedRoles: ('admin' | 'mentor' | 'student')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges for this resource' });
      return;
    }
    next();
  };
};