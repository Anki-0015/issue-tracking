import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextFunction, Response } from 'express';
import { adminMiddleware } from '../src/middleware/adminMiddleware';
import { AuthRequest } from '../src/middleware/authMiddleware';

describe('adminMiddleware', () => {
  const next = jest.fn();

  const createResponse = () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    return response;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 for non-admin users', () => {
    const req = {
      user: { id: 'u1', email: 'citizen@example.com', role: 'CITIZEN' },
    } as AuthRequest;
    const res = createResponse();

    adminMiddleware(req, res as unknown as Response, next as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: Admin access required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows admin users', () => {
    const req = {
      user: { id: 'u2', email: 'admin@example.com', role: 'ADMIN' },
    } as AuthRequest;
    const res = createResponse();

    adminMiddleware(req, res as unknown as Response, next as unknown as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
