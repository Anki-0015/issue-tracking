const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 12_000;

export type ApiUserRole = 'ADMIN' | 'CITIZEN';

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: ApiUserRole;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

export type ApiIssueCategory =
  | 'ROADS'
  | 'ACCESSIBILITY'
  | 'SANITATION'
  | 'UTILITIES'
  | 'PUBLIC_SAFETY';

export type ApiIssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ApiIssueStatus =
  | 'REPORTED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

export interface ApiIssue {
  id: string;
  issueCode: string;
  title: string;
  description: string;
  category: ApiIssueCategory;
  subCategory: string;
  severity: ApiIssueSeverity;
  status: ApiIssueStatus;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  mediaUrls: string[];
  rejectionReason: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  timeToFinishMinutes: number | null;
  upvoteCount: number;
  hasUpvoted?: boolean;
}

export interface ApiIssueHistoryItem {
  id: string;
  comment: string | null;
  fromStatus: ApiIssueStatus | null;
  toStatus: ApiIssueStatus;
  createdAt: string;
  changedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ApiIssueComment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: ApiUserRole;
  };
}

export interface ApiNotification {
  id: string;
  userId: string;
  type: string;
  issueId: string | null;
  message: string;
  read: boolean;
  createdAt: string;
  issue?: {
    id: string;
    issueCode: string;
    title: string;
    status: ApiIssueStatus;
  } | null;
}

export interface ApiAdminActivityItem {
  id: string;
  comment: string | null;
  fromStatus: ApiIssueStatus | null;
  toStatus: ApiIssueStatus;
  createdAt: string;
  changedBy: {
    id: string;
    name: string;
    email: string;
    role: ApiUserRole;
  };
  issue: {
    id: string;
    issueCode: string;
    title: string;
    status: ApiIssueStatus;
  };
}

export interface ApiIssueSummary {
  total: number;
  reported: number;
  acknowledged: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  resolutionRate: number;
  avgAcknowledgeHours: number;
  avgResolveHours: number;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const isFormData = options.body instanceof FormData;
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      signal: controller.signal,
      headers: isFormData
        ? { ...options.headers }
        : {
            'Content-Type': 'application/json',
            ...options.headers,
          },
    });

    const contentType = res.headers.get('content-type') ?? '';
    let payload: Record<string, unknown> | null = null;

    if (contentType.includes('application/json')) {
      payload = (await res.json()) as Record<string, unknown>;
    } else {
      const text = await res.text();
      if (text) {
        payload = { message: text };
      }
    }

    if (!res.ok) {
      return {
        data: null,
        error:
          (payload?.error as string | undefined) ??
          (payload?.message as string | undefined) ??
          'Something went wrong',
      };
    }

    return { data: (payload as T | null) ?? null, error: null };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { data: null, error: 'Request timed out. Please try again.' };
    }

    return { data: null, error: 'Cannot connect to server. Please try again.' };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

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

export async function requestPasswordReset(payload: { email: string }) {
  return request<{ message: string; debugResetUrl?: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(payload: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return request<{ message: string }>('/api/auth/reset-password', {
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

// ── Issues ────────────────────────────────────────────────────────────────────

export async function createIssue(payload: {
  title: string;
  description: string;
  category: ApiIssueCategory;
  subCategory: string;
  severity: ApiIssueSeverity;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  mediaUrls?: string[];
}) {
  return request<{ issue: ApiIssue }>('/api/issues', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getIssues(params: {
  page?: number;
  limit?: number;
  category?: ApiIssueCategory;
  status?: ApiIssueStatus;
  severity?: ApiIssueSeverity;
  q?: string;
  sort?: 'newest' | 'oldest' | 'status';
  mine?: boolean;
}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<{
    issues: ApiIssue[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(`/api/issues${suffix}`);
}

export async function getIssueSummary() {
  return request<{ summary: ApiIssueSummary; recentIssues: ApiIssue[]; trendingIssues: ApiIssue[] }>('/api/issues/summary');
}

export async function getIssueById(id: string) {
  return request<{ issue: ApiIssue & { reporter: { id: string; name: string; email: string } } }>(`/api/issues/${id}`);
}

export async function getIssueHistory(id: string) {
  return request<{ history: ApiIssueHistoryItem[] }>(`/api/issues/${id}/history`);
}

export async function updateIssueStatus(payload: {
  id: string;
  status: ApiIssueStatus;
  comment?: string;
  rejectionReason?: string;
}) {
  return request<{ issue: ApiIssue }>(`/api/issues/${payload.id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: payload.status,
      comment: payload.comment,
      rejectionReason: payload.rejectionReason,
    }),
  });
}

export async function uploadIssueImage(file: File) {
  const formData = new FormData();
  formData.append('image', file);

  return request<{ message: string; url: string }>('/api/uploads/image', {
    method: 'POST',
    body: formData,
  });
}

// ── Upvotes ───────────────────────────────────────────────────────────────────

export async function toggleIssueUpvote(issueId: string) {
  return request<{ upvoted: boolean; upvoteCount: number }>(`/api/issues/${issueId}/upvote`, {
    method: 'POST',
  });
}

// ── Comments ──────────────────────────────────────────────────────────────────

export async function getIssueComments(issueId: string) {
  return request<{ comments: ApiIssueComment[] }>(`/api/issues/${issueId}/comments`);
}

export async function addIssueComment(issueId: string, content: string) {
  return request<{ comment: ApiIssueComment }>(`/api/issues/${issueId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function getNotifications(params?: { page?: number; limit?: number }) {
  const query = new URLSearchParams();

  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<{
    notifications: ApiNotification[];
    unreadCount: number;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(`/api/notifications${suffix}`);
}

export async function markNotificationRead(id: string) {
  return request<{ notification: ApiNotification }>(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsRead() {
  return request<{ message: string }>('/api/notifications/read-all', {
    method: 'PATCH',
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function createUserAsAdmin(payload: {
  name: string;
  email: string;
  password: string;
  role: ApiUserRole;
}) {
  return request<{ message: string; user: ApiUser }>('/api/auth/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAdminActivity(params?: { page?: number; limit?: number }) {
  const query = new URLSearchParams();

  if (params?.page) {
    query.set('page', String(params.page));
  }

  if (params?.limit) {
    query.set('limit', String(params.limit));
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<{
    activity: ApiAdminActivityItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(`/api/issues/admin/activity${suffix}`);
}
