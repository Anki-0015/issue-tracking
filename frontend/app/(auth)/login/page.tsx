'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { loginUser } from '@/lib/api';

interface LoginForm {
  email: string;
  password: string;
}

function sanitizeNextPath(candidate: string | null): string {
  if (!candidate) return '/dashboard';

  if (!candidate.startsWith('/')) {
    return '/dashboard';
  }

  if (candidate.startsWith('//')) {
    return '/dashboard';
  }

  return candidate;
}

function LoginFormSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeNextPath(searchParams.get('next'));

  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setServerError('');
    setLoading(true);

    const { error } = await loginUser(data);

    if (error) {
      setServerError(error);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push(nextPath);
  };

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <section className="hidden lg:flex bg-[#08213c] text-white p-12 relative overflow-hidden">
        <div className="absolute -top-28 -left-14 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative z-10 max-w-xl self-center">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70 font-semibold">Civic Intelligence Platform</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight">Make public issues visible, measurable, and solvable.</h1>
          <p className="mt-5 text-base text-cyan-50/80 leading-relaxed">
            CivicReport helps citizens and local authorities collaborate with transparent tracking, clear timelines, and auditable progress updates.
          </p>

          <div className="mt-8 space-y-3 text-sm">
            <div className="rounded-xl border border-white/20 bg-white/10 p-4">Structured issue lifecycle from report to resolution.</div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-4">Geo-aware reporting with evidence images and timeline tracking.</div>
          </div>
        </div>
      </section>

      <section className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-transparent">
        <div className="w-full max-w-md glass-card rounded-2xl border border-border shadow-[0_20px_80px_rgba(15,35,61,0.14)]">
          <div className="h-1.5 rounded-t-2xl bg-linear-to-r from-brand via-[#0a6599] to-accent" />
          <div className="p-7 sm:p-9">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">CivicReport</p>
                <p className="text-xs text-muted">Issue Reporting Platform</p>
              </div>
            </div>

            <h2 className="mt-7 text-2xl font-bold text-foreground">Sign in to your account</h2>
            <p className="mt-1 text-sm text-muted">Continue to dashboard and track civic impact.</p>

            {serverError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 mt-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-foreground/80 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-white outline-none transition ${
                    errors.email ? 'border-red-400' : 'border-border focus:border-brand'
                  }`}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email address',
                    },
                  })}
                />
                {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-foreground/80 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={`w-full rounded-xl border px-4 py-2.5 pr-16 text-sm bg-white outline-none transition ${
                      errors.password ? 'border-red-400' : 'border-border focus:border-brand'
                    }`}
                    {...register('password', {
                      required: 'Password is required',
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 text-xs font-semibold text-muted hover:text-brand transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>}
                <div className="mt-2 text-right">
                  <Link href="/forgot-password" className="text-xs font-semibold text-brand hover:text-brand-strong transition-colors">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-brand text-white py-2.5 text-sm font-semibold hover:bg-brand-strong disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-border text-sm text-muted">
              New to CivicReport?{' '}
              <Link href="/signup" className="text-brand font-semibold hover:text-brand-strong transition-colors">
                Create account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginFormSection />
    </Suspense>
  );
}
