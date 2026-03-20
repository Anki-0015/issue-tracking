'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ApiIssue, ApiUser, getCurrentUser, getIssues } from '@/lib/api';

function displayEnum(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const statusBadge: Record<string, string> = {
  RESOLVED: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-blue-100 text-[#1a56db]',
  REPORTED: 'bg-amber-100 text-amber-700',
  ACKNOWLEDGED: 'bg-cyan-100 text-cyan-700',
  REJECTED: 'bg-rose-100 text-rose-700',
};

export default function ProfilePage() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [myReports, setMyReports] = useState<ApiIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError('');

      const [userRes, issuesRes] = await Promise.all([
        getCurrentUser(),
        getIssues({ mine: true, limit: 100, sort: 'newest' }),
      ]);

      if (cancelled) return;

      if (userRes.error || !userRes.data?.user) {
        setError(userRes.error ?? 'Failed to load user profile');
        setLoading(false);
        return;
      }

      setUser(userRes.data.user);
      setMyReports(issuesRes.data?.issues ?? []);
      setLoading(false);
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const initials = user
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  const joinedDate = user
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '-';

  const reportSummary = useMemo(() => {
    const resolved = myReports.filter((report) => report.status === 'RESOLVED').length;
    const active = myReports.filter((report) => ['REPORTED', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(report.status)).length;
    return {
      total: myReports.length,
      resolved,
      active,
    };
  }, [myReports]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl border border-border p-6 text-sm text-muted">
        Loading profile...
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="glass-card rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Unable to load profile'}
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="glass-card rounded-2xl p-6 md:p-8 border border-border">
        <p className="text-xs uppercase tracking-[0.16em] text-muted font-semibold">Citizen Account</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Reporter Profile</h1>
        <p className="mt-2 text-sm md:text-base text-muted">
          Live profile and issue history sourced directly from your account activity.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-5">
          <div className="glass-card rounded-2xl border border-border p-6 flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-brand text-white text-2xl font-bold mb-4 shadow-lg shadow-brand/20">
              {initials}
            </div>
            <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
            <p className="text-sm text-muted">{user.email}</p>
            <div className="mt-3 inline-flex items-center rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-brand border border-border">
              Authenticated Citizen
            </div>

            <div className="mt-6 w-full grid grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
              {[
                { label: 'Total', value: reportSummary.total },
                { label: 'Resolved', value: reportSummary.resolved },
                { label: 'Active', value: reportSummary.active },
              ].map((item) => (
                <div key={item.label} className="bg-surface px-2 py-3 text-center">
                  <p className="text-xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl border border-border p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-[0.14em]">Account Details</h3>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-soft px-3 py-2.5">
              <div>
                <p className="text-xs text-muted">Email</p>
                <p className="text-sm text-foreground font-semibold">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-soft px-3 py-2.5">
              <div>
                <p className="text-xs text-muted">Member Since</p>
                <p className="text-sm text-foreground font-semibold">{joinedDate}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="glass-card rounded-2xl border border-border">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-foreground">My Reports</h3>
                <p className="text-xs text-muted mt-0.5">Real-time data from your submitted issues</p>
              </div>
              <Link href="/issues/report" className="text-xs font-semibold text-brand hover:text-brand-strong transition-colors">
                New Report
              </Link>
            </div>
            {myReports.length === 0 ? (
              <p className="px-6 py-6 text-sm text-muted">No reports yet. Submit your first issue to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Issue ID', 'Title', 'Category', 'Status', 'Date'].map((col) => (
                        <th key={col} className="px-6 py-3 text-left text-[11px] font-semibold text-muted uppercase tracking-[0.14em]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myReports.map((issue, idx) => (
                      <tr key={issue.id} className={`border-b border-border/70 hover:bg-surface-soft transition-colors ${idx === myReports.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="px-6 py-3.5 font-mono text-xs font-semibold text-muted">{issue.issueCode}</td>
                        <td className="px-6 py-3.5 text-foreground font-semibold max-w-xs truncate">
                          <Link href={`/issues/${issue.id}`} className="hover:text-brand transition-colors">
                            {issue.title}
                          </Link>
                        </td>
                        <td className="px-6 py-3.5 text-muted">{displayEnum(issue.category)}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${statusBadge[issue.status] ?? 'bg-gray-100 text-gray-700'}`}>
                            {displayEnum(issue.status)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-muted text-xs">{new Date(issue.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
