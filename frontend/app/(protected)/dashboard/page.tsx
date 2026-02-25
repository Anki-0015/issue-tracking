const stats = [
  {
    label: 'Total Issues Reported',
    value: '128',
    change: '+12 this month',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
      </svg>
    ),
    color: 'bg-blue-50 text-blue-700',
    accent: 'border-blue-200',
  },
  {
    label: 'Resolved',
    value: '94',
    change: '73% resolution rate',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-green-50 text-green-700',
    accent: 'border-green-200',
  },
  {
    label: 'In Progress',
    value: '7',
    change: 'Being addressed',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-blue-50 text-[#1a56db]',
    accent: 'border-blue-200',
  },
  {
    label: 'Pending Review',
    value: '27',
    change: 'Awaiting action',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
    color: 'bg-amber-50 text-amber-700',
    accent: 'border-amber-200',
  },
];

const recentIssues = [
  { id: 'CIV-1024', title: 'Pothole on MG Road near metro station', category: 'Road', status: 'Resolved', date: 'Feb 22, 2026' },
  { id: 'CIV-1023', title: 'Street light not working — Sector 14', category: 'Electricity', status: 'In Progress', date: 'Feb 21, 2026' },
  { id: 'CIV-1022', title: 'Water pipeline leakage near park', category: 'Water', status: 'Pending', date: 'Feb 20, 2026' },
  { id: 'CIV-1021', title: 'Garbage not collected for 5 days', category: 'Sanitation', status: 'Resolved', date: 'Feb 18, 2026' },
  { id: 'CIV-1020', title: 'Broken footpath tiles causing accidents', category: 'Road', status: 'Pending', date: 'Feb 17, 2026' },
  { id: 'CIV-1019', title: 'Stray animals blocking school entrance', category: 'Other', status: 'In Progress', date: 'Feb 16, 2026' },
];

const categoryColors: Record<string, string> = {
  Road: 'bg-slate-100 text-slate-700',
  Water: 'bg-cyan-100 text-cyan-700',
  Sanitation: 'bg-teal-100 text-teal-700',
  Electricity: 'bg-yellow-100 text-yellow-700',
  Other: 'bg-gray-100 text-gray-700',
};

const statusBadge: Record<string, string> = {
  Resolved: 'bg-green-100 text-green-700',
  'In Progress': 'bg-blue-100 text-[#1a56db]',
  Pending: 'bg-amber-100 text-amber-700',
};

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A1628]">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of civic issues reported across the city
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border bg-white px-5 py-5 ${stat.accent}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-[#0A1628]">{stat.value}</p>
                <p className="mt-1 text-xs text-gray-400">{stat.change}</p>
              </div>
              <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Issues */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-[#0A1628]">Recent Issues</h2>
            <p className="text-xs text-gray-400 mt-0.5">Latest reports submitted by citizens</p>
          </div>
          <button className="text-xs font-medium text-[#1a56db] hover:underline">
            View all
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Issue ID', 'Title', 'Category', 'Status', 'Date'].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentIssues.map((issue, idx) => (
                <tr
                  key={issue.id}
                  className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                    idx === recentIssues.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-6 py-3.5 font-mono text-xs font-medium text-gray-500">
                    {issue.id}
                  </td>
                  <td className="px-6 py-3.5 text-gray-800 font-medium max-w-xs truncate">
                    {issue.title}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${
                        categoryColors[issue.category] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {issue.category}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${
                        statusBadge[issue.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {issue.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-gray-500 text-xs">{issue.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
