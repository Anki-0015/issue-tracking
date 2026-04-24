import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  clearAuthCookie,
  generateResetToken,
  getAuthCookieOptions,
  getPrimaryFrontendOrigin,
  getResetTokenExpiryMinutes,
  hashSha256Token,
  signAuthToken,
} from '../lib/auth';
import { isEmailDeliveryConfigured, sendPasswordResetEmail } from '../lib/email';
import { handleControllerError, sendError, sendMessage } from '../lib/http';
import { isValidEmail, normalizeEmail } from '../lib/validation';

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      sendError(res, 400, 'Name, email and password are required');
      return;
    }

    if (name.trim().length < 2) {
      sendError(res, 400, 'Name must be at least 2 characters');
      return;
    }

    if (!isValidEmail(email)) {
      sendError(res, 400, 'Please provide a valid email address');
      return;
    }

    if (password.length < 8) {
      sendError(res, 400, 'Password must be at least 8 characters');
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      sendError(res, 409, 'An account with this email already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const token = signAuthToken(user.id, user.email);
    res.cookie('auth_token', token, getAuthCookieOptions());

    res.status(201).json({
      message: 'Account created successfully',
      user,
    });
  } catch (err) {
    handleControllerError('register', res, err);
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      sendError(res, 400, 'Email and password are required');
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      sendError(res, 401, 'Invalid email or password');
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      sendError(res, 401, 'Invalid email or password');
      return;
    }

    const token = signAuthToken(user.id, user.email);
    res.cookie('auth_token', token, getAuthCookieOptions());

    res.status(200).json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    handleControllerError('login', res, err);
  }
};

// POST /api/auth/logout
export const logout = (_req: Request, res: Response): void => {
  clearAuthCookie(res);
  sendMessage(res, 200, 'Logged out successfully');
};

// GET /api/auth/me
export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) {
      sendError(res, 404, 'User not found');
      return;
    }

    res.status(200).json({ user });
  } catch (err) {
    handleControllerError('me', res, err);
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as {
      email?: string;
    };

    if (!email) {
      sendError(res, 400, 'Email is required');
      return;
    }

    if (!isValidEmail(email)) {
      sendError(res, 400, 'Please provide a valid email address');
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const genericResponse = {
      message: 'If an account with that email exists, a password reset email has been sent.',
    };

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      res.status(200).json(genericResponse);
      return;
    }

    const plainToken = generateResetToken();
    const tokenHash = hashSha256Token(plainToken);
    const expiresAt = new Date(Date.now() + getResetTokenExpiryMinutes() * 60 * 1000);

    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${getPrimaryFrontendOrigin()}/reset-password/${plainToken}`;
    const expiresInMinutes = getResetTokenExpiryMinutes();

    console.info(`[forgot-password] reset-email-attempt user=${user.id}`);
    try {
      await sendPasswordResetEmail({
        toEmail: user.email,
        toName: user.name,
        resetUrl,
        expiresInMinutes,
      });
      console.info(`[forgot-password] reset-email-sent user=${user.id}`);
    } catch (emailError) {
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown email delivery error';
      console.error(`[alert][forgot-password-email-failed] user=${user.id} reason=${errorMessage}`);
    }

    if (process.env.NODE_ENV !== 'production' && !isEmailDeliveryConfigured()) {
      res.status(200).json({
        ...genericResponse,
        debugResetUrl: resetUrl,
      });
      return;
    }

    res.status(200).json(genericResponse);
  } catch (err) {
    handleControllerError('forgotPassword', res, err);
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword, confirmPassword } = req.body as {
      token?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    const sanitizedToken = token?.trim();
    if (!sanitizedToken || !newPassword || !confirmPassword) {
      sendError(res, 400, 'Token, new password and confirm password are required');
      return;
    }

    if (newPassword.length < 8) {
      sendError(res, 400, 'Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      sendError(res, 400, 'Passwords do not match');
      return;
    }

    const tokenHash = hashSha256Token(sanitizedToken);
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token: tokenHash },
      select: { id: true, userId: true, expiresAt: true },
    });

    if (!resetRecord) {
      sendError(res, 400, 'Reset link is invalid or has expired');
      return;
    }

    if (resetRecord.expiresAt < new Date()) {
      await prisma.passwordReset.delete({ where: { id: resetRecord.id } });
      sendError(res, 400, 'Reset link is invalid or has expired');
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordReset.deleteMany({ where: { userId: resetRecord.userId } }),
    ]);

    res.status(200).json({ message: 'Password updated successfully. Please sign in.' });
  } catch (err) {
    handleControllerError('resetPassword', res, err);
  }
};
