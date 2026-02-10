"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

type Partner = {
  partner: string;
  code?: string;
  is_gov?: boolean;
};

type Event = {
  id: string;
  name: string;
  event_date: string;
  id_partner: string;
  partner: string;
  location: string;
  event_type: string;
  description: string;
  max_participants: number;
  registration_deadline: string;
  is_active: boolean;
};

type FormData = {
  name: string;
  event_date: string;
  id_partner: string;
  partner: string;
  location: string;
  event_type: string;
  description: string;
  max_participants: string;
  registration_deadline: string;
  is_active: boolean;
};

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    event_date: '',
    id_partner: '',
    partner: '',
    location: '',
    event_type: 'offline',
    description: '',
    max_participants: '',
    registration_deadline: '',
    is_active: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      setFetching(true);
      try {
        // Fetch partners
        const eventsRes = await fetch('/api/events');
        const eventsData = await eventsRes.json();
        if (eventsData.partners) {
          setPartners(eventsData.partners);
        }

        // Fetch event
        const eventRes = await fetch(`/api/events/${eventId}`);
        const eventData = await eventRes.json();

        if (!eventRes.ok) {
          throw new Error(eventData.error || 'Gagal mengambil data event');
        }

        setEvent(eventData.event);
        setFormData({
          name: eventData.event.name || '',
          event_date: eventData.event.event_date || '',
          id_partner: eventData.event.id_partner || '',
          partner: eventData.event.partner || '',
          location: eventData.event.location || '',
          event_type: eventData.event.event_type || 'offline',
          description: eventData.event.description || '',
          max_participants: eventData.event.max_participants?.toString() || '',
          registration_deadline: eventData.event.registration_deadline || '',
          is_active: eventData.event.is_active ?? true,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      } finally {
        setFetching(false);
      }
    };

    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handlePartnerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      partner: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengupdate event');
      }

      router.push(`/events/${eventId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1f3c88] border-t-transparent"></div>
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
        <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
          <div className="rounded-lg bg-red-50 p-4 text-red-600">
            {error || 'Event tidak ditemukan'}
          </div>
          <Link href="/events" className="text-[#1f3c88] hover:underline">
            ← Kembali ke daftar event
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/events/${eventId}`}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              ← Kembali
            </Link>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
              Partnership Management
            </p>
            <h1 className="text-3xl font-bold text-[#0f172a]">
              Edit Event
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Perbarui informasi event di bawah.
            </p>
          </div>
        </header>

        {/* Form */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Nama Event */}
              <div className="md:col-span-2">
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-zinc-700">
                  Nama Event <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                />
              </div>

              {/* Tanggal Event */}
              <div>
                <label htmlFor="event_date" className="mb-2 block text-sm font-medium text-zinc-700">
                  Tanggal Event <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="event_date"
                  name="event_date"
                  required
                  value={formData.event_date}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                />
              </div>

              {/* Tipe Event */}
              <div>
                <label htmlFor="event_type" className="mb-2 block text-sm font-medium text-zinc-700">
                  Tipe Event <span className="text-red-500">*</span>
                </label>
                <select
                  id="event_type"
                  name="event_type"
                  required
                  value={formData.event_type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                >
                  <option value="offline">Offline ( Tatap Muka )</option>
                  <option value="online">Online ( Daring )</option>
                </select>
              </div>

              {/* Partner */}
              <div>
                <label htmlFor="id_partner" className="mb-2 block text-sm font-medium text-zinc-700">
                  Partner (Optional)
                </label>
                <select
                  id="id_partner"
                  name="id_partner"
                  value={formData.partner}
                  onChange={handlePartnerChange}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                >
                  <option value="">Pilih Partner...</option>
                  {partners.map(partner => (
                    <option key={partner.partner + '-' + partner.code} value={partner.partner}>
                      {partner.partner} ({partner.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lokasi */}
              <div>
                <label htmlFor="location" className="mb-2 block text-sm font-medium text-zinc-700">
                  Lokasi {formData.event_type === 'online' ? '(Link)' : ''}
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                />
              </div>

              {/* Max Participants */}
              <div>
                <label htmlFor="max_participants" className="mb-2 block text-sm font-medium text-zinc-700">
                  Maksimal Peserta
                </label>
                <input
                  type="number"
                  id="max_participants"
                  name="max_participants"
                  value={formData.max_participants}
                  onChange={handleChange}
                  min="0"
                  className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                />
              </div>

              {/* Registration Deadline */}
              <div>
                <label htmlFor="registration_deadline" className="mb-2 block text-sm font-medium text-zinc-700">
                  Batas Pendaftaran
                </label>
                <input
                  type="date"
                  id="registration_deadline"
                  name="registration_deadline"
                  value={formData.registration_deadline}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label htmlFor="description" className="mb-2 block text-sm font-medium text-zinc-700">
                  Deskripsi
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                />
              </div>

              {/* Status */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-5 w-5 rounded border-zinc-300 text-[#1f3c88] focus:ring-[#1f3c88]"
                  />
                  <span className="text-sm font-medium text-zinc-700">Event Aktif</span>
                </label>
                <p className="mt-1 ml-8 text-xs text-zinc-500">
                  Event aktif akan ditampilkan di halaman publik
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-6">
              <Link
                href={`/events/${eventId}`}
                className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[#1f3c88] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#1f3c88]/90 disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
