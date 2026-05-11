import { Response } from 'express';
import {
  IssueCategory,
  IssueSeverity,
  IssueStatus,
  UserRole,
  Prisma,
} from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { handleControllerError, sendError } from '../lib/http';
import {
  calculateAverageHours,
  generateIssueCode,
  isValidMediaUrl,
  mapIssueWithDerivedFields,
} from '../lib/issues';
import { isValidCoordinates, parseEnum, parseIsoDate } from '../lib/validation';

const STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  REPORTED: [IssueStatus.ACKNOWLEDGED, IssueStatus.REJECTED],
  ACKNOWLEDGED: [IssueStatus.IN_PROGRESS, IssueStatus.REJECTED],
  IN_PROGRESS: [IssueStatus.RESOLVED, IssueStatus.REJECTED],
  RESOLVED: [],
  REJECTED: [],
};

// Helper: enrich an issue with upvote count + current-user upvote flag
async function enrichIssueWithUpvotes(
  issue: ReturnType<typeof mapIssueWithDerivedFields>,
  userId?: string
) {
  const upvoteCount = await prisma.issueUpvote.count({
    where: { issueId: issue.id },
  });

  let hasUpvoted = false;
  if (userId) {
    const existing = await prisma.issueUpvote.findUnique({
      where: { issueId_userId: { issueId: issue.id, userId } },
    });
    hasUpvoted = !!existing;
  }

  return { ...issue, upvoteCount, hasUpvoted };
}

// POST /api/issues
export const createIssue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const {
      title,
      description,
      category,
      subCategory,
      severity,
      latitude,
      longitude,
      locationLabel,
      mediaUrls,
    } = req.body as {
      title?: string;
      description?: string;
      category?: string;
      subCategory?: string;
      severity?: string;
      latitude?: number;
      longitude?: number;
      locationLabel?: string;
      mediaUrls?: string[];
    };

    if (!title || !description || !category || !subCategory) {
      sendError(res, 400, 'Title, description, category and subCategory are required');
      return;
    }

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanSubCategory = subCategory.trim();
    const cleanLocationLabel = locationLabel?.trim();

    if (cleanTitle.length < 5 || cleanTitle.length > 140) {
      sendError(res, 400, 'Title must be between 5 and 140 characters');
      return;
    }

    if (cleanDescription.length < 20 || cleanDescription.length > 3000) {
      sendError(res, 400, 'Description must be between 20 and 3000 characters');
      return;
    }

    if (cleanSubCategory.length < 2 || cleanSubCategory.length > 120) {
      sendError(res, 400, 'subCategory must be between 2 and 120 characters');
      return;
    }

    if (cleanLocationLabel && cleanLocationLabel.length > 180) {
      sendError(res, 400, 'locationLabel must not exceed 180 characters');
      return;
    }

    const parsedCategory = parseEnum(category, Object.values(IssueCategory));
    if (!parsedCategory) {
      sendError(res, 400, 'Invalid issue category');
      return;
    }

    const parsedSeverity = parseEnum(severity, Object.values(IssueSeverity)) ?? IssueSeverity.MEDIUM;

    const hasAnyCoordinate = latitude !== undefined || longitude !== undefined;
    if (hasAnyCoordinate && !isValidCoordinates(latitude, longitude)) {
      sendError(res, 400, 'Latitude and longitude must be valid GPS coordinates');
      return;
    }

    if (mediaUrls && (!Array.isArray(mediaUrls) || mediaUrls.length > 6)) {
      sendError(res, 400, 'mediaUrls must be an array with up to 6 URLs');
      return;
    }

    if (mediaUrls && mediaUrls.some((url) => typeof url !== 'string' || !url.trim())) {
      sendError(res, 400, 'Each media URL must be a non-empty string');
      return;
    }

    if (mediaUrls && mediaUrls.some((url) => !isValidMediaUrl(url.trim()))) {
      sendError(res, 400, 'Each media URL must be an http(s) URL or /uploads path');
      return;
    }

    const issue = await prisma.issue.create({
      data: {
        issueCode: generateIssueCode(),
        title: cleanTitle,
        description: cleanDescription,
        category: parsedCategory,
        subCategory: cleanSubCategory,
        severity: parsedSeverity,
        latitude,
        longitude,
        locationLabel: cleanLocationLabel || null,
        mediaUrls: mediaUrls?.map((url) => url.trim()) ?? [],
        reporterId: req.user.id,
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: IssueStatus.REPORTED,
            changedById: req.user.id,
            comment: 'Issue reported by citizen',
          },
        },
      },
    });

    const enriched = await enrichIssueWithUpvotes(mapIssueWithDerivedFields(issue), req.user.id);
    res.status(201).json({ issue: enriched });
  } catch (err) {
    handleControllerError('createIssue', res, err);
  }
};

