import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { sendError } from '../lib/http';

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendError(res, 401, 'Unauthorized');
    return;
  }

  if (req.user.role !== 'ADMIN') {
    sendError(res, 403, 'Forbidden: Admin access required');
    return;
  }

  next();
};
