'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ApiIssueCategory, ApiIssueSeverity, createIssue, uploadIssueImage } from '@/lib/api';

interface ReportIssueForm {
  title: string;
  description: string;
  category: ApiIssueCategory;
  subCategory: string;
  severity: ApiIssueSeverity;
  locationLabel: string;
  latitude?: number;
  longitude?: number;
}

const categoryOptions: ApiIssueCategory[] = [
  'ROADS',
  'ACCESSIBILITY',
  'SANITATION',
  'UTILITIES',
  'PUBLIC_SAFETY',
];

const severityOptions: ApiIssueSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function displayEnum(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ReportIssuePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReportIssueForm>({
    defaultValues: {
      category: 'ROADS',
      severity: 'MEDIUM',
    },
  });

  const onSubmit = async (values: ReportIssueForm) => {
    setServerError('');
    setSubmitting(true);

    const uploadedMediaUrls: string[] = [];

    for (const file of files) {
      const { data, error } = await uploadIssueImage(file);
      if (error || !data?.url) {
        setServerError(error ?? 'Image upload failed');
        setSubmitting(false);
        return;
      }

      uploadedMediaUrls.push(data.url);
    }

    const { error } = await createIssue({
      title: values.title,
      description: values.description,
      category: values.category,
      subCategory: values.subCategory,
      severity: values.severity,
      locationLabel: values.locationLabel || undefined,
      latitude: values.latitude,
      longitude: values.longitude,
      mediaUrls: uploadedMediaUrls,
    });

    if (error) {
      setServerError(error);
      setSubmitting(false);
      return;
    }

    router.push('/issues');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-2xl border border-border p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-muted font-semibold">Citizen Reporting</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Report a New Issue</h1>
        <p className="mt-2 text-sm text-muted">
          Submit detailed and location-aware issue reports to help authorities respond faster.
        </p>
      </section>

      <section className="glass-card rounded-2xl border border-border p-5 md:p-6 max-w-4xl">
        {serverError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4" noValidate>
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-semibold text-foreground/80 mb-1.5">
              Title
            </label>
            <input
              id="title"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-white outline-none ${
                errors.title ? 'border-red-400' : 'border-border focus:border-brand'
              }`}
              placeholder="Pothole near Sector 9 bus stop"
              {...register('title', {
                required: 'Title is required',
                minLength: { value: 5, message: 'Minimum 5 characters required' },
              })}
            />
            {errors.title && <p className="mt-1.5 text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-semibold text-foreground/80 mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              rows={5}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-white outline-none ${
                errors.description ? 'border-red-400' : 'border-border focus:border-brand'
              }`}
              placeholder="Describe the issue, impact, and any useful context for local teams."
              {...register('description', {
                required: 'Description is required',
                minLength: { value: 20, message: 'Minimum 20 characters required' },
              })}
            />
            {errors.description && (
              <p className="mt-1.5 text-xs text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-foreground/80 mb-1.5">
              Category
            </label>
            <select
              id="category"
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-brand"
              {...register('category', { required: true })}
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {displayEnum(option)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="subCategory" className="block text-sm font-semibold text-foreground/80 mb-1.5">
              Sub-category
            </label>
            <input
              id="subCategory"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-white outline-none ${
                errors.subCategory ? 'border-red-400' : 'border-border focus:border-brand'
              }`}
              placeholder="Road Damage / Street Light / Drainage"
              {...register('subCategory', { required: 'Sub-category is required' })}
            />
            {errors.subCategory && (
              <p className="mt-1.5 text-xs text-red-600">{errors.subCategory.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="severity" className="block text-sm font-semibold text-foreground/80 mb-1.5">
              Severity
            </label>
            <select
              id="severity"
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-brand"
              {...register('severity', { required: true })}
            >
              {severityOptions.map((option) => (
                <option key={option} value={option}>
                  {displayEnum(option)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="locationLabel" className="block text-sm font-semibold text-foreground/80 mb-1.5">
              Location Label
            </label>
            <input
              id="locationLabel"
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm bg-white outline-none focus:border-brand"
              placeholder="Near City Hospital, Main Gate"
              {...register('locationLabel')}
            />
          </div>

          <div>
            <label htmlFor="latitude" className="block text-sm font-semibold text-foreground/80 mb-1.5">
              Latitude
            </label>
            <input
              id="latitude"
              type="number"
              step="any"
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm bg-white outline-none focus:border-brand"
              placeholder="28.6139"
              {...register('latitude', { valueAsNumber: true })}
            />
          </div>

          <div>
            <label htmlFor="longitude" className="block text-sm font-semibold text-foreground/80 mb-1.5">
              Longitude
            </label>
            <input
              id="longitude"
              type="number"
              step="any"
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm bg-white outline-none focus:border-brand"
              placeholder="77.2090"
              {...register('longitude', { valueAsNumber: true })}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="images" className="block text-sm font-semibold text-foreground/80 mb-1.5">
              Evidence Images
            </label>
            <input
              id="images"
              type="file"
              multiple
              accept="image/*"
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm bg-white outline-none focus:border-brand"
              onChange={(event) => {
                const selectedFiles = Array.from(event.target.files ?? []);
                setFiles(selectedFiles.slice(0, 6));
              }}
            />
            <p className="mt-1.5 text-xs text-muted">Up to 6 images, max 5MB each.</p>
          </div>

          <div className="md:col-span-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Issue'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
