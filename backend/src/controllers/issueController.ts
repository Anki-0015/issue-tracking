import { Response } from 'express';
import {
  Issue,
  IssueCategory,
  IssueSeverity,
  IssueStatus,
  Prisma,
} from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

const STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  REPORTED: [IssueStatus.ACKNOWLEDGED, IssueStatus.REJECTED],
  ACKNOWLEDGED: [IssueStatus.IN_PROGRESS, IssueStatus.REJECTED],
  IN_PROGRESS: [IssueStatus.RESOLVED, IssueStatus.REJECTED],
  RESOLVED: [],
  REJECTED: [],
};

function toIssueCode(): string {
  const stamp = Date.now().toString().slice(-6);
  const suffix = Math.floor(100 + Math.random() * 900);
  return `CIV-${stamp}${suffix}`;
}

function parseEnum<T extends string>(value: string | undefined, validValues: readonly T[]): T | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase() as T;
  return validValues.includes(normalized) ? normalized : null;
}

function calculateTimeToFinishMinutes(issue: Issue): number | null {
  if (!issue.resolvedAt) return null;
  const millis = issue.resolvedAt.getTime() - issue.createdAt.getTime();
  return Math.max(0, Math.round(millis / (1000 * 60)));
}

function mapIssue(issue: Issue) {
  return {
    ...issue,
    timeToFinishMinutes: calculateTimeToFinishMinutes(issue),
  };
}

function validateCoordinates(latitude?: number, longitude?: number): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }

  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function calculateAverageHours(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

// POST /api/issues
export const createIssue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
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
      res.status(400).json({ error: 'Title, description, category and subCategory are required' });
      return;
    }

    if (title.trim().length < 5 || title.trim().length > 140) {
      res.status(400).json({ error: 'Title must be between 5 and 140 characters' });
      return;
    }

    if (description.trim().length < 20 || description.trim().length > 3000) {
      res.status(400).json({ error: 'Description must be between 20 and 3000 characters' });
      return;
    }

    const parsedCategory = parseEnum(category, Object.values(IssueCategory));
    if (!parsedCategory) {
      res.status(400).json({ error: 'Invalid issue category' });
      return;
    }

    const parsedSeverity = parseEnum(severity, Object.values(IssueSeverity)) ?? IssueSeverity.MEDIUM;

    const hasAnyCoordinate = latitude !== undefined || longitude !== undefined;
    if (hasAnyCoordinate && !validateCoordinates(latitude, longitude)) {
      res.status(400).json({ error: 'Latitude and longitude must be valid GPS coordinates' });
      return;
    }

    if (mediaUrls && (!Array.isArray(mediaUrls) || mediaUrls.length > 6)) {
      res.status(400).json({ error: 'mediaUrls must be an array with up to 6 URLs' });
      return;
    }

    if (mediaUrls && mediaUrls.some((url) => typeof url !== 'string' || !url.trim())) {
      res.status(400).json({ error: 'Each media URL must be a non-empty string' });
      return;
    }

    const issue = await prisma.issue.create({
      data: {
        issueCode: toIssueCode(),
        title: title.trim(),
        description: description.trim(),
        category: parsedCategory,
        subCategory: subCategory.trim(),
        severity: parsedSeverity,
        latitude,
        longitude,
        locationLabel: locationLabel?.trim() || null,
        mediaUrls: mediaUrls ?? [],
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

    res.status(201).json({ issue: mapIssue(issue) });
  } catch (err) {
    console.error('[createIssue]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
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
      res.status(400).json({ error: 'Invalid category filter' });
      return;
    }

    if (status && !parsedStatus) {
      res.status(400).json({ error: 'Invalid status filter' });
      return;
    }

    if (severity && !parsedSeverity) {
      res.status(400).json({ error: 'Invalid severity filter' });
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

    if (startDate || endDate) {
      where.createdAt = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
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
      }),
    ]);

    res.status(200).json({
      issues: issues.map(mapIssue),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[listIssues]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
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
      }),
      prisma.issue.findMany({
        where: { acknowledgedAt: { not: null } },
        select: { createdAt: true, acknowledgedAt: true },
      }),
      prisma.issue.findMany({
        where: { resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
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
      recentIssues: recentIssues.map(mapIssue),
    });
  } catch (err) {
    console.error('[getIssueSummary]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
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
      res.status(404).json({ error: 'Issue not found' });
      return;
    }

    res.status(200).json({
      issue: {
        ...mapIssue(issue),
        reporter: issue.reporter,
      },
    });
  } catch (err) {
    console.error('[getIssueById]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// PATCH /api/issues/:id/status
export const updateIssueStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
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
      res.status(400).json({ error: 'Invalid issue status' });
      return;
    }

    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }

    const allowedNextStatuses = STATUS_TRANSITIONS[issue.status];
    if (!allowedNextStatuses.includes(nextStatus)) {
      res.status(400).json({
        error: `Invalid transition from ${issue.status} to ${nextStatus}`,
      });
      return;
    }

    if (nextStatus === IssueStatus.REJECTED && !rejectionReason?.trim()) {
      res.status(400).json({ error: 'rejectionReason is required when rejecting an issue' });
      return;
    }

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

    res.status(200).json({ issue: mapIssue(updatedIssue) });
  } catch (err) {
    console.error('[updateIssueStatus]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
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
      res.status(404).json({ error: 'Issue not found' });
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
    console.error('[getIssueHistory]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
