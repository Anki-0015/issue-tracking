import { Response } from 'express';

export function sendError(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

export function sendMessage(res: Response, status: number, message: string): void {
  res.status(status).json({ message });
}

export function handleControllerError(scope: string, res: Response, error: unknown): void {
  console.error(`[${scope}]`, error);
  sendError(res, 500, 'Something went wrong. Please try again.');
}
