import { describe, expect, it } from '@jest/globals';
import {
  isValidEmail,
  normalizeEmail,
  parseEnum,
  parseIsoDate,
  isValidCoordinates,
  isStrongPassword,
} from '../src/lib/validation';

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('admin@civicreport.local')).toBe(true);
    expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@nodomain')).toBe(false);
    expect(isValidEmail('noatsign.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('spaces in@email.com')).toBe(false);
  });
});

describe('normalizeEmail', () => {
  it('lowercases and trims emails', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
    expect(normalizeEmail('ADMIN@CIVICREPORT.LOCAL')).toBe('admin@civicreport.local');
  });
});

describe('parseEnum', () => {
  const validValues = ['ROADS', 'SANITATION', 'UTILITIES'] as const;

  it('parses valid enum values case-insensitively', () => {
    expect(parseEnum('roads', validValues)).toBe('ROADS');
    expect(parseEnum('ROADS', validValues)).toBe('ROADS');
    expect(parseEnum('sanitation', validValues)).toBe('SANITATION');
  });

  it('returns null for invalid enum values', () => {
    expect(parseEnum('INVALID', validValues)).toBeNull();
    expect(parseEnum('', validValues)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseEnum(undefined, validValues)).toBeNull();
  });
});

describe('parseIsoDate', () => {
  it('parses valid ISO date strings', () => {
    const d = parseIsoDate('2025-01-15');
    expect(d).toBeInstanceOf(Date);
    expect(d!.getFullYear()).toBe(2025);
  });

  it('parses full ISO datetime strings', () => {
    const d = parseIsoDate('2025-06-15T10:30:00.000Z');
    expect(d).toBeInstanceOf(Date);
  });

  it('returns null for invalid date strings', () => {
    expect(parseIsoDate('notadate')).toBeNull();
    expect(parseIsoDate('32-13-9999')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseIsoDate(undefined)).toBeNull();
  });
});

describe('isValidCoordinates', () => {
  it('accepts valid GPS coordinates', () => {
    expect(isValidCoordinates(0, 0)).toBe(true);
    expect(isValidCoordinates(28.6139, 77.209)).toBe(true);
    expect(isValidCoordinates(-90, -180)).toBe(true);
    expect(isValidCoordinates(90, 180)).toBe(true);
  });

  it('rejects out-of-range coordinates', () => {
    expect(isValidCoordinates(91, 0)).toBe(false);
    expect(isValidCoordinates(0, 181)).toBe(false);
    expect(isValidCoordinates(-91, 0)).toBe(false);
    expect(isValidCoordinates(0, -181)).toBe(false);
  });

  it('rejects non-numeric coordinates', () => {
    expect(isValidCoordinates(undefined, undefined)).toBe(false);
    expect(isValidCoordinates(28, undefined)).toBe(false);
    expect(isValidCoordinates(undefined, 77)).toBe(false);
  });
});

describe('isStrongPassword', () => {
  it('accepts passwords with 8+ chars, letters, and numbers', () => {
    expect(isStrongPassword('Admin@12345')).toBe(true);
    expect(isStrongPassword('password1')).toBe(true);
    expect(isStrongPassword('CAPS1234letters')).toBe(true);
  });

  it('rejects short passwords', () => {
    expect(isStrongPassword('Ab1')).toBe(false);
    expect(isStrongPassword('1234567')).toBe(false);
  });

  it('rejects passwords without letters', () => {
    expect(isStrongPassword('12345678')).toBe(false);
  });

  it('rejects passwords without numbers', () => {
    expect(isStrongPassword('password')).toBe(false);
    expect(isStrongPassword('NoNumbers!')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isStrongPassword('')).toBe(false);
  });
});
