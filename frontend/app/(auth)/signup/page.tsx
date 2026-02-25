'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { registerUser } from '@/lib/api';

interface SignupForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupForm>();

  const password = watch('password');

  const onSubmit = async (data: SignupForm) => {
    setServerError('');
    setLoading(true);

    const { error } = await registerUser({
      name: data.name,
      email: data.email,
      password: data.password,
    });

    if (error) {
      setServerError(error);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-4 py-12">
      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1.5 bg-[#1a56db]" />

        <div className="px-8 py-10">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#0A1628]">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold text-[#0A1628] tracking-tight">
                CivicReport
              </span>
              <p className="text-xs text-gray-500 leading-none mt-0.5">
                Citizen Issue Reporting Platform
              </p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-[#0A1628]">Create your account</h1>
            <p className="mt-1 text-sm text-gray-500">
              Join thousands of citizens making their communities better
            </p>
          </div>

          {/* Error Banner */}
          {serverError && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 ${
                  errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                }`}
                {...register('name', {
                  required: 'Full name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                })}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 ${
                  errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                }`}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address',
                  },
                })}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className={`w-full rounded-lg border px-4 py-2.5 pr-11 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 ${
                    errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  className={`w-full rounded-lg border px-4 py-2.5 pr-11 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 ${
                    errors.confirmPassword
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-300 bg-white'
                  }`}
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === password || 'Passwords do not match',
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#0A1628] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#122040] disabled:cursor-not-allowed disabled:opacity-60 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Creating account…
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400">Already have an account?</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Sign in link */}
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Sign in instead
          </Link>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-8 py-4">
          <p className="text-center text-xs text-gray-400">
            By creating an account, you agree to our{' '}
            <span className="text-gray-600 underline cursor-pointer">Terms of Service</span> and{' '}
            <span className="text-gray-600 underline cursor-pointer">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}
