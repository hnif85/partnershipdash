"use client";

import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

type PublicEvent = {
  id: string;
  name: string;
  event_date: string;
  location: string;
  event_type: string;
  is_registration_open: boolean;
};

type FormData = {
  full_name: string;
  phone_number: string;
  email: string;
  business_name: string;
};

type ApiResponse = {
  event?: PublicEvent;
  error?: string;
};

type RegistrationResponse = {
  registration?: any;
  is_new_user?: boolean;
  message?: string;
  error?: string;
  is_already_registered?: boolean;
};

export default function RegisterEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    phone_number: '',
    email: '',
    business_name: '',
  });

  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/events-public/${eventId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengambil data event');
      }

      setEvent(data.event);

      // If registration is closed, redirect back
      if (data.event && !data.event.is_registration_open) {
        router.push(`/public-events/${eventId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (formErrors[name as keyof FormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.full_name.trim()) {
      errors.full_name = 'Nama Lengkap wajib diisi';
    }

    if (!formData.phone_number.trim()) {
      errors.phone_number = 'No. HandPhone wajib diisi';
    } else {
      // Indonesian phone validation
      const phoneRegex = /^08\d{8,11}$/;
      const cleanPhone = formData.phone_number.replace(/[\s-]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        errors.phone_number = 'Format No. HandPhone tidak valid (contoh: 081234567890)';
      }
    }

    if (!formData.email.trim()) {
      errors.email = 'Email wajib diisi';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Format email tidak valid';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setSubmitting(true);

    try {
      const response = await fetch(`/api/events-public/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data: RegistrationResponse = await response.json();

      if (!response.ok) {
        if (data.is_already_registered) {
          setError('Anda sudah terdaftar di event ini');
        } else {
          throw new Error(data.error || 'Gagal mendaftar event');
        }
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fb]">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1f3c88] border-t-transparent"></div>
        </div>
      </main>
    );
  }

  if (error && !event) {
    return (
      <main className="min-h-screen bg-[#f7f8fb]">
        <div className="px-6 py-10 lg:px-10">
          <div className="rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </div>
          <Link href="/public-events" className="mt-4 inline-block text-[#1f3c88] hover:underline">
            ← Kembali ke daftar event
          </Link>
        </div>
      </main>
    );
  }

  // Success page
  if (success) {
    return (
      <main className="min-h-screen bg-[#f7f8fb]">
        <section className="bg-[#0f5132] px-6 py-12 text-center lg:px-10 lg:py-16">
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl">
                ✅
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white lg:text-3xl">
              Pendaftaran Berhasil!
            </h1>
            <p className="mt-2 text-green-100">
              Terima kasih telah mendaftar di event kami
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-xl px-6 py-12 lg:px-10">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#0f172a]">
              Detail Pendaftaran
            </h2>
            <dl className="space-y-4">
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <dt className="text-zinc-500">Event</dt>
                <dd className="font-medium text-[#0f172a]">{event?.name}</dd>
              </div>
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <dt className="text-zinc-500">Tanggal</dt>
                <dd className="font-medium text-[#0f172a]">
                  {event && formatDate(event.event_date)}
                </dd>
              </div>
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <dt className="text-zinc-500">Nama</dt>
                <dd className="font-medium text-[#0f172a]">{formData.full_name}</dd>
              </div>
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <dt className="text-zinc-500">Email</dt>
                <dd className="font-medium text-[#0f172a]">{formData.email}</dd>
              </div>
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <dt className="text-zinc-500">No. HP</dt>
                <dd className="font-medium text-[#0f172a]">{formData.phone_number}</dd>
              </div>
              {formData.business_name && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Nama Usaha</dt>
                  <dd className="font-medium text-[#0f172a]">{formData.business_name}</dd>
                </div>
              )}
            </dl>

            <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              📧 Kami akan mengirimkan konfirmasi dan detail event ke email Anda.
              Pastikan email aktif Anda!
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={`/public-events/${eventId}`}
                className="block w-full rounded-lg border border-zinc-200 py-3 text-center font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Lihat Detail Event
              </Link>
              <Link
                href="/public-events"
                className="block w-full rounded-lg bg-[#1f3c88] py-3 text-center font-medium text-white transition hover:bg-[#1f3c88]/90"
              >
                Event Lainnya
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb]">
      {/* Header */}
      <section className="bg-[#1f3c88] px-6 py-8 text-center lg:px-10">
        <Link
          href={`/public-events/${eventId}`}
          className="mb-4 inline-block text-sm text-blue-100 hover:text-white hover:underline"
        >
          ← Kembali ke Detail Event
        </Link>
        <h1 className="text-2xl font-bold text-white lg:text-3xl">
          Daftar Event
        </h1>
      </section>

      {/* Form */}
      <section className="mx-auto max-w-xl px-6 py-8 lg:px-10">
        {/* Event Info */}
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-[#0f172a]">{event?.name}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {event && formatDate(event.event_date)}
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="mb-1 block text-sm font-medium text-zinc-700">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleChange}
                className={`w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-1 ${
                  formErrors.full_name 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-zinc-200 focus:border-[#1f3c88] focus:ring-[#1f3c88]'
                }`}
                placeholder="Nama Lengkap Anda"
              />
              {formErrors.full_name && (
                <p className="mt-1 text-xs text-red-500">{formErrors.full_name}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone_number" className="mb-1 block text-sm font-medium text-zinc-700">
                No. HandPhone Aktif <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                required
                value={formData.phone_number}
                onChange={handleChange}
                className={`w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-1 ${
                  formErrors.phone_number 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-zinc-200 focus:border-[#1f3c88] focus:ring-[#1f3c88]'
                }`}
                placeholder="081234567890"
              />
              {formErrors.phone_number && (
                <p className="mt-1 text-xs text-red-500">{formErrors.phone_number}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
                Email Aktif <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-1 ${
                  formErrors.email 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-zinc-200 focus:border-[#1f3c88] focus:ring-[#1f3c88]'
                }`}
                placeholder="email@anda.com"
              />
              {formErrors.email && (
                <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>
              )}
            </div>

            {/* Business Name */}
            <div>
              <label htmlFor="business_name" className="mb-1 block text-sm font-medium text-zinc-700">
                Nama Usaha/Brand
              </label>
              <input
                type="text"
                id="business_name"
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                placeholder="Nama usaha Anda (opsional)"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full rounded-lg bg-[#1f3c88] py-3 font-medium text-white shadow-sm transition hover:bg-[#1f3c88]/90 disabled:opacity-50"
            >
              {submitting ? 'Memproses...' : 'Daftar Event'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
