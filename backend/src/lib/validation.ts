const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function parseEnum<T extends string>(value: string | undefined, validValues: readonly T[]): T | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase() as T;
  return validValues.includes(normalized) ? normalized : null;
}

export function parseIsoDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isValidCoordinates(latitude?: number, longitude?: number): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }

  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}
