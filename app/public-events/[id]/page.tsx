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
        throw new Error(data.error || "Gagal mengambil data event");
      }

      setEvent(data.event);
      setRelatedEvents(data.related_events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white p-6 border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
          <p className="p-4 bg-orange-50 border-2 border-orange-600 text-sm font-bold text-orange-600 italic shadow-[4px_4px_0px_0px_rgba(234,88,12,1)]">
            {error || "Event tidak ditemukan"}
          </p>
          <Link
            href="/public-events"
            className="mt-4 inline-block text-orange-600 font-bold hover:underline"
          >
            ← Kembali ke daftar event
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl bg-white neo-border neo-shadow-large flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b-2 border-slate-900 p-6 bg-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                MWX Indonesia <span className="text-orange-600 italic">untuk UMKM</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Detail Event
              </p>
            </div>
            
          </div>
        </header>

        {/* Hero Banner */}
        <section className="bg-slate-900 p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span
              className={`px-4 py-2 text-sm font-black uppercase tracking-wider border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(234,88,12,1)] ${
                event.event_type === "online"
                  ? "bg-blue-400 text-white"
                  : "bg-green-400 text-white"
              }`}
            >
              {event.event_type === "online" ? "📱 ONLINE" : "📍 OFFLINE"}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-2">
            {event.name}
          </h1>
          {event.partner_name && (
            <p className="text-sm font-medium text-slate-400">
              bersama{" "}
              <span className="text-orange-400 font-bold">{event.partner_name}</span>
            </p>
          )}
        </section>

        {/* Main Content */}
        <div className="flex-1 p-6 md:p-8">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Details */}
            <div className="md:col-span-2 space-y-6">
              {/* Info Card */}
              <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-6">
                <h2 className="text-lg font-black uppercase tracking-tight mb-4 border-b-2 border-orange-100 pb-2">
                  📋 Informasi Event
                </h2>
                <dl className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-slate-50 border-2 border-slate-200">
                    <span className="text-2xl">📅</span>
                    <div>
                      <dd className="font-bold text-slate-900">{formatDate(event.event_date)}</dd>
                      <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Tanggal Event
                      </dt>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-slate-50 border-2 border-slate-200">
                    <span className="text-2xl">📍</span>
                    <div>
                      <dd className="font-bold text-slate-900">
                        {event.location ||
                          (event.event_type === "online"
                            ? "Link akan dikirim via email"
                            : "-")}
                      </dd>
                      <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {event.event_type === "online" ? "Meeting Link" : "Lokasi"}
                      </dt>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-slate-50 border-2 border-slate-200">
                    <span className="text-2xl">👥</span>
                    <div>
                      <dd className="font-bold text-slate-900">
                        {event.max_participants
                          ? `${event.current_participants} / ${event.max_participants}`
                          : `${event.current_participants}`}
                        <span className="text-xs font-medium text-slate-500 ml-2">peserta</span>
                      </dd>
                      <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Kapasitas
                      </dt>
                    </div>
                  </div>
                  {event.registration_deadline && (
                    <div className="flex items-center gap-4 p-3 bg-orange-50 border-2 border-orange-400">
                      <span className="text-2xl">⏰</span>
                      <div>
                        <dd className="font-bold text-orange-700">{formatDate(event.registration_deadline)}</dd>
                        <dt className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
                          Batas Pendaftaran
                        </dt>
                      </div>
                    </div>
                  )}
                </dl>
              </div>

              {/* Description */}
              {event.description && (
                <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-6">
                  <h2 className="text-lg font-black uppercase tracking-tight mb-4 border-b-2 border-orange-100 pb-2">
                    📝 Tentang Event
                  </h2>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {event.description}
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar CTA */}
            <div>
              <div className="sticky top-6 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-6">
                {event.is_registration_open ? (
                  <>
                    <div className="text-center mb-4">
                      <p className="text-3xl font-black text-green-600">GRATIS</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Tidak ada biaya
                      </p>
                    </div>
                    <Link
                      href={`/public-events/${event.id}/register`}
                      className="block w-full py-4 px-6 bg-orange-600 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-sm text-center shadow-[4px_4px_0px_0px_rgba(234,88,12,1)] hover:bg-orange-700 transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                      Daftar Sekarang →
                    </Link>
                    <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-orange-600">
                      ⚡ Slots terbatas, daftar segera!
                    </p>
                  </>
                ) : (
                  <div className="text-center p-4 bg-slate-100 border-2 border-slate-300">
                    <p className="font-black uppercase text-slate-600 mb-2">
                      Pendaftaran Ditutup
                    </p>
                    <p className="text-xs text-slate-500">
                      Maaf, pendaftaran untuk event ini sudah ditutup
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Related Events */}
          
        </div>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-400 p-3 text-[10px] flex flex-col md:flex-row justify-between px-6 uppercase tracking-widest font-bold gap-2">
          <span>© 2026 MWX Indonesia</span>
          <span className="text-white">Business Growth Accelerator</span>
        </footer>
      </div>
    </main>
  );
}
