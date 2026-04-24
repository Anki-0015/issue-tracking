import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Response } from 'express';

const DEFAULT_RESET_TOKEN_EXPIRY_MINUTES = 30;

export function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

export function signAuthToken(id: string, email: string): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.sign({ id, email }, secret, { expiresIn: '7d' });
}

export function hashSha256Token(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getResetTokenExpiryMinutes(): number {
  const configured = Number(process.env.RESET_TOKEN_EXPIRY_MINUTES);

  if (Number.isNaN(configured) || configured < 5 || configured > 120) {
    return DEFAULT_RESET_TOKEN_EXPIRY_MINUTES;
  }

  return Math.floor(configured);
}

export function getPrimaryFrontendOrigin(): string {
  const primaryOrigin = process.env.FRONTEND_URL
    ?.split(',')
    .map((origin) => origin.trim())
    .find(Boolean);

  return primaryOrigin || 'http://localhost:3000';
}

export function clearAuthCookie(res: Response): void {
  const options = getAuthCookieOptions();

  res.clearCookie('auth_token', {
    path: options.path,
    secure: options.secure,
    sameSite: options.sameSite,
    httpOnly: options.httpOnly,
  });
}
