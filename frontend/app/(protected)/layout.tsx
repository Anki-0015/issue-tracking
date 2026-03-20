'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logoutUser, getCurrentUser, ApiUser } from '@/lib/api';

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

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCurrentUser().then(({ data }) => {
      if (!isMounted) return;

      if (data?.user) {
        setUser(data.user);
      } else {
        router.replace('/login');
      }

      setAuthChecking(false);
    }).catch(() => {
      if (!isMounted) return;
      setAuthChecking(false);
      router.replace('/login');
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

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

  if (!user) {
    return null;
  }

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
          {navLinks.map((link) => {
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
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-foreground">{user.name}</p>
              <p className="text-xs text-muted">Citizen Reporter</p>
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
