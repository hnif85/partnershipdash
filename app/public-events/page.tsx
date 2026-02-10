"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  events?: PublicEvent[];
  total_count?: number;
  error?: string;
};

export default function PublicEventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/events-public?upcoming=true');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengambil data event');
      }
      
      setEvents(data.events || []);
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

  const getEventTypeBadge = (type: string) => {
    return type === 'online'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-green-100 text-green-800';
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb]">
      {/* Hero Section */}
      <section className="bg-[#1f3c88] px-6 py-16 text-center lg:px-10 lg:py-24">
        <h1 className="text-3xl font-bold text-white lg:text-5xl">
          Event Partnership
        </h1>
        <p className="mt-4 text-lg text-blue-100 lg:text-xl">
          Bergabung dengan event-event eksklusif dari partnership kami
        </p>
      </section>

      {/* Events Grid */}
      <section className="px-6 py-12 lg:px-10 lg:py-16">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1f3c88] border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-center text-red-600">
            {error}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center">
            <p className="text-zinc-500">Belum ada event yang tersedia</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/public-events/${event.id}`}
                className="group flex flex-col rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getEventTypeBadge(event.event_type)}`}>
                      {event.event_type === 'online' ? '📱 Online' : '📍 Offline'}
                    </span>
                    {event.partner_name && (
                      <span className="text-xs text-zinc-500">
                        {event.partner_name}
                      </span>
                    )}
                  </div>
                  
                  <h2 className="mt-4 text-xl font-semibold text-[#0f172a] group-hover:text-[#1f3c88]">
                    {event.name}
                  </h2>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <span>📅</span>
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <span>📍</span>
                      <span>{event.location || (event.event_type === 'online' ? 'Online' : '-')}</span>
                    </div>
                  </div>

                  {event.description && (
                    <p className="mt-4 line-clamp-3 text-sm text-zinc-600">
                      {event.description}
                    </p>
                  )}
                </div>

                <div className="border-t border-zinc-100 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-zinc-500">
                      {event.max_participants 
                        ? `${event.current_participants}/${event.max_participants} peserta`
                        : `${event.current_participants} peserta`}
                    </div>
                    <span className="text-sm font-medium text-[#1f3c88] group-hover:underline">
                      {event.is_registration_open ? 'Daftar →' : 'Pendaftaran Ditutup'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
