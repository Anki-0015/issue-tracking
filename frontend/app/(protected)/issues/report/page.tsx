'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import dynamic from 'next/dynamic';
import { ApiIssueCategory, ApiIssueSeverity, createIssue, uploadIssueImage } from '@/lib/api';
import { displayEnum } from '@/lib/format';

// Dynamic import to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import('./LocationPicker'), { ssr: false });

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

const CATEGORY_PRESETS: Record<ApiIssueCategory, string[]> = {
  ROADS: ['Pothole', 'Crack', 'Speed Breaker Issue', 'Road Sign Missing', 'Waterlogging', 'Unmarked Construction'],
  ACCESSIBILITY: ['Broken Ramp', 'Missing Handrail', 'Blocked Pathway', 'No Wheelchair Access', 'Poor Signage'],
  SANITATION: ['Garbage Pile', 'Sewage Leak', 'Open Drain', 'Littering', 'Overflowing Bin', 'Dead Animal'],
  UTILITIES: ['Street Light Out', 'Water Pipe Leak', 'Power Line Down', 'Broken Manhole', 'No Water Supply'],
  PUBLIC_SAFETY: ['Broken Traffic Signal', 'Missing Street Light', 'Stray Animals', 'Illegal Encroachment', 'Fire Hazard'],
};

const SEVERITY_INFO: Record<ApiIssueSeverity, { color: string; description: string }> = {
  LOW: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', description: 'Minor inconvenience' },
  MEDIUM: { color: 'bg-amber-100 text-amber-700 border-amber-200', description: 'Needs attention soon' },
  HIGH: { color: 'bg-orange-100 text-orange-700 border-orange-200', description: 'Urgent issue' },
  CRITICAL: { color: 'bg-red-100 text-red-700 border-red-200', description: 'Immediate danger' },
};

const MAX_IMAGE_COUNT = 6;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function ReportIssuePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReportIssueForm>({
    defaultValues: {
      category: 'ROADS',
      severity: 'MEDIUM',
    },
  });

  const selectedCategory = watch('category');
  const selectedSeverity = watch('severity');
  const currentSubCategory = watch('subCategory');

  // Generate image previews
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const handleLocationSelect = useCallback(
    (lat: number, lng: number, label: string) => {
      setValue('latitude', lat);
      setValue('longitude', lng);
      setValue('locationLabel', label);
    },
    [setValue]
  );

  const addFiles = useCallback(
    (newFiles: File[]) => {
      setFileError('');

      const validFiles = newFiles.filter((f) => {
        if (!ALLOWED_IMAGE_TYPES.has(f.type)) {
          setFileError('Only JPEG, PNG, and WEBP files are allowed.');
          return false;
        }
        if (f.size > MAX_IMAGE_SIZE_BYTES) {
          setFileError('Each image must be 5MB or smaller.');
          return false;
        }
        return true;
      });

      setFiles((prev) => {
        const combined = [...prev, ...validFiles];
        if (combined.length > MAX_IMAGE_COUNT) {
          setFileError(`You can upload up to ${MAX_IMAGE_COUNT} images.`);
          return combined.slice(0, MAX_IMAGE_COUNT);
        }
        return combined;
      });
    },
    []
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError('');
  }, []);

  const onSubmit = async (values: ReportIssueForm) => {
    setServerError('');
    setFileError('');
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

      <section className="glass-card rounded-2xl border border-border p-5 md:p-6 max-w-5xl">
        {serverError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* Title & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-semibold text-foreground/80 mb-1.5">
                Title
              </label>
              <input
                id="title"
                className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-white outline-none transition-colors ${
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
                rows={4}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-white outline-none transition-colors ${
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
          </div>

          {/* Category & Sub-category */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-foreground/80 mb-1.5">
                  Category
                </label>
                <select
                  id="category"
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-brand transition-colors"
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
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-white outline-none transition-colors ${
                    errors.subCategory ? 'border-red-400' : 'border-border focus:border-brand'
                  }`}
                  placeholder="Type or select from presets below"
                  {...register('subCategory', { required: 'Sub-category is required' })}
                />
                {errors.subCategory && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.subCategory.message}</p>
                )}
              </div>
            </div>

            {/* Smart Preset Chips */}
            <div className="flex flex-wrap gap-2">
              {CATEGORY_PRESETS[selectedCategory]?.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setValue('subCategory', preset)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    currentSubCategory === preset
                      ? 'bg-brand text-white border-brand shadow-sm'
                      : 'bg-white text-muted border-border hover:border-brand hover:text-brand'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-semibold text-foreground/80 mb-2">Severity</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {severityOptions.map((option) => {
                const info = SEVERITY_INFO[option];
                return (
                  <label
                    key={option}
                    className={`relative flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 cursor-pointer transition-all ${
                      selectedSeverity === option
                        ? `${info.color} border-current shadow-sm`
                        : 'border-border bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={option}
                      className="sr-only"
                      {...register('severity', { required: true })}
                    />
                    <span className="text-sm font-bold">{displayEnum(option)}</span>
                    <span className="text-[10px] opacity-75">{info.description}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Location Picker */}
          <div>
            <label className="block text-sm font-semibold text-foreground/80 mb-2">
              📍 Issue Location
            </label>
            <LocationPicker onSelect={handleLocationSelect} />
            <input type="hidden" {...register('latitude')} />
            <input type="hidden" {...register('longitude')} />
            <input type="hidden" {...register('locationLabel')} />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-foreground/80 mb-2">
              Evidence Images
            </label>
            <div
              className={`relative rounded-xl border-2 border-dashed transition-colors p-6 text-center cursor-pointer ${
                dragging
                  ? 'border-brand bg-brand/5'
                  : 'border-border hover:border-brand/50 bg-white'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const droppedFiles = Array.from(e.dataTransfer.files);
                addFiles(droppedFiles);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const selectedFiles = Array.from(e.target.files ?? []);
                  addFiles(selectedFiles);
                  e.target.value = '';
                }}
              />
              <div className="flex flex-col items-center gap-2">
                <svg className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                <p className="text-sm text-muted">
                  <span className="font-semibold text-brand">Click to upload</span> or drag & drop
                </p>
                <p className="text-xs text-muted">PNG, JPEG, WEBP • Max 5MB • Up to 6 images</p>
              </div>
            </div>

            {/* Image Previews */}
            {previews.length > 0 && (
              <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2">
                {previews.map((src, i) => (
                  <div key={src} className="relative group rounded-lg overflow-hidden border border-border bg-surface-soft aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-1 py-0.5 truncate">
                      {(files[i]?.size / 1024).toFixed(0)}KB
                    </div>
                  </div>
                ))}
              </div>
            )}
            {fileError && <p className="mt-1.5 text-xs text-red-600">{fileError}</p>}
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || Boolean(fileError)}
              className="inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60 disabled:cursor-not-allowed transition-colors gap-2"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Issue Report'
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
