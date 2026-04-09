'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { resetPassword } from '@/lib/api';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const params = useParams<{ token: string | string[] }>();
  const router = useRouter();

  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const tokenParam = params?.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ResetPasswordForm>();

  const onSubmit = async (data: ResetPasswordForm) => {
    setServerError('');
    setSuccessMessage('');

    if (!token) {
      setServerError('Reset token is missing or invalid.');
      return;
    }

    setLoading(true);

    const { data: response, error } = await resetPassword({
      token,
      newPassword: data.password,
    });

    if (error) {
      setServerError(error);
      setLoading(false);
      return;
    }

    setSuccessMessage(response?.message ?? 'Password updated successfully. Redirecting to sign in...');
    setLoading(false);
    setTimeout(() => {
      router.push('/login');
    }, 1200);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-transparent">
      <div className="w-full max-w-md glass-card rounded-2xl border border-border shadow-[0_20px_80px_rgba(15,35,61,0.14)]">
        <div className="h-1.5 rounded-t-2xl bg-linear-to-r from-brand via-[#0a6599] to-accent" />

        <div className="p-7 sm:p-9">
          <h1 className="text-2xl font-bold text-foreground">Set a new password</h1>
          <p className="mt-2 text-sm text-muted">
            Choose a strong password with at least 8 characters.
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

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 mt-6">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-foreground/80 mb-1.5">
                New password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  className={`w-full rounded-xl border px-4 py-2.5 pr-16 text-sm bg-white outline-none transition ${
                    errors.password ? 'border-red-400' : 'border-border focus:border-brand'
                  }`}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' },
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
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground/80 mb-1.5">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  className={`w-full rounded-xl border px-4 py-2.5 pr-16 text-sm bg-white outline-none transition ${
                    errors.confirmPassword ? 'border-red-400' : 'border-border focus:border-brand'
                  }`}
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) => value === getValues('password') || 'Passwords do not match',
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 text-xs font-semibold text-muted hover:text-brand transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand text-white py-2.5 text-sm font-semibold hover:bg-brand-strong disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Updating password...' : 'Reset password'}
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
