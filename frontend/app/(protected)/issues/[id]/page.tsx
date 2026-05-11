'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ApiIssue,
  ApiIssueHistoryItem,
  ApiIssueStatus,
  ApiUser,
  getCurrentUser,
  getIssueById,
  getIssueHistory,
  updateIssueStatus,
} from '@/lib/api';
import { displayEnum } from '@/lib/format';

const statusOrder: ApiIssueStatus[] = [
  'REPORTED',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
];

function getAllowedNextStatuses(currentStatus: ApiIssueStatus): ApiIssueStatus[] {
  const map: Record<ApiIssueStatus, ApiIssueStatus[]> = {
    REPORTED: ['ACKNOWLEDGED', 'REJECTED'],
    ACKNOWLEDGED: ['IN_PROGRESS', 'REJECTED'],
    IN_PROGRESS: ['RESOLVED', 'REJECTED'],
    RESOLVED: [],
    REJECTED: [],
  };

  return map[currentStatus] ?? [];
}

export default function IssueDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [issue, setIssue] = useState<ApiIssue | null>(null);
  const [viewer, setViewer] = useState<ApiUser | null>(null);
  const [history, setHistory] = useState<ApiIssueHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [nextStatus, setNextStatus] = useState<ApiIssueStatus | ''>('');
  const [comment, setComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const issueId = params.id;

  async function fetchData() {
    setLoading(true);
    setError('');

    const [issueRes, historyRes, userRes] = await Promise.all([
      getIssueById(issueId),
      getIssueHistory(issueId),
      getCurrentUser(),
    ]);

    if (issueRes.error) {
      setError(issueRes.error);
      setLoading(false);
      return;
    }

    setIssue(issueRes.data?.issue ?? null);
    setHistory(historyRes.data?.history ?? []);
    setViewer(userRes.data?.user ?? null);
    setLoading(false);
  }

  useEffect(() => {
    if (!issueId) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId]);

  const allowedNextStatuses = useMemo(
    () => (issue ? getAllowedNextStatuses(issue.status) : []),
    [issue]
  );

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      const ai = statusOrder.indexOf(a.toStatus);
      const bi = statusOrder.indexOf(b.toStatus);
      if (ai !== bi) return ai - bi;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [history]);

  const handleStatusUpdate = async () => {
    if (!issue || !nextStatus) return;

    if (viewer?.role !== 'ADMIN') {
      setError('Only admins can change issue status');
      return;
    }

    setUpdating(true);

    const { error: updateError } = await updateIssueStatus({
      id: issue.id,
      status: nextStatus,
      comment: comment.trim() || undefined,
      rejectionReason: nextStatus === 'REJECTED' ? rejectionReason.trim() : undefined,
    });

    if (updateError) {
      setError(updateError);
      setUpdating(false);
      return;
    }

    setNextStatus('');
    setComment('');
    setRejectionReason('');
    await fetchData();
    setUpdating(false);
  };

  if (loading) {
    return <div className="glass-card rounded-2xl border border-border p-6 text-sm text-muted">Loading issue details...</div>;
  }

  if (error || !issue) {
    return (
      <div className="glass-card rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Issue not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-2xl border border-border p-6">
        <button
          onClick={() => router.push('/issues')}
          className="text-xs font-semibold text-brand hover:text-brand-strong transition-colors"
        >
          Back to Issue Center
        </button>

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted font-semibold">{issue.issueCode}</p>
            <h1 className="mt-1 text-3xl font-bold text-foreground">{issue.title}</h1>
            <p className="mt-2 text-sm text-muted max-w-3xl">{issue.description}</p>
          </div>
          <div className="chip">Status: {displayEnum(issue.status)}</div>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-xl border border-border bg-surface-soft p-3">
            <p className="text-xs text-muted">Category</p>
            <p className="mt-1 font-semibold text-foreground">{displayEnum(issue.category)}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-soft p-3">
            <p className="text-xs text-muted">Severity</p>
            <p className="mt-1 font-semibold text-foreground">{displayEnum(issue.severity)}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-soft p-3">
            <p className="text-xs text-muted">Location</p>
            <p className="mt-1 font-semibold text-foreground">{issue.locationLabel || '-'}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-soft p-3">
            <p className="text-xs text-muted">Time to Finish</p>
            <p className="mt-1 font-semibold text-foreground">
              {issue.timeToFinishMinutes !== null ? `${issue.timeToFinishMinutes} min` : '-'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 glass-card rounded-2xl border border-border p-5">
          <h2 className="text-lg font-bold text-foreground">Audit Timeline</h2>
          <p className="text-xs text-muted mt-1">Public history of status transitions and official comments.</p>

          <div className="mt-5 space-y-3">
            {sortedHistory.length === 0 ? (
              <p className="text-sm text-muted">No audit entries found.</p>
            ) : (
              sortedHistory.map((item) => (
                <article key={item.id} className="rounded-xl border border-border bg-surface-soft p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-foreground">{displayEnum(item.toStatus)}</span>
                    <span className="text-muted">from {item.fromStatus ? displayEnum(item.fromStatus) : 'Initial State'}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(item.createdAt).toLocaleString()} by {item.changedBy.name}
                  </p>
                  {item.comment && <p className="mt-2 text-sm text-foreground/90">{item.comment}</p>}
                </article>
              ))
            )}
          </div>
        </div>

        <aside className="glass-card rounded-2xl border border-border p-5">
          <h3 className="text-base font-bold text-foreground">Update Status</h3>
          <p className="text-xs text-muted mt-1">Move issue through workflow with optional official comment.</p>

          {viewer?.role !== 'ADMIN' ? (
            <p className="mt-4 rounded-xl border border-border bg-surface-soft p-3 text-sm text-muted">
              Status updates are restricted to administrator accounts.
            </p>
          ) : allowedNextStatuses.length === 0 ? (
            <p className="text-sm text-muted mt-4">This issue has reached a terminal state.</p>
          ) : (
            <div className="mt-4 space-y-3">
              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as ApiIssueStatus | '')}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
              >
                <option value="">Select next status</option>
                {allowedNextStatuses.map((status) => (
                  <option key={status} value={status}>
                    {displayEnum(status)}
                  </option>
                ))}
              </select>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Official comment (optional)"
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
              />

              {nextStatus === 'REJECTED' && (
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Rejection reason (required)"
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                />
              )}

              <button
                onClick={handleStatusUpdate}
                disabled={updating || !nextStatus}
                className="w-full rounded-xl bg-brand text-white py-2.5 text-sm font-semibold hover:bg-brand-strong disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Apply Status Change'}
              </button>
            </div>
          )}
        </aside>
      </section>

      {issue.mediaUrls.length > 0 && (
        <section className="glass-card rounded-2xl border border-border p-5">
          <h3 className="text-base font-bold text-foreground">Evidence Images</h3>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {issue.mediaUrls.map((url, index) => {
              const resolvedUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}${url}`;
              return (
                <a key={`${url}-${index}`} href={resolvedUrl} target="_blank" rel="noreferrer" className="block rounded-xl border border-border overflow-hidden bg-surface-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolvedUrl} alt={`Issue evidence ${index + 1}`} className="w-full h-40 object-cover" />
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
