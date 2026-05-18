"use client";

import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";

type PublicEvent = {
  id: string;
  name: string;
  event_date: string;
  location: string;
  event_type: string;
};

type RegistrationData = {
  full_name: string;
  email: string;
  phone_number: string;
  business_name?: string;
};

function SuccessPageContent() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedRegistration = sessionStorage.getItem("registration_success");
    if (storedRegistration) {
      try {
        const data = JSON.parse(storedRegistration);
        setRegistrationData(data);
        sessionStorage.removeItem("registration_success");
      } catch (e) {
        console.error("Failed to parse registration data");
      }
    }

    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events-public/${eventId}`);
      const data = await response.json();
      if (data.event) {
        setEvent(data.event);
      }
    } catch (e) {
      console.error("Failed to fetch event");
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

  return (
    <main className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-lg bg-white neo-border neo-shadow-large flex flex-col overflow-hidden">
        {/* Top accent bar */}
        <div className="h-2 bg-orange-600"></div>

        {/* Header */}
        <section className="bg-slate-900 text-slate-400 p-3 text-[10px] flex flex-col md:flex-row justify-between px-6 uppercase tracking-widest font-bold gap-2">
          <span>Juragan UMKM</span>
          <span className="text-white">Business Growth Accelerator</span>
        </section>

        {/* Success Content */}
        <section className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          {/* Success Icon */}
          <div className="relative mb-8">
            <div className="bg-orange-100 w-28 h-28 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(234,88,12,1)]">
              <span className="text-6xl">🎉</span>
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <span className="text-white text-xl">✓</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900 mb-3">
            Pendaftaran Berhasil!
          </h1>

          {/* Event Name */}
          <div className="mb-6 px-6 py-3 bg-orange-50 border-2 border-orange-400">
            <p className="text-sm font-bold text-orange-700 uppercase tracking-widest">
              Event
            </p>
            <p className="text-lg font-black text-orange-600">
              {event?.name || "Loading..."}
            </p>
          </div>

          {/* Description */}
          <p className="text-sm font-medium text-slate-600 mb-8 max-w-md leading-relaxed">
            Terima kasih telah mendaftar. Kami tunggu kehadiran Anda di event ini. 
            Detail informasi akan dikirimkan ke email Anda.
          </p>

          {/* Registration Summary */}
          {registrationData && (
            <div className="w-full max-w-sm text-left bg-slate-50 p-5 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-8">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                Data Pendaftaran
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Nama</dt>
                  <dd className="font-bold text-slate-900">{registrationData.full_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="font-bold text-orange-600">{registrationData.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">No. HP</dt>
                  <dd className="font-bold text-slate-900">{registrationData.phone_number}</dd>
                </div>
                {registrationData.business_name && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Usaha</dt>
                    <dd className="font-bold text-slate-900">{registrationData.business_name}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Event Date */}
          {event?.event_date && (
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-slate-900 border-2 border-slate-900 flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Tanggal Event
                </p>
                <p className="font-bold text-slate-900">{formatDate(event.event_date)}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full max-w-sm flex flex-col gap-3">
            <button
              onClick={() => window.close()}
              className="w-full py-3 px-6 bg-orange-600 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-sm text-center hover:bg-orange-700 transition-all shadow-[4px_4px_0px_0px_rgba(234,88,12,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Tutup
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-400 p-3 text-[10px] flex flex-col md:flex-row justify-between px-6 uppercase tracking-widest font-bold gap-2">
          <span>© 2026 Juragan UMKM</span>
          <span className="text-white">Business Growth Accelerator</span>
        </footer>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center p-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
        </main>
      }
    >
      <SuccessPageContent />
    </Suspense>
  );
}
