'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, ApiUser } from '@/lib/api';

const myReports = [
  { id: 'CIV-1024', title: 'Pothole on MG Road near metro station', category: 'Road', status: 'Resolved', date: 'Feb 22, 2026' },
  { id: 'CIV-1018', title: 'No drinking water supply for 3 days', category: 'Water', status: 'Resolved', date: 'Feb 14, 2026' },
  { id: 'CIV-1010', title: 'Broken footpath near municipal school', category: 'Road', status: 'Resolved', date: 'Jan 30, 2026' },
  { id: 'CIV-1022', title: 'Water pipeline leakage near park', category: 'Water', status: 'Pending', date: 'Feb 20, 2026' },
];

const statusBadge: Record<string, string> = {
  Resolved: 'bg-green-100 text-green-700',
  'In Progress': 'bg-blue-100 text-[#1a56db]',
  Pending: 'bg-amber-100 text-amber-700',
};

const categoryColors: Record<string, string> = {
  Road: 'bg-slate-100 text-slate-700',
  Water: 'bg-cyan-100 text-cyan-700',
  Sanitation: 'bg-teal-100 text-teal-700',
  Electricity: 'bg-yellow-100 text-yellow-700',
  Other: 'bg-gray-100 text-gray-700',
};

export default function ProfilePage() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
      setLoading(false);
    });
  }, []);

  const initials = user
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const joinedDate = user
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-sm text-gray-400">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A1628]">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account and view your reported issues
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <div className="lg:col-span-1 space-y-5">
          {/* Avatar & Name */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#0A1628] text-white text-2xl font-bold mb-4">
              {initials}
            </div>
            <h2 className="text-lg font-bold text-[#0A1628]">{user?.name ?? '—'}</h2>
            <p className="text-sm text-gray-500">{user?.email ?? '—'}</p>
            <div className="mt-3 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Verified Citizen
            </div>

            <div className="mt-6 w-full grid grid-cols-3 gap-px bg-gray-100 rounded-xl overflow-hidden border border-gray-100">
              {[
                { label: 'Total', value: myReports.length },
                { label: 'Resolved', value: myReports.filter(r => r.status === 'Resolved').length },
                { label: 'Pending', value: myReports.filter(r => r.status === 'Pending').length },
              ].map((s) => (
                <div key={s.label} className="bg-white px-2 py-3 text-center">
                  <p className="text-xl font-bold text-[#0A1628]">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Account details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[#0A1628]">Account Details</h3>
            {[
              {
                label: 'Email',
                value: user?.email ?? '—',
                icon: (
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                ),
              },
              {
                label: 'Member since',
                value: joinedDate,
                icon: (
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                {item.icon}
                <div>
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className="text-sm text-gray-700 font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reports */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-[#0A1628]">My Reports</h3>
              <p className="text-xs text-gray-400 mt-0.5">Issues you have submitted</p>
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
                  {myReports.map((issue, idx) => (
                    <tr
                      key={issue.id}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                        idx === myReports.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-6 py-3.5 font-mono text-xs font-medium text-gray-500">
                        {issue.id}
                      </td>
                      <td className="px-6 py-3.5 text-gray-800 font-medium max-w-xs truncate">
                        {issue.title}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${categoryColors[issue.category] ?? 'bg-gray-100 text-gray-700'}`}>
                          {issue.category}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${statusBadge[issue.status] ?? 'bg-gray-100 text-gray-700'}`}>
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
      </div>
    </div>
  );
}
