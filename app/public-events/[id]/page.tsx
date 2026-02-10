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
  description: string;
  registration_deadline: string;
  max_participants: number;
  current_participants: number;
  partner_name: string;
  is_registration_open: boolean;
};

type ApiResponse = {
  event?: PublicEvent;
  related_events?: PublicEvent[];
  error?: string;
};

export default function PublicEventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/events-public/${eventId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengambil data event');
      }

      setEvent(data.event);
      setRelatedEvents(data.related_events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
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

  if (error || !event) {
    return (
      <main className="min-h-screen bg-[#f7f8fb]">
        <div className="px-6 py-10 lg:px-10">
          <div className="rounded-lg bg-red-50 p-4 text-red-600">
            {error || 'Event tidak ditemukan'}
          </div>
          <Link href="/public-events" className="mt-4 inline-block text-[#1f3c88] hover:underline">
            ← Kembali ke daftar event
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb]">
      {/* Hero */}
      <section className="bg-[#1f3c88] px-6 py-12 text-center lg:px-10 lg:py-16">
        <Link
          href="/public-events"
          className="mb-6 inline-block text-sm text-blue-100 hover:text-white hover:underline"
        >
          ← Kembali ke Event
        </Link>
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${
              event.event_type === 'online' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {event.event_type === 'online' ? '📱 Online' : '📍 Offline'}
            </span>
            {event.partner_name && (
              <span className="text-sm text-blue-100">
                bersama {event.partner_name}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white lg:text-5xl">
            {event.name}
          </h1>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-4xl px-6 py-12 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Event Details Card */}
            <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[#0f172a]">Detail Event</h2>
              <dl className="space-y-4">
                <div className="flex items-start gap-4">
                  <dt className="w-8 text-zinc-500">📅</dt>
                  <dd>
                    <p className="font-medium text-[#0f172a]">{formatDate(event.event_date)}</p>
                    <p className="text-sm text-zinc-500">Tanggal Event</p>
                  </dd>
                </div>
                <div className="flex items-start gap-4">
                  <dt className="w-8 text-zinc-500">📍</dt>
                  <dd>
                    <p className="font-medium text-[#0f172a]">
                      {event.location || (event.event_type === 'online' ? 'Link akan dikirim setelah pendaftaran' : '-')}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {event.event_type === 'online' ? 'Link Meeting' : 'Lokasi'}
                    </p>
                  </dd>
                </div>
                <div className="flex items-start gap-4">
                  <dt className="w-8 text-zinc-500">👥</dt>
                  <dd>
                    <p className="font-medium text-[#0f172a]">
                      {event.max_participants 
                        ? `${event.current_participants} / ${event.max_participants} peserta`
                        : `${event.current_participants} peserta`}
                    </p>
                    <p className="text-sm text-zinc-500">Kapasitas</p>
                  </dd>
                </div>
                {event.registration_deadline && (
                  <div className="flex items-start gap-4">
                    <dt className="w-8 text-zinc-500">⏰</dt>
                    <dd>
                      <p className="font-medium text-[#0f172a]">{formatDate(event.registration_deadline)}</p>
                      <p className="text-sm text-zinc-500">Batas Pendaftaran</p>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Description */}
            {event.description && (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-[#0f172a]">Tentang Event</h2>
                <p className="whitespace-pre-wrap text-zinc-600">
                  {event.description}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="sticky top-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              {event.is_registration_open ? (
                <>
                  <div className="mb-4 text-center">
                    <p className="text-sm text-zinc-500">Gratis</p>
                    <p className="text-xs text-zinc-400">Tidak ada biaya pendaftaran</p>
                  </div>
                  <Link
                    href={`/public-events/${event.id}/register`}
                    className="block w-full rounded-lg bg-[#1f3c88] py-3 text-center font-medium text-white shadow-sm transition hover:bg-[#1f3c88]/90"
                  >
                    Daftar Sekarang
                  </Link>
                  <p className="mt-3 text-center text-xs text-zinc-500">
                    Slots terbatas, daftar segera!
                  </p>
                </>
              ) : (
                <div className="text-center">
                  <p className="font-medium text-zinc-600">Pendaftaran Ditutup</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Maaf, pendaftaran untuk event ini sudah ditutup
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Events */}
        {relatedEvents.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 text-xl font-semibold text-[#0f172a]">
              Event Lainnya
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {relatedEvents.map((related) => (
                <Link
                  key={related.id}
                  href={`/public-events/${related.id}`}
                  className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <span className={`mb-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${
                    related.event_type === 'online' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {related.event_type === 'online' ? 'Online' : 'Offline'}
                  </span>
                  <h3 className="font-medium text-[#0f172a]">{related.name}</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {formatDate(related.event_date)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