// GET /api/issues
export const listIssues = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', category, status, severity, q, startDate, endDate, sort = 'newest', mine } =
      req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));

    const where: Prisma.IssueWhereInput = {};

    const parsedCategory = parseEnum(category, Object.values(IssueCategory));
    const parsedStatus = parseEnum(status, Object.values(IssueStatus));
    const parsedSeverity = parseEnum(severity, Object.values(IssueSeverity));

    if (category && !parsedCategory) {
      sendError(res, 400, 'Invalid category filter');
      return;
    }

    if (status && !parsedStatus) {
      sendError(res, 400, 'Invalid status filter');
      return;
    }

    if (severity && !parsedSeverity) {
      sendError(res, 400, 'Invalid severity filter');
      return;
    }

    if (parsedCategory) where.category = parsedCategory;
    if (parsedStatus) where.status = parsedStatus;
    if (parsedSeverity) where.severity = parsedSeverity;

    if (q?.trim()) {
      const query = q.trim();
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { locationLabel: { contains: query, mode: 'insensitive' } },
        { issueCode: { contains: query, mode: 'insensitive' } },
      ];
    }

    const parsedStartDate = parseIsoDate(startDate);
    const parsedEndDate = parseIsoDate(endDate);

    if (startDate && !parsedStartDate) {
      sendError(res, 400, 'Invalid startDate value');
      return;
    }

    if (endDate && !parsedEndDate) {
      sendError(res, 400, 'Invalid endDate value');
      return;
    }

    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      sendError(res, 400, 'startDate cannot be greater than endDate');
      return;
    }

    if (parsedStartDate || parsedEndDate) {
      where.createdAt = {
        gte: parsedStartDate ?? undefined,
        lte: parsedEndDate ?? undefined,
      };
    }

    if (mine === 'true' && req.user) {
      where.reporterId = req.user.id;
    }

    const orderBy: Prisma.IssueOrderByWithRelationInput[] =
      sort === 'oldest'
        ? [{ createdAt: 'asc' }]
        : sort === 'status'
          ? [{ status: 'asc' }, { createdAt: 'desc' }]
          : [{ createdAt: 'desc' }];

    const [total, issues] = await Promise.all([
      prisma.issue.count({ where }),
      prisma.issue.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy,
        include: {
          _count: { select: { upvotes: true } },
        },
      }),
    ]);

    // Get user's upvotes for these issues
    const issueIds = issues.map((i) => i.id);
    const userUpvotes = req.user
      ? await prisma.issueUpvote.findMany({
          where: { issueId: { in: issueIds }, userId: req.user.id },
          select: { issueId: true },
        })
      : [];
    const upvotedSet = new Set(userUpvotes.map((u) => u.issueId));

    const enrichedIssues = issues.map((issue) => ({
      ...mapIssueWithDerivedFields(issue),
      upvoteCount: issue._count.upvotes,
      hasUpvoted: upvotedSet.has(issue.id),
    }));

    res.status(200).json({
      issues: enrichedIssues,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    handleControllerError('listIssues', res, err);
  }
};

