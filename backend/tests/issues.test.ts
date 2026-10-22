import { describe, expect, it } from '@jest/globals';
import {
  generateIssueCode,
  isValidMediaUrl,
  calculateTimeToFinishMinutes,
  mapIssueWithDerivedFields,
  calculateAverageHours,
} from '../src/lib/issues';
import type { Issue } from '@prisma/client';

describe('generateIssueCode', () => {
  it('returns a string starting with CIV-', () => {
    const code = generateIssueCode();
    expect(typeof code).toBe('string');
    expect(code.startsWith('CIV-')).toBe(true);
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateIssueCode()));
    expect(codes.size).toBe(100);
  });

  it('matches the expected pattern CIV-{timestamp}-{random}', () => {
    const code = generateIssueCode();
    expect(/^CIV-\d+-\d+$/.test(code)).toBe(true);
  });
});

describe('isValidMediaUrl', () => {
  it('accepts /uploads/ paths', () => {
    expect(isValidMediaUrl('/uploads/image.jpg')).toBe(true);
    expect(isValidMediaUrl('/uploads/2024-some-uuid.png')).toBe(true);
  });

  it('accepts http and https URLs', () => {
    expect(isValidMediaUrl('http://example.com/photo.jpg')).toBe(true);
    expect(isValidMediaUrl('https://cdn.example.com/image.webp')).toBe(true);
  });

  it('rejects other protocols', () => {
    expect(isValidMediaUrl('ftp://example.com/file.jpg')).toBe(false);
    expect(isValidMediaUrl('javascript:alert(1)')).toBe(false);
    expect(isValidMediaUrl('data:image/jpeg;base64,abc')).toBe(false);
  });

  it('rejects plain paths not starting with /uploads/', () => {
    expect(isValidMediaUrl('/other/path/file.jpg')).toBe(false);
    expect(isValidMediaUrl('relative/path.jpg')).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isValidMediaUrl('not a url at all')).toBe(false);
    expect(isValidMediaUrl('')).toBe(false);
  });
});

const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
  id: 'test-id',
  issueCode: 'CIV-123-456',
  title: 'Test Issue',
  description: 'A test description for the issue',
  category: 'ROADS',
  subCategory: 'Pothole',
  severity: 'MEDIUM',
  status: 'REPORTED',
  latitude: null,
  longitude: null,
  locationLabel: null,
  mediaUrls: [],
  rejectionReason: null,
  acknowledgedAt: null,
  resolvedAt: null,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  reporterId: 'user-id',
  ...overrides,
});

describe('calculateTimeToFinishMinutes', () => {
  it('returns null when resolvedAt is null', () => {
    const issue = makeIssue({ resolvedAt: null });
    expect(calculateTimeToFinishMinutes(issue)).toBeNull();
  });

  it('calculates correct time in minutes', () => {
    const createdAt = new Date('2025-01-01T00:00:00.000Z');
    const resolvedAt = new Date('2025-01-01T02:30:00.000Z');
    const issue = makeIssue({ createdAt, resolvedAt });
    expect(calculateTimeToFinishMinutes(issue)).toBe(150);
  });

  it('returns 0 for same createdAt and resolvedAt', () => {
    const ts = new Date('2025-01-01T00:00:00.000Z');
    const issue = makeIssue({ createdAt: ts, resolvedAt: ts });
    expect(calculateTimeToFinishMinutes(issue)).toBe(0);
  });
});

describe('mapIssueWithDerivedFields', () => {
  it('adds timeToFinishMinutes field', () => {
    const issue = makeIssue({ resolvedAt: null });
    const mapped = mapIssueWithDerivedFields(issue);
    expect('timeToFinishMinutes' in mapped).toBe(true);
    expect(mapped.timeToFinishMinutes).toBeNull();
  });

  it('preserves all original fields', () => {
    const issue = makeIssue({ title: 'My Issue', status: 'IN_PROGRESS' });
    const mapped = mapIssueWithDerivedFields(issue);
    expect(mapped.title).toBe('My Issue');
    expect(mapped.status).toBe('IN_PROGRESS');
    expect(mapped.id).toBe('test-id');
  });
});

describe('calculateAverageHours', () => {
  it('returns 0 for empty array', () => {
    expect(calculateAverageHours([])).toBe(0);
  });

  it('calculates average correctly', () => {
    expect(calculateAverageHours([2, 4, 6])).toBe(4);
    expect(calculateAverageHours([1, 2])).toBe(1.5);
  });

  it('rounds to 1 decimal place', () => {
    expect(calculateAverageHours([1, 2, 3, 4])).toBe(2.5);
    expect(calculateAverageHours([1, 2, 3])).toBe(2);
  });

  it('handles single value', () => {
    expect(calculateAverageHours([7.5])).toBe(7.5);
  });
});
