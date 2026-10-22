'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ApiIssue,
  ApiIssueComment,
  ApiIssueHistoryItem,
  ApiIssueStatus,
  ApiUser,
  addIssueComment,
  getCurrentUser,
  getIssueById,
  getIssueComments,
  getIssueHistory,
  toggleIssueUpvote,
  updateIssueStatus,
} from '@/lib/api';
import { displayEnum } from '@/lib/format';
import { getIssueStatusBadge } from '@/lib/issue-ui';

const IssueMap = dynamic(() => import('./IssueMap'), { ssr: false });

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function IssueDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [issue, setIssue] = useState<ApiIssue | null>(null);
  const [viewer, setViewer] = useState<ApiUser | null>(null);
  const [history, setHistory] = useState<ApiIssueHistoryItem[]>([]);
  const [comments, setComments] = useState<ApiIssueComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [nextStatus, setNextStatus] = useState<ApiIssueStatus | ''>('');
  const [statusComment, setStatusComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const [upvoting, setUpvoting] = useState(false);

  const issueId = params.id;

  async function fetchData() {
    setLoading(true);
    setError('');

    const [issueRes, historyRes, commentsRes, userRes] = await Promise.all([
      getIssueById(issueId),
      getIssueHistory(issueId),
      getIssueComments(issueId),
      getCurrentUser(),
    ]);

    if (issueRes.error) {
      setError(issueRes.error);
      setLoading(false);
      return;
    }

    setIssue(issueRes.data?.issue ?? null);
    setHistory(historyRes.data?.history ?? []);
    setComments(commentsRes.data?.comments ?? []);
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
      comment: statusComment.trim() || undefined,
      rejectionReason: nextStatus === 'REJECTED' ? rejectionReason.trim() : undefined,
    });

    if (updateError) {
      setError(updateError);
      setUpdating(false);
      return;
    }

    setNextStatus('');
    setStatusComment('');
    setRejectionReason('');
    await fetchData();
    setUpdating(false);
  };

  const handleUpvote = async () => {
    if (!issue || upvoting) return;
    setUpvoting(true);

    const { data } = await toggleIssueUpvote(issue.id);
    if (data) {
      setIssue((prev) =>
        prev ? { ...prev, upvoteCount: data.upvoteCount, hasUpvoted: data.upvoted } : prev
      );
    }
    setUpvoting(false);
  };

  const handlePostComment = async () => {
    if (!issue || !newComment.trim() || postingComment) return;
    setPostingComment(true);

    const { data, error: commentError } = await addIssueComment(issue.id, newComment.trim());
    if (commentError) {
      setError(commentError);
    } else if (data?.comment) {
      setComments((prev) => [...prev, data.comment]);
      setNewComment('');
    }
    setPostingComment(false);
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
      {/* Header */}
      <section className="glass-card rounded-2xl border border-border p-6">
        <button
          onClick={() => router.push('/issues')}
          className="text-xs font-semibold text-brand hover:text-brand-strong transition-colors"
        >
          ← Back to Issue Center
        </button>

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted font-semibold">{issue.issueCode}</p>
            <h1 className="mt-1 text-3xl font-bold text-foreground">{issue.title}</h1>
            <p className="mt-2 text-sm text-muted max-w-3xl">{issue.description}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Upvote Button */}
            <button
              onClick={handleUpvote}
              disabled={upvoting}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                issue.hasUpvoted
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-white border-border text-muted hover:border-red-200 hover:text-red-500'
              }`}
            >
              <svg
                className={`w-4 h-4 transition-transform ${upvoting ? 'scale-125' : ''}`}
                fill={issue.hasUpvoted ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
              {issue.upvoteCount}
            </button>
            <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${getIssueStatusBadge(issue.status)}`}>
              {displayEnum(issue.status)}
            </span>
          </div>
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
            <p className="mt-1 font-semibold text-foreground text-xs break-words">{issue.locationLabel || '-'}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-soft p-3">
            <p className="text-xs text-muted">Time to Finish</p>
            <p className="mt-1 font-semibold text-foreground">
              {issue.timeToFinishMinutes !== null ? `${issue.timeToFinishMinutes} min` : '-'}
            </p>
          </div>
        </div>
      </section>

      {/* Map */}
      {issue.latitude && issue.longitude && (
        <section className="glass-card rounded-2xl border border-border overflow-hidden">
          <IssueMap lat={issue.latitude} lng={issue.longitude} label={issue.locationLabel ?? issue.title} />
        </section>
      )}

      {/* Timeline + Status Update */}
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
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${getIssueStatusBadge(item.toStatus)}`}>
                      {displayEnum(item.toStatus)}
                    </span>
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
                {allowedNextStatuses.map((s) => (
                  <option key={s} value={s}>
                    {displayEnum(s)}
                  </option>
                ))}
              </select>

              <textarea
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
                rows={3}
                placeholder="Official comment (optional)"
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
              />

              {nextStatus === 'REJECTED' && (
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                  placeholder="Rejection reason (required)"
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                />
              )}

              <button
                onClick={handleStatusUpdate}
                disabled={updating || !nextStatus}
                className="w-full rounded-xl bg-brand text-white py-2.5 text-sm font-semibold hover:bg-brand-strong disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? 'Updating...' : 'Apply Status Change'}
              </button>
            </div>
          )}
        </aside>
      </section>

      {/* Comments */}
      <section className="glass-card rounded-2xl border border-border p-5">
        <h2 className="text-lg font-bold text-foreground">Discussion</h2>
        <p className="text-xs text-muted mt-1">{comments.length} comment{comments.length !== 1 ? 's' : ''}</p>

        {/* Comment input */}
        <div className="mt-4 flex gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand text-white text-xs font-bold shrink-0">
            {viewer?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Add a comment..."
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted">{newComment.length}/1000</span>
              <button
                onClick={handlePostComment}
                disabled={postingComment || !newComment.trim()}
                className="rounded-lg bg-brand text-white px-4 py-1.5 text-xs font-semibold hover:bg-brand-strong disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {postingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>

        {/* Comment list */}
        <div className="mt-5 space-y-3">
          {comments.map((c) => (
            <article key={c.id} className="flex gap-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold shrink-0 ${c.user.role === 'ADMIN' ? 'bg-amber-500' : 'bg-brand'}`}>
                {c.user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 rounded-xl border border-border bg-surface-soft p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{c.user.name}</span>
                  {c.user.role === 'ADMIN' && (
                    <span className="rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5">Admin</span>
                  )}
                  <span className="text-xs text-muted">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-foreground/85">{c.content}</p>
              </div>
            </article>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-muted text-center py-4">No comments yet. Start the discussion!</p>
          )}
        </div>
      </section>

      {/* Evidence Images */}
      {issue.mediaUrls.length > 0 && (
        <section className="glass-card rounded-2xl border border-border p-5">
          <h3 className="text-base font-bold text-foreground">Evidence Images</h3>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {issue.mediaUrls.map((url, index) => {
              const resolvedUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}${url}`;
              return (
                <a key={`${url}-${index}`} href={resolvedUrl} target="_blank" rel="noreferrer" className="block rounded-xl border border-border overflow-hidden bg-surface-soft hover:shadow-md transition-shadow">
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
