import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  getResetTokenExpiryMinutes,
  hashSha256Token,
  generateResetToken,
  getPrimaryFrontendOrigin,
} from '../src/lib/auth';

describe('hashSha256Token', () => {
  it('returns a 64-char hex string', () => {
    const hash = hashSha256Token('mytoken');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it('produces the same hash for the same input', () => {
    const h1 = hashSha256Token('same-token');
    const h2 = hashSha256Token('same-token');
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different inputs', () => {
    expect(hashSha256Token('token-a')).not.toBe(hashSha256Token('token-b'));
  });
});

describe('generateResetToken', () => {
  it('returns a hex string of length 64', () => {
    const token = generateResetToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateResetToken()));
    expect(tokens.size).toBe(50);
  });
});

describe('getResetTokenExpiryMinutes', () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env.RESET_TOKEN_EXPIRY_MINUTES;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.RESET_TOKEN_EXPIRY_MINUTES;
    } else {
      process.env.RESET_TOKEN_EXPIRY_MINUTES = original;
    }
  });

  it('returns 30 when env is not set', () => {
    delete process.env.RESET_TOKEN_EXPIRY_MINUTES;
    expect(getResetTokenExpiryMinutes()).toBe(30);
  });

  it('returns configured value when valid', () => {
    process.env.RESET_TOKEN_EXPIRY_MINUTES = '45';
    expect(getResetTokenExpiryMinutes()).toBe(45);
  });

  it('returns 30 when value is too low (< 5)', () => {
    process.env.RESET_TOKEN_EXPIRY_MINUTES = '3';
    expect(getResetTokenExpiryMinutes()).toBe(30);
  });

  it('returns 30 when value is too high (> 120)', () => {
    process.env.RESET_TOKEN_EXPIRY_MINUTES = '200';
    expect(getResetTokenExpiryMinutes()).toBe(30);
  });

  it('returns 30 for non-numeric value', () => {
    process.env.RESET_TOKEN_EXPIRY_MINUTES = 'abc';
    expect(getResetTokenExpiryMinutes()).toBe(30);
  });

  it('floors decimal values', () => {
    process.env.RESET_TOKEN_EXPIRY_MINUTES = '15.9';
    expect(getResetTokenExpiryMinutes()).toBe(15);
  });
});

describe('getPrimaryFrontendOrigin', () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env.FRONTEND_URL;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = original;
    }
  });

  it('returns localhost:3000 when env is not set', () => {
    delete process.env.FRONTEND_URL;
    expect(getPrimaryFrontendOrigin()).toBe('http://localhost:3000');
  });

  it('returns the single configured URL', () => {
    process.env.FRONTEND_URL = 'https://app.example.com';
    expect(getPrimaryFrontendOrigin()).toBe('https://app.example.com');
  });

  it('returns the first URL when multiple are configured (comma-separated)', () => {
    process.env.FRONTEND_URL = 'https://app.example.com, https://www.example.com';
    expect(getPrimaryFrontendOrigin()).toBe('https://app.example.com');
  });
});
