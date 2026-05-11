const ISSUE_STATUS_BADGE: Record<string, string> = {
  RESOLVED: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-blue-100 text-[#1a56db]',
  REPORTED: 'bg-amber-100 text-amber-700',
  ACKNOWLEDGED: 'bg-cyan-100 text-cyan-700',
  REJECTED: 'bg-rose-100 text-rose-700',
};

export function getIssueStatusBadge(status: string): string {
  return ISSUE_STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-700';
}