// GET /api/issues/summary
export const getIssueSummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      total,
      reported,
      acknowledged,
      inProgress,
      resolved,
      rejected,
      recentIssues,
      acknowledgedIssues,
      resolvedIssues,
      topUpvotedIssues,
    ] = await Promise.all([
      prisma.issue.count(),
      prisma.issue.count({ where: { status: IssueStatus.REPORTED } }),
      prisma.issue.count({ where: { status: IssueStatus.ACKNOWLEDGED } }),
      prisma.issue.count({ where: { status: IssueStatus.IN_PROGRESS } }),
      prisma.issue.count({ where: { status: IssueStatus.RESOLVED } }),
      prisma.issue.count({ where: { status: IssueStatus.REJECTED } }),
      prisma.issue.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { _count: { select: { upvotes: true } } },
      }),
      prisma.issue.findMany({
        where: { acknowledgedAt: { not: null } },
        select: { createdAt: true, acknowledgedAt: true },
      }),
      prisma.issue.findMany({
        where: { resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
      }),
      prisma.issue.findMany({
        where: { status: { notIn: [IssueStatus.RESOLVED, IssueStatus.REJECTED] } },
        orderBy: { upvotes: { _count: 'desc' } },
        take: 5,
        include: { _count: { select: { upvotes: true } } },
      }),
    ]);

    const avgAcknowledgeHours = calculateAverageHours(
      acknowledgedIssues
        .filter((issue) => issue.acknowledgedAt)
        .map((issue) => {
          const diffMs = issue.acknowledgedAt!.getTime() - issue.createdAt.getTime();
          return diffMs / (1000 * 60 * 60);
        })
    );

    const avgResolveHours = calculateAverageHours(
      resolvedIssues
        .filter((issue) => issue.resolvedAt)
        .map((issue) => {
          const diffMs = issue.resolvedAt!.getTime() - issue.createdAt.getTime();
          return diffMs / (1000 * 60 * 60);
        })
    );

    const resolutionRate = total === 0 ? 0 : Math.round((resolved / total) * 100);

    res.status(200).json({
      summary: {
        total,
        reported,
        acknowledged,
        inProgress,
        resolved,
        rejected,
        resolutionRate,
        avgAcknowledgeHours,
        avgResolveHours,
      },
      recentIssues: recentIssues.map((i) => ({
        ...mapIssueWithDerivedFields(i),
        upvoteCount: i._count.upvotes,
      })),
      trendingIssues: topUpvotedIssues
        .filter((i) => i._count.upvotes > 0)
        .map((i) => ({
          ...mapIssueWithDerivedFields(i),
          upvoteCount: i._count.upvotes,
        })),
    });
  } catch (err) {
    handleControllerError('getIssueSummary', res, err);
  }
};

// GET /api/issues/:id
export const getIssueById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!issue) {
      sendError(res, 404, 'Issue not found');
      return;
    }

    const enriched = await enrichIssueWithUpvotes(
      mapIssueWithDerivedFields(issue),
      req.user?.id
    );

    res.status(200).json({
      issue: {
        ...enriched,
        reporter: issue.reporter,
      },
    });
  } catch (err) {
    handleControllerError('getIssueById', res, err);
  }
};

// PATCH /api/issues/:id/status
export const updateIssueStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    if (req.user.role !== UserRole.ADMIN) {
      sendError(res, 403, 'Forbidden: Only admins can change issue status');
      return;
    }

    const { id } = req.params;
    const { status, comment, rejectionReason } = req.body as {
      status?: string;
      comment?: string;
      rejectionReason?: string;
    };

    const nextStatus = parseEnum(status, Object.values(IssueStatus));
    if (!nextStatus) {
      sendError(res, 400, 'Invalid issue status');
      return;
    }

    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) {
      sendError(res, 404, 'Issue not found');
      return;
    }

    const allowedNextStatuses = STATUS_TRANSITIONS[issue.status];
    if (!allowedNextStatuses.includes(nextStatus)) {
      sendError(res, 400, `Invalid transition from ${issue.status} to ${nextStatus}`);
      return;
    }

    if (nextStatus === IssueStatus.REJECTED && !rejectionReason?.trim()) {
      sendError(res, 400, 'rejectionReason is required when rejecting an issue');
      return;
    }

    if (comment && comment.trim().length > 500) {
      sendError(res, 400, 'comment must not exceed 500 characters');
      return;
    }

    if (rejectionReason && rejectionReason.trim().length > 500) {
      sendError(res, 400, 'rejectionReason must not exceed 500 characters');
      return;
    }

    const statusLabel = nextStatus.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

    const updatedIssue = await prisma.issue.update({
      where: { id },
      data: {
        status: nextStatus,
        rejectionReason: nextStatus === IssueStatus.REJECTED ? rejectionReason?.trim() : null,
        acknowledgedAt:
          nextStatus === IssueStatus.ACKNOWLEDGED && !issue.acknowledgedAt
            ? new Date()
            : issue.acknowledgedAt,
        resolvedAt: nextStatus === IssueStatus.RESOLVED ? new Date() : issue.resolvedAt,
        statusHistory: {
          create: {
            fromStatus: issue.status,
            toStatus: nextStatus,
            changedById: req.user.id,
            comment: comment?.trim() || null,
          },
        },
      },
    });

    // Create notification for the reporter
    if (issue.reporterId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: issue.reporterId,
          type: 'STATUS_CHANGE',
          issueId: issue.id,
          message: `Your issue "${issue.title}" has been updated to ${statusLabel}`,
        },
      });
    }

    const enriched = await enrichIssueWithUpvotes(mapIssueWithDerivedFields(updatedIssue), req.user.id);
    res.status(200).json({ issue: enriched });
  } catch (err) {
    handleControllerError('updateIssueStatus', res, err);
  }
};

