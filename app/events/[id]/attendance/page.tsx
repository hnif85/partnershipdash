"use client";

import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

type Event = {
  id: string;
  name: string;
  event_date: string;
  partner: string;
  location: string;
  event_type: string;
  is_active: boolean;
};

type AttendanceResult = {
  success: boolean;
  found: boolean;
  already_attended: boolean;
  registration_id?: string;
  full_name?: string;
  email?: string;
  attended_at?: string;
  message: string;
  event_name?: string;
  event_date?: string;
  registration_url?: string;
};

export default function AttendancePage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState("");
  const [checkStatus, setCheckStatus] = useState<"idle" | "checking" | "found" | "not_found" | "attending" | "already_attended">("idle");
  const [attendanceResult, setAttendanceResult] = useState<AttendanceResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        throw new Error(data.error || "Gagal mengambil data event");
      }

      setEvent(data.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const checkEmail = async () => {
    if (!emailInput || !emailInput.includes("@")) {
      return;
    }

    setCheckStatus("checking");

    try {
      const response = await fetch(
        `/api/events/${eventId}/attendance?email=${encodeURIComponent(emailInput)}`
      );
      const data = await response.json();

      if (data.found) {
        setAttendanceResult(data);
        if (data.already_attended) {
          setCheckStatus("already_attended");
        } else {
          setCheckStatus("found");
        }
      } else {
        setAttendanceResult(data);
        setCheckStatus("not_found");
      }
    } catch (err) {
      setCheckStatus("idle");
      setError("Terjadi kesalahan saat memeriksa email");
    }
  };

  const handleCheckIn = async () => {
    setSubmitting(true);

    try {
      const response = await fetch(`/api/events/${eventId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal melakukan absensi");
      }

      setAttendanceResult(data);
      setCheckStatus("attending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal melakukan absensi");
    } finally {
      setSubmitting(false);
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

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const resetAndGoBack = () => {
    setEmailInput("");
    setCheckStatus("idle");
    setAttendanceResult(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
      </main>
    );
  }

  if (error && !event) {
    return (
      <main className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white p-6 border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
          <p className="p-4 bg-orange-50 border-2 border-orange-600 text-sm font-bold text-orange-600 italic shadow-[4px_4px_0px_0px_rgba(234,88,12,1)]">
            {error}
          </p>
          <Link href="/events" className="mt-4 inline-block text-orange-600 font-bold hover:underline">
            ← Kembali ke daftar event
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center p-4 md:p-8">
      {/* Success - Attending */}
      {checkStatus === "attending" && attendanceResult && (
        <div className="w-full max-w-lg bg-white neo-border neo-shadow-large flex flex-col overflow-hidden">
          <div className="h-2 bg-green-500"></div>
          <section className="bg-slate-900 text-slate-400 p-3 text-[10px] flex flex-col md:flex-row justify-between px-6 uppercase tracking-widest font-bold gap-2">
            <span>MWX Indonesia</span>
            <span className="text-white">Business Growth Accelerator</span>
          </section>

          <section className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="relative mb-8">
              <div className="bg-green-100 w-28 h-28 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(34,197,94,1)]">
                <span className="text-6xl">✓</span>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900 mb-3">
              Absensi Berhasil!
            </h1>

            {event && (
              <div className="mb-6 px-6 py-3 bg-orange-50 border-2 border-orange-400">
                <p className="text-sm font-bold text-orange-700 uppercase tracking-widest">
                  Event
                </p>
                <p className="text-lg font-black text-orange-600">
                  {event.name}
                </p>
              </div>
            )}

            <p className="text-sm font-medium text-slate-600 mb-8 max-w-md leading-relaxed">
              Terima kasih telah hadir. Selamat mengikuti event!
            </p>

            <div className="w-full max-w-sm text-left bg-slate-50 p-5 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-8">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                Data Absensi
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Nama</dt>
                  <dd className="font-bold text-slate-900">{attendanceResult.full_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="font-bold text-orange-600">{attendanceResult.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Waktu Hadir</dt>
                  <dd className="font-bold text-green-600">{formatTime(attendanceResult.attended_at || null)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <footer className="bg-slate-900 text-slate-400 p-3 text-[10px] flex flex-col md:flex-row justify-between px-6 uppercase tracking-widest font-bold gap-2">
            <span>© 2026 MWX Indonesia</span>
            <span className="text-white">Business Growth Accelerator</span>
          </footer>
        </div>
      )}

      {/* Already Attended */}
      {checkStatus === "already_attended" && attendanceResult && (
        <div className="w-full max-w-lg bg-white neo-border neo-shadow-large flex flex-col overflow-hidden">
          <div className="h-2 bg-yellow-500"></div>
          <section className="bg-slate-900 text-slate-400 p-3 text-[10px] flex flex-col md:flex-row justify-between px-6 uppercase tracking-widest font-bold gap-2">
            <span>MWX Indonesia</span>
            <span className="text-white">Business Growth Accelerator</span>
          </section>

          <section className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="relative mb-8">
              <div className="bg-yellow-100 w-28 h-28 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(234,179,8,1)]">
                <span className="text-6xl">✓</span>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900 mb-3">
              Sudah Absen
            </h1>

            <p className="text-sm font-medium text-slate-600 mb-8 max-w-md leading-relaxed">
              Anda sudah melakukan absensi sebelumnya pada jam {formatTime(attendanceResult.attended_at || null)}.
            </p>

            <div className="w-full max-w-sm text-left bg-slate-50 p-5 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-8">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Nama</dt>
                  <dd className="font-bold text-slate-900">{attendanceResult.full_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Waktu Hadir</dt>
                  <dd className="font-bold text-yellow-600">{formatTime(attendanceResult.attended_at || null)}</dd>
                </div>
              </dl>
            </div>

            <button
              onClick={resetAndGoBack}
              className="py-3 px-6 bg-orange-600 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-sm hover:bg-orange-700 transition-all shadow-[4px_4px_0px_0px_rgba(234,88,12,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Kembali
            </button>
          </section>

          <footer className="bg-slate-900 text-slate-400 p-3 text-[10px] flex flex-col md:flex-row justify-between px-6 uppercase tracking-widest font-bold gap-2">
            <span>© 2026 MWX Indonesia</span>
            <span className="text-white">Business Growth Accelerator</span>
          </footer>
        </div>
      )}

      {/* Email Check - Found (Ready to Attend) */}
      {checkStatus === "found" && attendanceResult && (
        <div className="w-full max-w-lg bg-white neo-border neo-shadow-large flex flex-col overflow-hidden">
          <div className="h-2 bg-orange-600"></div>
          <section className="bg-slate-900 text-slate-400 p-3 text-[10px] flex flex-col md:flex-row justify-between px-6 uppercase tracking-widest font-bold gap-2">
            <span>MWX Indonesia</span>
            <span className="text-white">Business Growth Accelerator</span>
          </section>

          <section className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-6xl mb-4">👤</div>

            <h2 className="text-xl font-black uppercase tracking-tight mb-2 text-slate-900">
              Hai, {attendanceResult.full_name}!
            </h2>

            <p className="text-sm text-slate-600 mb-6">
              Silakan klik tombol di bawah untuk melakukan absensi kehadiran.
            </p>

            <button
              onClick={handleCheckIn}
              disabled={submitting}
              className="w-full max-w-sm py-4 px-6 bg-green-600 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-lg hover:bg-green-700 transition-all shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
            >
              {submitting ? "Memproses..." : "✓ HADIR"}
            </button>
          </section>

          <footer className="bg-slate-900 text-slate-400 p-3 text-[10px] flex flex-col md:flex-row justify-between px-6 uppercase tracking-widest font-bold gap-2">
            <span>© 2026 MWX Indonesia</span>
            <span className="text-white">Business Growth Accelerator</span>
          </footer>
        </div>
      )}

      {/* Email Dialog - Not Found */}
      {(checkStatus === "not_found" || checkStatus === "idle" || checkStatus === "checking") && (
        <div className="w-full max-w-lg bg-white neo-border neo-shadow-large flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-2 bg-orange-600"></div>
          <section className="bg-slate-900 text-slate-400 p-3 text-[10px] flex flex-col md:flex-row justify-between px-6 uppercase tracking-widest font-bold gap-2">
            <span>MWX Indonesia</span>
            <span className="text-white">Business Growth Accelerator</span>
          </section>

          {/* Content */}
          <section className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-6xl mb-6">📋</div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-3">
              Absensi Event
            </h1>
            {event && (
              <p className="text-lg font-bold text-orange-600 mb-6">{event.name}</p>
            )}
            <p className="text-sm text-slate-600 mb-8 max-w-md">
              Masukkan email yang Anda gunakan saat mendaftar untuk melakukan absensi.
            </p>

            {/* Email Input */}
            <div className="w-full max-w-sm space-y-4">
              <div>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (checkStatus !== "idle") setCheckStatus("idle");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && checkEmail()}
                  placeholder="email@anda.com"
                  className="neo-input w-full p-4 border-2 border-slate-900 focus:bg-orange-50 outline-none transition-colors text-base font-bold bg-white"
                />
              </div>

              {/* Not Found Message */}
              {checkStatus === "not_found" && attendanceResult && (
                <div className="p-4 bg-red-50 border-2 border-red-400 text-sm">
                  <p className="font-bold text-red-700 mb-2">
                    Email tidak ditemukan!
                  </p>
                  <p className="text-red-600 text-xs mb-3">
                    {attendanceResult.message}
                  </p>
                  <Link
                      href={`/events/${eventId}/register`}
                      className="inline-block py-2 px-4 bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors"
                    >
                      Daftar Sekarang
                    </Link>
                </div>
              )}

              <button
                onClick={checkEmail}
                disabled={!emailInput || !emailInput.includes("@") || checkStatus === "checking"}
                className="w-full py-4 px-6 bg-slate-900 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-base hover:bg-orange-600 hover:border-orange-600 transition-all shadow-[4px_4px_0px_0px_rgba(234,88,12,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkStatus === "checking" ? "Memproses..." : "Cek Email"}
              </button>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-slate-900 text-slate-400 p-3 text-[10px] flex flex-col md:flex-row justify-between px-6 uppercase tracking-widest font-bold gap-2">
            <span>© 2026 MWX Indonesia</span>
            <span className="text-white">Business Growth Accelerator</span>
          </footer>
        </div>
      )}
    </main>
  );
}