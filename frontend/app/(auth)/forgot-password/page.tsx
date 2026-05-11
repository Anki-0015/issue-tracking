'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { requestPasswordReset } from '@/lib/api';

interface ForgotPasswordForm {
  email: string;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [debugResetUrl, setDebugResetUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>();

  const onSubmit = async (data: ForgotPasswordForm) => {
    setServerError('');
    setSuccessMessage('');
    setDebugResetUrl('');
    setLoading(true);

    const { data: response, error } = await requestPasswordReset({
      email: data.email,
    });

    if (error) {
      setServerError(error);
      setLoading(false);
      return;
    }

    setSuccessMessage(
      response?.message ??
        'If an account with that email exists, a password reset email has been sent. Check your inbox and spam folder.'
    );
    if (response?.debugResetUrl) {
      setDebugResetUrl(response.debugResetUrl);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-transparent">
      <div className="w-full max-w-md glass-card rounded-2xl border border-border shadow-[0_20px_80px_rgba(15,35,61,0.14)]">
        <div className="h-1.5 rounded-t-2xl bg-linear-to-r from-brand via-[#0a6599] to-accent" />

        <div className="p-7 sm:p-9">
          <h1 className="text-2xl font-bold text-foreground">Forgot your password?</h1>
          <p className="mt-2 text-sm text-muted">
            Enter your email and we will send a reset link if an account exists.
          </p>

          {serverError && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {successMessage && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          {debugResetUrl && (
            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              <p className="font-semibold">Local development link</p>
              <p className="mt-1">Use this to continue password reset in the same tab.</p>
              <button
                type="button"
                onClick={() => router.push(debugResetUrl)}
                className="mt-2 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800"
              >
                Continue to reset password
              </button>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand text-white py-2.5 text-sm font-semibold hover:bg-brand-strong disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Generating link...' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-sm text-muted">
            Back to{' '}
            <Link href="/login" className="text-brand font-semibold hover:text-brand-strong transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
