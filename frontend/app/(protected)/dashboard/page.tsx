'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiIssue, ApiIssueSummary, getIssueSummary } from '@/lib/api';
import { displayEnum } from '@/lib/format';
import { getIssueStatusBadge } from '@/lib/issue-ui';

export default function DashboardPage() {
  const [summary, setSummary] = useState<ApiIssueSummary | null>(null);
  const [recentIssues, setRecentIssues] = useState<ApiIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error: requestError } = await getIssueSummary();

      if (cancelled) return;

      if (requestError || !data) {
        setError(requestError ?? 'Failed to load dashboard data');
      } else {
        setSummary(data.summary);
        setRecentIssues(data.recentIssues);
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="glass-card rounded-2xl border border-border p-6 text-sm text-muted">Loading dashboard...</div>;
  }

  if (error || !summary) {
    return <div className="glass-card rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error || 'Dashboard unavailable'}</div>;
  }

  const stats = [
    { label: 'Total Reports', value: summary.total, change: `${summary.reported} newly reported`, color: 'bg-[#e7f0fa] text-[#0f4c81]', accent: 'border-[#c6dbee]' },
    { label: 'Resolved', value: summary.resolved, change: `${summary.resolutionRate}% resolution rate`, color: 'bg-[#e8f8f0] text-[#116b43]', accent: 'border-[#c9eadb]' },
    { label: 'In Progress', value: summary.inProgress, change: `Avg ack ${summary.avgAcknowledgeHours} hrs`, color: 'bg-[#edf3ff] text-[#2f5f9e]', accent: 'border-[#d5e1f4]' },
    { label: 'Rejected', value: summary.rejected, change: `Avg resolve ${summary.avgResolveHours} hrs`, color: 'bg-[#fff2df] text-[#a05b00]', accent: 'border-[#f0ddbd]' },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="glass-card rounded-2xl p-6 md:p-8 border border-border">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted font-semibold">City Insight Center</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">Operational Dashboard</h1>
            <p className="mt-2 text-sm md:text-base text-muted max-w-2xl">
              Live civic issue metrics sourced directly from your database.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="chip">Authenticated data</span>
            <span className="chip">No sample values</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className={`glass-card rounded-2xl border px-5 py-5 ${stat.accent}`}>
            <p className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em]">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
            <p className="mt-1 text-xs font-semibold text-muted">{stat.change}</p>
            <div className={`mt-3 inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${stat.color}`}>Live</div>
          </article>
        ))}
      </div>

      <section className="glass-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Recent Issues</h2>
            <p className="text-xs text-muted mt-1">Latest reports from citizens</p>
          </div>
          <Link href="/issues" className="text-xs font-semibold text-brand hover:text-brand-strong transition-colors">
            Open Issue Center
          </Link>
        </div>

        {recentIssues.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No issues reported yet.</p>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Issue ID', 'Title', 'Category', 'Status', 'Date'].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-muted uppercase tracking-[0.14em]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentIssues.map((issue, idx) => (
                  <tr key={issue.id} className={`border-b border-border/70 hover:bg-surface-soft transition-colors ${idx === recentIssues.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-muted">{issue.issueCode}</td>
                    <td className="px-4 py-3.5 text-foreground font-semibold max-w-xs truncate">
                      <Link href={`/issues/${issue.id}`} className="hover:text-brand transition-colors">
                        {issue.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-muted">{displayEnum(issue.category)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${getIssueStatusBadge(issue.status)}`}>
                        {displayEnum(issue.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted text-xs">{new Date(issue.createdAt).toLocaleDateString()}</td>
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
