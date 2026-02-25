const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const json = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      return { data: null, error: (json.error as string) ?? 'Something went wrong' };
    }

    return { data: json as T, error: null };
  } catch {
    return { data: null, error: 'Cannot connect to server. Please try again.' };
  }
}

export async function loginUser(payload: { email: string; password: string }) {
  return request<{ user: ApiUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
}) {
  return request<{ user: ApiUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logoutUser() {
  return request<{ message: string }>('/api/auth/logout', { method: 'POST' });
}

export async function getCurrentUser() {
  return request<{ user: ApiUser }>('/api/auth/me');
}
