import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { handleControllerError, sendError } from '../lib/http';

// GET /api/notifications
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const { page = '1', limit = '20' } = req.query as Record<string, string | undefined>;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));

    const [total, unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where: { userId: req.user.id } }),
      prisma.notification.count({ where: { userId: req.user.id, read: false } }),
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          issue: {
            select: { id: true, issueCode: true, title: true, status: true },
          },
        },
      }),
    ]);

    res.status(200).json({
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    handleControllerError('getNotifications', res, err);
  }
};

// PATCH /api/notifications/:id/read
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const { id } = req.params;

    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification || notification.userId !== req.user.id) {
      sendError(res, 404, 'Notification not found');
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.status(200).json({ notification: updated });
  } catch (err) {
    handleControllerError('markAsRead', res, err);
  }
};

// PATCH /api/notifications/read-all
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (err) {
    handleControllerError('markAllAsRead', res, err);
  }
};