// GET /api/issues/:id/history
export const getIssueHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const issue = await prisma.issue.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!issue) {
      sendError(res, 404, 'Issue not found');
      return;
    }

    const history = await prisma.issueStatusHistory.findMany({
      where: { issueId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        changedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(200).json({ history });
  } catch (err) {
    handleControllerError('getIssueHistory', res, err);
  }
};

// GET /api/issues/admin/activity
export const listAdminActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));

    const where: Prisma.IssueStatusHistoryWhereInput = {
      changedBy: {
        role: UserRole.ADMIN,
      },
    };

    const [total, activity] = await Promise.all([
      prisma.issueStatusHistory.count({ where }),
      prisma.issueStatusHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          changedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          issue: {
            select: {
              id: true,
              issueCode: true,
              title: true,
              status: true,
            },
          },
        },
      }),
    ]);

    res.status(200).json({
      activity,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    handleControllerError('listAdminActivity', res, err);
  }
};

// POST /api/issues/:id/upvote
export const toggleUpvote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const { id } = req.params;

    const issue = await prisma.issue.findUnique({ where: { id }, select: { id: true, title: true, reporterId: true } });
    if (!issue) {
      sendError(res, 404, 'Issue not found');
      return;
    }

    const existing = await prisma.issueUpvote.findUnique({
      where: { issueId_userId: { issueId: id, userId: req.user.id } },
    });

    if (existing) {
      // Remove upvote
      await prisma.issueUpvote.delete({ where: { id: existing.id } });
      const upvoteCount = await prisma.issueUpvote.count({ where: { issueId: id } });
      res.status(200).json({ upvoted: false, upvoteCount });
    } else {
      // Add upvote
      await prisma.issueUpvote.create({
        data: { issueId: id, userId: req.user.id },
      });
      const upvoteCount = await prisma.issueUpvote.count({ where: { issueId: id } });

      // Notify reporter at milestones (5, 10, 25, 50, 100)
      const milestones = [5, 10, 25, 50, 100];
      if (milestones.includes(upvoteCount) && issue.reporterId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId: issue.reporterId,
            type: 'UPVOTE_MILESTONE',
            issueId: id,
            message: `Your issue "${issue.title}" reached ${upvoteCount} upvotes!`,
          },
        });
      }

      res.status(200).json({ upvoted: true, upvoteCount });
    }
  } catch (err) {
    handleControllerError('toggleUpvote', res, err);
  }
};

// POST /api/issues/:id/comments
export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const { id } = req.params;
    const { content } = req.body as { content?: string };

    if (!content?.trim()) {
      sendError(res, 400, 'Comment content is required');
      return;
    }

    const cleanContent = content.trim();
    if (cleanContent.length > 1000) {
      sendError(res, 400, 'Comment must not exceed 1000 characters');
      return;
    }

    const issue = await prisma.issue.findUnique({ where: { id }, select: { id: true, title: true, reporterId: true } });
    if (!issue) {
      sendError(res, 404, 'Issue not found');
      return;
    }

    const comment = await prisma.issueComment.create({
      data: {
        content: cleanContent,
        issueId: id,
        userId: req.user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Notify reporter if someone else comments
    if (issue.reporterId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: issue.reporterId,
          type: 'NEW_COMMENT',
          issueId: id,
          message: `${req.user.name} commented on your issue "${issue.title}"`,
        },
      });
    }

    res.status(201).json({ comment });
  } catch (err) {
    handleControllerError('addComment', res, err);
  }
};

// GET /api/issues/:id/comments
export const listComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const issue = await prisma.issue.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!issue) {
      sendError(res, 404, 'Issue not found');
      return;
    }

    const comments = await prisma.issueComment.findMany({
      where: { issueId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    res.status(200).json({ comments });
  } catch (err) {
    handleControllerError('listComments', res, err);
  }
};
