'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ApiIssue,
  ApiIssueCategory,
  ApiIssueStatus,
  ApiIssueSeverity,
  getIssues,
} from '@/lib/api';
import { displayEnum } from '@/lib/format';

const categoryOptions: ApiIssueCategory[] = [
  'ROADS',
  'ACCESSIBILITY',
  'SANITATION',
  'UTILITIES',
  'PUBLIC_SAFETY',
];

const statusOptions: ApiIssueStatus[] = [
  'REPORTED',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
];

const severityOptions: ApiIssueSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function IssuesPage() {
  const [issues, setIssues] = useState<ApiIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [category, setCategory] = useState<ApiIssueCategory | ''>('');
  const [status, setStatus] = useState<ApiIssueStatus | ''>('');
  const [severity, setSeverity] = useState<ApiIssueSeverity | ''>('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'status'>('newest');

  const queryParams = useMemo(
    () => ({
      q: q.trim() || undefined,
      category: category || undefined,
      status: status || undefined,
      severity: severity || undefined,
      sort,
      page: 1,
      limit: 20,
    }),
    [q, category, status, severity, sort]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadIssues() {
      setLoading(true);
      setError('');

      const { data, error: requestError } = await getIssues(queryParams);
      if (cancelled) return;

      if (requestError) {
        setError(requestError);
        setIssues([]);
      } else {
        setIssues(data?.issues ?? []);
      }

      setLoading(false);
    }

    loadIssues();

    return () => {
      cancelled = true;
    };
  }, [queryParams]);

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-2xl border border-border p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted font-semibold">Citizen Discovery</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">Issue Center</h1>
            <p className="mt-2 text-sm text-muted">Search, filter, and monitor reported civic issues with transparent status tracking.</p>
          </div>
          <Link
            href="/issues/report"
            className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong transition-colors"
          >
            Report New Issue
          </Link>
        </div>
      </section>

      <section className="glass-card rounded-2xl border border-border p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search keyword, location, or issue code"
            className="md:col-span-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ApiIssueCategory | '')}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
          >
            <option value="">All Categories</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {displayEnum(option)}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ApiIssueStatus | '')}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {displayEnum(option)}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as ApiIssueSeverity | '')}
              className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
            >
              <option value="">Severity</option>
              {severityOptions.map((option) => (
                <option key={option} value={option}>
                  {displayEnum(option)}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'newest' | 'oldest' | 'status')}
              className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </section>

      <section className="glass-card rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-muted">Loading issues...</div>
        ) : error ? (
          <div className="p-8 text-sm text-red-600">{error}</div>
        ) : issues.length === 0 ? (
          <div className="p-8 text-sm text-muted">No issues found with current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-soft">
                  {['Issue', 'Title', 'Category', 'Severity', 'Status', 'Created', 'Time to Finish'].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-[11px] font-semibold text-muted uppercase tracking-[0.14em]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id} className="border-b border-border/70 hover:bg-surface-soft transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs text-muted">{issue.issueCode}</td>
                    <td className="px-4 py-3.5 font-semibold text-foreground max-w-xs truncate">
                      <Link href={`/issues/${issue.id}`} className="hover:text-brand transition-colors">
                        {issue.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-muted">{displayEnum(issue.category)}</td>
                    <td className="px-4 py-3.5 text-muted">{displayEnum(issue.severity)}</td>
                    <td className="px-4 py-3.5 text-muted">{displayEnum(issue.status)}</td>
                    <td className="px-4 py-3.5 text-muted">{new Date(issue.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5 text-muted">
                      {issue.timeToFinishMinutes !== null ? `${issue.timeToFinishMinutes} min` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
