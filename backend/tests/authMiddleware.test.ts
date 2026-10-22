import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { NextFunction, Response } from 'express';
import { authMiddleware } from '../src/middleware/authMiddleware';
import { AuthRequest } from '../src/middleware/authMiddleware';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-key-for-unit-tests';

// Helper: create a minimal mock Response
const createResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

// Helper: create a mock Request with optional cookie
const createRequest = (token?: string): AuthRequest =>
  ({
    cookies: token ? { auth_token: token } : {},
  }) as AuthRequest;

describe('authMiddleware', () => {
  const next = jest.fn() as unknown as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = JWT_SECRET;
  });

  it('returns 401 when no token is provided', () => {
    const req = createRequest();
    const res = createResponse();

    authMiddleware(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid/tampered token', () => {
    const req = createRequest('this.is.not.a.valid.token');
    const res = createResponse();

    authMiddleware(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired token', () => {
    const expired = jwt.sign(
      { id: 'u1', name: 'Test', email: 'test@example.com', role: 'CITIZEN' },
      JWT_SECRET,
      { expiresIn: -1 } // already expired
    );
    const req = createRequest(expired);
    const res = createResponse();

    authMiddleware(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() with valid citizen token and populates req.user', () => {
    const token = jwt.sign(
      { id: 'u1', name: 'Test Citizen', email: 'citizen@example.com', role: 'CITIZEN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const req = createRequest(token);
    const res = createResponse();

    authMiddleware(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user!.id).toBe('u1');
    expect(req.user!.email).toBe('citizen@example.com');
    expect(req.user!.role).toBe('CITIZEN');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() with valid admin token and populates req.user', () => {
    const token = jwt.sign(
      { id: 'a1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const req = createRequest(token);
    const res = createResponse();

    authMiddleware(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user!.role).toBe('ADMIN');
  });

  it('returns 401 for token missing required fields (no role)', () => {
    const token = jwt.sign(
      { id: 'u1', email: 'user@example.com' }, // missing role
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const req = createRequest(token);
    const res = createResponse();

    authMiddleware(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for token signed with wrong secret', () => {
    const token = jwt.sign(
      { id: 'u1', name: 'User', email: 'user@example.com', role: 'CITIZEN' },
      'wrong-secret',
      { expiresIn: '1h' }
    );
    const req = createRequest(token);
    const res = createResponse();

    authMiddleware(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
