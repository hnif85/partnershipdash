"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

type Event = {
  id: string;
  name: string;
  event_date: string;
  partner: string;
  location: string;
  event_type: string;
  description: string;
  max_participants: number;
  registration_deadline: string;
  is_active: boolean;
  is_registration_open?: boolean;
};

type ApiResponse = {
  event?: Event;
  error?: string;
};

type FormData = {
  full_name: string;
  phone_number: string;
  email: string;
  business_name: string;
  notes: string;
};

type FormErrors = {
  full_name?: string;
  phone_number?: string;
  email?: string;
  business_name?: string;
  notes?: string;
  general?: string;
};

export default function RegisterEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    phone_number: "",
    email: "",
    business_name: "",
    notes: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      const result = await response.json();

      if (result.event) {
        setEvent(result.event);
      } else {
        setErrors({ general: "Event tidak ditemukan" });
      }
    } catch (error) {
      console.error("Error fetching event:", error);
      setErrors({ general: "Gagal memuat data event" });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Nama Lengkap wajib diisi";
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = "No. HandPhone wajib diisi";
    } else {
      const phoneRegex = /^08\d{8,11}$/;
      const cleanPhone = formData.phone_number.replace(/[\s-]/g, "");
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.phone_number =
          "Format No. HandPhone tidak valid (contoh: 081234567890)";
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email wajib diisi";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Format email tidak valid";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/events-public/${eventId}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error) {
          setErrors({ general: result.error });
        } else {
          setErrors({ general: "Pendaftaran gagal. Silakan coba lagi." });
        }
        return;
      }

      setSuccess(true);
    } catch (error) {
      console.error("Error registering:", error);
      setErrors({ general: "Terjadi kesalahan. Silakan coba lagi." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1f3c88] border-t-transparent"></div>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
        <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
          <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
                Partnership Management
              </p>
              <h1 className="text-3xl font-bold text-[#0f172a]">
                Pendaftaran Berhasil
              </h1>
            </div>
          </header>

          <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-green-800">
              Terdaftar!
            </h2>
            <p className="mb-6 text-green-700">
              Pendaftaran event <strong>{event?.name}</strong> berhasil!
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/events"
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Kembali ke Daftar Event
              </Link>
              <Link
                href="/events"
                className="rounded-lg bg-[#1f3c88] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f3c88]/90"
              >
                Daftar Event Lainnya
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
        <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
          <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
                Partnership Management
              </p>
              <h1 className="text-3xl font-bold text-[#0f172a]">Event Tidak Ditemukan</h1>
            </div>
          </header>
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="text-red-700">
              {errors.general || "Event yang Anda cari tidak ditemukan"}
            </p>
            <Link
              href="/events"
              className="mt-4 inline-block text-sm font-medium text-[#1f3c88] hover:underline"
            >
              Kembali ke Daftar Event
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/events" className="text-zinc-500 hover:text-[#1f3c88]">
              Event
            </Link>
            <span className="text-zinc-400">/</span>
            <Link
              href={`/events/${event.id}`}
              className="text-zinc-500 hover:text-[#1f3c88]"
            >
              {event.name}
            </Link>
            <span className="text-zinc-400">/</span>
            <span className="text-[#1f3c88]">Daftar</span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
              Partnership Management
            </p>
            <h1 className="text-3xl font-bold text-[#0f172a]">
              Daftar Event: {event.name}
            </h1>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Event Info */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[#0f172a]">
                Informasi Event
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    Tanggal
                  </p>
                  <p className="mt-1 font-medium text-zinc-800">
                    {formatDate(event.event_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    Partner
                  </p>
                  <p className="mt-1 font-medium text-zinc-800">
                    {event.partner || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    Lokasi
                  </p>
                  <p className="mt-1 font-medium text-zinc-800">
                    {event.location || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    Tipe
                  </p>
                  <p className="mt-1 font-medium text-zinc-800">
                    {event.event_type === "online" ? "Online" : "Offline"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    Batas Pendaftaran
                  </p>
                  <p className="mt-1 font-medium text-zinc-800">
                    {formatDate(event.registration_deadline)}
                  </p>
                </div>
                {event.description && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-zinc-500">
                      Deskripsi
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {event.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-lg font-semibold text-[#0f172a]">
                Form Pendaftaran
              </h2>

              {errors.general && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="full_name"
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                      errors.full_name
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : "border-zinc-200 focus:border-[#1f3c88] focus:ring-[#1f3c88]"
                    }`}
                    placeholder="Masukkan nama lengkap Anda"
                  />
                  {errors.full_name && (
                    <p className="mt-1 text-sm text-red-500">{errors.full_name}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="phone_number"
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    No. HandPhone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                      errors.phone_number
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : "border-zinc-200 focus:border-[#1f3c88] focus:ring-[#1f3c88]"
                    }`}
                    placeholder="Contoh: 081234567890"
                  />
                  {errors.phone_number && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.phone_number}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                      errors.email
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : "border-zinc-200 focus:border-[#1f3c88] focus:ring-[#1f3c88]"
                    }`}
                    placeholder="Contoh: email@anda.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="business_name"
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    Nama Bisnis/Usaha
                  </label>
                  <input
                    type="text"
                    id="business_name"
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                    placeholder="Masukkan nama bisnis/usaha Anda (jika ada)"
                  />
                </div>

                <div>
                  <label
                    htmlFor="notes"
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    Catatan
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                    placeholder="Tambahkan catatan atau pertanyaan (opsional)"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-lg bg-[#1f3c88] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f3c88]/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Mendaftarkan..." : "Daftar Sekarang"}
                  </button>
                  <Link
                    href={`/events/${event.id}`}
                    className="rounded-lg border border-zinc-200 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Batal
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
