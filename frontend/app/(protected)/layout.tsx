'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  logoutUser,
  getCurrentUser,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  ApiUser,
  ApiNotification,
} from '@/lib/api';

const navLinks = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: '/issues',
    label: 'Issue Center',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9A2.25 2.25 0 015.25 16.5v-9A2.25 2.25 0 017.5 5.25h9A2.25 2.25 0 0118.75 7.5v9A2.25 2.25 0 0116.5 18.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9.75h7.5M8.25 12h7.5M8.25 14.25h4.5" />
      </svg>
    ),
  },
  {
    href: '/issues/report',
    label: 'Report Issue',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'My Profile',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
];

const adminNavLink = {
  href: '/admin',
  label: 'Admin Panel',
  icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5A2.25 2.25 0 0119.5 12.75v6A2.25 2.25 0 0117.25 21h-10.5A2.25 2.25 0 014.5 18.75v-6a2.25 2.25 0 012.25-2.25z" />
    </svg>
  ),
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [sessionError, setSessionError] = useState('');

  // Notifications
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then(({ data, error }) => {
        if (!isMounted) return;

        if (data?.user) {
          setUser(data.user);
        } else if (error && /cannot connect|timed out/i.test(error)) {
          setSessionError('Backend API is unavailable. Please ensure the backend server is running on port 4000.');
        } else {
          router.replace('/login');
        }

        setAuthChecking(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setSessionError('Backend API is unavailable. Please ensure the backend server is running on port 4000.');
        setAuthChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Poll notifications every 30s
  useEffect(() => {
    if (!user) return;

    async function fetchNotifs() {
      const { data } = await getNotifications({ limit: 10 });
      if (data) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    }

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleNotifClick = async (notif: ApiNotification) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setShowNotifPanel(false);
    if (notif.issueId) {
      router.push(`/issues/${notif.issueId}`);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleLogout = async () => {
    await logoutUser();
    router.replace('/login');
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking your session...</p>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg border border-red-200 p-8 max-w-md w-full">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-center text-gray-900 mb-2">
            Connection Error
          </h2>
          <p className="text-center text-gray-600 text-sm mb-6">
            {sessionError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const workspaceLinks = user.role === 'ADMIN' ? [...navLinks, adminNavLink] : navLinks;

  return (
    <div className="min-h-screen bg-transparent flex">
      <aside className="hidden md:flex w-72 bg-[#08213c] flex-col shrink-0 border-r border-white/10">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#0ea5a4]">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight">CivicReport</span>
            <p className="text-[11px] text-cyan-100/70 leading-none mt-0.5">City Operations Workspace</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-50/50">
            Workspace
          </p>
          {workspaceLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]'
                    : 'text-cyan-50/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-cyan-50/70">Signed in as</p>
          <p className="mt-1 text-sm font-semibold text-white truncate">{user.email}</p>
          {user.role === 'ADMIN' && (
            <span className="mt-2 inline-flex items-center rounded-full border border-amber-200/40 bg-amber-100/20 px-2 py-0.5 text-[11px] font-semibold text-amber-100">
              Admin Access
            </span>
          )}
        </div>

        <div className="px-4 pb-5 border-t border-white/10 pt-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-cyan-50/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
              />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="glass-card border-b border-border px-5 md:px-8 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-brand text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5M3.75 12h16.5M3.75 18.75h16.5" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-semibold">Municipal Console</p>
              <p className="text-sm text-foreground/80">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifPanel((p) => !p)}
                className="relative flex items-center justify-center w-9 h-9 rounded-full border border-border bg-white hover:bg-surface-soft transition-colors"
              >
                <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifPanel && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
                  {/* Panel */}
                  <div className="absolute right-0 top-11 z-50 w-80 md:w-96 rounded-2xl border border-border bg-white shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-soft">
                      <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs font-semibold text-brand hover:text-brand-strong transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-border">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-sm text-muted text-center">No notifications yet</p>
                      ) : (
                        notifications.map((notif) => (
                          <button
                            key={notif.id}
                            onClick={() => handleNotifClick(notif)}
                            className={`w-full text-left px-4 py-3 hover:bg-surface-soft transition-colors ${
                              !notif.read ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {!notif.read && (
                                <span className="mt-1.5 w-2 h-2 rounded-full bg-brand shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${!notif.read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                                  {notif.message}
                                </p>
                                <p className="text-xs text-muted mt-0.5">{timeAgo(notif.createdAt)}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-foreground">{user.name}</p>
              <p className="text-xs text-muted">{user.role === 'ADMIN' ? 'Administrator' : 'Citizen Reporter'}</p>
            </div>
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand text-white text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 py-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
