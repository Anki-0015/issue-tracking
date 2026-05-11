import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthTokenPayload } from '../lib/auth';
import { sendError } from '../lib/http';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: AuthTokenPayload['role'];
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.cookies?.auth_token as string | undefined;

    if (!token) {
      sendError(res, 401, 'Unauthorized: No token provided');
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      sendError(res, 500, 'Internal server error');
      return;
    }

    const decoded = jwt.verify(token, secret) as AuthTokenPayload;

    if (!decoded.id || !decoded.email || !decoded.role) {
      sendError(res, 401, 'Unauthorized: Invalid token payload');
      return;
    }

    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch {
    sendError(res, 401, 'Unauthorized: Invalid token');
  }
};
