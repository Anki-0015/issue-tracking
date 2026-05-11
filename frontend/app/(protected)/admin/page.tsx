'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ApiAdminActivityItem,
  ApiUser,
  ApiUserRole,
  createUserAsAdmin,
  getAdminActivity,
  getCurrentUser,
} from '@/lib/api';
import { displayEnum } from '@/lib/format';

export default function AdminPage() {
  const [viewer, setViewer] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activity, setActivity] = useState<ApiAdminActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<ApiUserRole>('CITIZEN');
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  const loadActivity = async () => {
    setActivityLoading(true);
    const { data, error: activityError } = await getAdminActivity({ page: 1, limit: 10 });

    if (activityError) {
      setError(activityError);
      setActivityLoading(false);
      return;
    }

    setActivity(data?.activity ?? []);
    setActivityLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setLoading(true);
      const { data, error: userError } = await getCurrentUser();

      if (cancelled) return;

      if (userError || !data?.user) {
        setError(userError ?? 'Failed to load your account');
        setLoading(false);
        return;
      }

      setViewer(data.user);

      if (data.user.role === 'ADMIN') {
        await loadActivity();
      }

      setLoading(false);
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage('');
    setSubmitting(true);

    const { data, error: createError } = await createUserAsAdmin({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    });

    if (createError) {
      setFormMessage(createError);
      setSubmitting(false);
      return;
    }

    if (!data?.user) {
      setFormMessage('User created successfully');
      setSubmitting(false);
      await loadActivity();
      return;
    }

    setFormMessage(`Created ${data.user.role.toLowerCase()} user: ${data.user.email}`);
    setName('');
    setEmail('');
    setPassword('');
    setRole('CITIZEN');
    setSubmitting(false);
    await loadActivity();
  };

  if (loading) {
    return <div className="glass-card rounded-2xl border border-border p-6 text-sm text-muted">Loading admin workspace...</div>;
  }

  if (error) {
    return <div className="glass-card rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  }

  if (!viewer || viewer.role !== 'ADMIN') {
    return (
      <div className="glass-card rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to access this page.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-2xl border border-border p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-muted font-semibold">Administration</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Admin Control Panel</h1>
        <p className="mt-2 text-sm text-muted max-w-2xl">
          Create platform users (including other admins) and review recent administrator issue actions.
        </p>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="glass-card rounded-2xl border border-border p-5">
          <h2 className="text-base font-bold text-foreground">Create User</h2>
          <p className="text-xs text-muted mt-1">This endpoint is admin-only and supports ADMIN or CITIZEN roles.</p>

          {formMessage && (
            <div className="mt-4 rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-foreground/85">
              {formMessage}
            </div>
          )}

          <form className="mt-4 space-y-3" onSubmit={handleCreateUser}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
              placeholder="Full name"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
              placeholder="Email"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
              placeholder="Temporary password"
              minLength={8}
              required
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ApiUserRole)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
            >
              <option value="CITIZEN">Citizen</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand text-white py-2.5 text-sm font-semibold hover:bg-brand-strong disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating user...' : 'Create User'}
            </button>
          </form>
        </div>

        <div className="glass-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Recent Admin Activity</h2>
              <p className="text-xs text-muted mt-1">Latest status transitions performed by administrators.</p>
            </div>
            <button
              onClick={() => {
                void loadActivity();
              }}
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
            >
              Refresh
            </button>
          </div>

          {activityLoading ? (
            <p className="mt-4 text-sm text-muted">Loading activity...</p>
          ) : activity.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No admin actions yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {activity.map((item) => (
                <article key={item.id} className="rounded-xl border border-border bg-surface-soft p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{item.issue.issueCode}</p>
                    <span className="text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/90">{item.issue.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {item.fromStatus ? displayEnum(item.fromStatus) : 'Initial State'} to {displayEnum(item.toStatus)} by {item.changedBy.name}
                  </p>
                  {item.comment && <p className="mt-1 text-xs text-muted">Comment: {item.comment}</p>}
                  <Link href={`/issues/${item.issue.id}`} className="mt-2 inline-flex text-xs font-semibold text-brand hover:text-brand-strong">
                    Open issue
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
