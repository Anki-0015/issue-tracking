import crypto from 'crypto';
import { Issue } from '@prisma/client';

export function generateIssueCode(): string {
  return `CIV-${Date.now()}-${crypto.randomInt(1000, 10_000)}`;
}

export function isValidMediaUrl(url: string): boolean {
  if (url.startsWith('/uploads/')) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function calculateTimeToFinishMinutes(issue: Issue): number | null {
  if (!issue.resolvedAt) return null;
  const millis = issue.resolvedAt.getTime() - issue.createdAt.getTime();
  return Math.max(0, Math.round(millis / (1000 * 60)));
}

export function mapIssueWithDerivedFields(issue: Issue) {
  return {
    ...issue,
    timeToFinishMinutes: calculateTimeToFinishMinutes(issue),
  };
}

export function calculateAverageHours(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
