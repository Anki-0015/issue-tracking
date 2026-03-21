import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function signToken(id: string, email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return jwt.sign({ id, email }, secret, { expiresIn: '7d' });
}

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email and password are required' });
      return;
    }

    if (name.trim().length < 2) {
      res.status(400).json({ error: 'Name must be at least 2 characters' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Please provide a valid email address' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const token = signToken(user.id, user.email);
    res.cookie('auth_token', token, getCookieOptions());

    res.status(201).json({
      message: 'Account created successfully',
      user,
    });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
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
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken(user.id, user.email);
    res.cookie('auth_token', token, getCookieOptions());

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
    console.error('[login]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// POST /api/auth/logout
export const logout = (_req: Request, res: Response): void => {
  const options = getCookieOptions();
  res.clearCookie('auth_token', {
    path: options.path,
    secure: options.secure,
    sameSite: options.sameSite,
    httpOnly: options.httpOnly,
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// GET /api/auth/me
export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error('[me]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
