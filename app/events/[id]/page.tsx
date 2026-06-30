"use client";

import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

type Event = {
  id: string;
  name: string;
  event_date: string;
  start_date: string;
  end_date: string;
  partner: string;
  location: string;
  event_type: string;
  description: string;
  max_participants: number;
  registration_deadline: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Registration = {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  business_name: string;
  status: string;
  registered_at: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  priority_score?: number;
};

type QuestionAnswer = {
  question_id: string;
  question_text: string;
  section: string;
  answer_value: string;
};

type RegistrationAnswers = {
  registration_id: string;
  full_name: string;
  email: string;
  business_name: string;
  registered_at: string;
  status: string;
  answers: QuestionAnswer[];
};

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRegistration, setSelectedRegistration] = useState<RegistrationAnswers | null>(null);
  const [showAnswersModal, setShowAnswersModal] = useState(false);
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventRes, regRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/registrations`),
      ]);

      const eventData = await eventRes.json();
      const regData = await regRes.json();

      if (!eventRes.ok) {
        throw new Error(eventData.error || "Gagal mengambil data event");
      }

      setEvent(eventData.event);
      setRegistrations(regData.registrations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrationAnswers = async (registrationId: string) => {
    setLoadingAnswers(true);
    try {
      const response = await fetch(`/api/events/registrations/${registrationId}/answers`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengambil jawaban kuesioner");
      }

      const reg = registrations.find((r) => r.id === registrationId);
      setSelectedRegistration({
        registration_id: registrationId,
        full_name: reg?.full_name || "",
        email: reg?.email || "",
        business_name: reg?.business_name || "",
        registered_at: reg?.registered_at || "",
        status: reg?.status || "",
        answers: data.answers.map((a: any) => ({
          question_id: a.id,
          question_text: a.question_text,
          section: a.section,
          answer_value: a.answer_value || "-",
        })),
      });
      setShowAnswersModal(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoadingAnswers(false);
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      registered: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      attended: "bg-purple-100 text-purple-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const handleCancel = async () => {
    if (!confirm("Batalkan event ini? Peserta tetap bisa melihat, tapi event tidak akan muncul di halaman publik.")) return;
    try {
      const token = localStorage.getItem("crm_token");
      const response = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: false }),
      });
      if (!response.ok) throw new Error("Gagal membatalkan event");
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  const handleConfirmRegistration = async (registrationId: string) => {
    try {
      const token = localStorage.getItem("crm_token");
      const response = await fetch(`/api/events/${eventId}/registrations/${registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "confirmed" }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal mengkonfirmasi peserta");
      }
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  const handleCancelRegistration = async (registrationId: string) => {
    if (!confirm("Batalkan pendaftaran peserta ini?")) return;
    try {
      const token = localStorage.getItem("crm_token");
      const response = await fetch(`/api/events/${eventId}/registrations/${registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal membatalkan peserta");
      }
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus event ini?")) return;

    try {
      const token = localStorage.getItem("crm_token");
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal menghapus event");
      }

      router.push("/events");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  const handlePreviewCSV = async (file: File) => {
    console.log('[CSV IMPORT] File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
    setImporting(true);
    setPreviewData(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("action", "preview");

      console.log('[CSV IMPORT] Sending request...');
      const token = localStorage.getItem("crm_token");
      const response = await fetch(`/api/events/${eventId}/registrations/bulk`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      console.log('[CSV IMPORT] Response status:', response.status);
      const data = await response.json();
      console.log('[CSV IMPORT] Response data:', JSON.stringify(data).substring(0, 200));

      if (!response.ok) {
        throw new Error(data.error || `Gagal preview CSV (${response.status})`);
      }

      console.log('[CSV IMPORT] State will be updated - showPreview:', true, 'previewData:', data.valid_count, 'valid rows');

      // Force re-render by using a timeout
      setTimeout(() => {
        setPreviewData({ ...data, _debug: Date.now() });
        setShowPreview(true);
      }, 100);
    } catch (err) {
      console.error('[CSV IMPORT] Error:', err);
      alert(err instanceof Error ? err.message : "Gagal preview CSV");
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    const fileInput = document.getElementById("csv-upload") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) return;

    setImporting(true);
    setShowPreview(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("crm_token");
      const response = await fetch(`/api/events/${eventId}/registrations/bulk`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal import CSV");
      }

      setImportResults(data);
      setPreviewData(null);
      if (data.success_count > 0) {
        fetchData();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal import CSV");
    } finally {
      setImporting(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreviewData(null);
  };

  const downloadCSVTemplate = () => {
    const csv = "nama,email,no_telf,nama_usaha\nJohn Doe,john@example.com,08123456789,Toko Saya\nJane Smith,jane@example.com,081234567890,Usaha Mandiri";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `template_import_${eventId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  if (error || !event) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
        <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
          <div className="rounded-lg bg-red-50 p-4 text-red-600">
            {error || "Event tidak ditemukan"}
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/events"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              ← Kembali
            </Link>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={downloadCSVTemplate}
                className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-100"
              >
                📥 Download Template
              </button>
              <button
                onClick={() => {
                  console.log('[IMPORT] Button clicked, opening modal');
                  setShowImportModal(true);
                }}
                className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 shadow-sm transition hover:bg-green-100"
              >
                📥 Import CSV
              </button>
              <Link
                href={`/events/${eventId}/answers`}
                className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 shadow-sm transition hover:bg-orange-100"
              >
                Bandingkan Kuesioner
              </Link>
              <Link
                href={`/events/${eventId}/edit`}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
              >
                Edit Event
              </Link>
              {event.is_active && (
                <button
                  onClick={handleCancel}
                  className="rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-600 shadow-sm transition hover:bg-amber-50"
                >
                  Batalkan
                </button>
              )}
              <button
                onClick={handleDelete}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50"
              >
                Hapus
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
              Partnership Management
            </p>
            <h1 className="text-3xl font-bold text-[#0f172a]">{event.name}</h1>
          </div>
        </header>

        {/* Event Details */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[#0f172a]">Detail Event</h2>
              <dl className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm text-zinc-500">Tanggal Mulai</dt>
                  <dd className="col-span-2 text-sm font-medium text-[#0f172a]">
                    {formatDate(event.start_date || event.event_date)}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm text-zinc-500">Tanggal Selesai</dt>
                  <dd className="col-span-2 text-sm font-medium text-[#0f172a]">
                    {formatDate(event.end_date || event.event_date)}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm text-zinc-500">Partner</dt>
                  <dd className="col-span-2 text-sm font-medium text-[#0f172a]">
                    {event.partner || "-"}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm text-zinc-500">Lokasi</dt>
                  <dd className="col-span-2 text-sm font-medium text-[#0f172a]">
                    {event.location || "-"}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm text-zinc-500">Tipe</dt>
                  <dd className="col-span-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        event.event_type === "online"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {event.event_type === "online" ? "Online" : "Offline"}
                    </span>
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm text-zinc-500">Status</dt>
                  <dd className="col-span-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        event.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {event.is_active ? "Aktif" : "Tidak Aktif"}
                    </span>
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm text-zinc-500">Maksimal Peserta</dt>
                  <dd className="col-span-2 text-sm font-medium text-[#0f172a]">
                    {event.max_participants || "Tidak terbatas"}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm text-zinc-500">Batas Pendaftaran</dt>
                  <dd className="col-span-2 text-sm font-medium text-[#0f172a]">
                    {formatDate(event.registration_deadline)}
                  </dd>
                </div>
              </dl>
            </div>

            {event.description && (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-[#0f172a]">Deskripsi</h2>
                <p className="whitespace-pre-wrap text-sm text-zinc-600">{event.description}</p>
              </div>
            )}
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Total Pendaftaran</p>
              <p className="mt-2 text-3xl font-bold text-[#0f172a]">{registrations.length}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {event.max_participants ? ` dari ${event.max_participants} slots` : "peserta"}
              </p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase text-green-700">Hadir</p>
              <p className="mt-2 text-3xl font-bold text-green-700">
                {registrations.filter((r) => r.attended_at).length}
              </p>
              <p className="mt-1 text-xs text-green-600">
                peserta hadir
              </p>
              <Link
                href={`/events/${eventId}/attendance`}
                target="_blank"
                className="mt-3 inline-block rounded-lg border border-green-400 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
              >
                Buka Halaman Absensi →
              </Link>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Sudah Dikonfirmasi</p>
              <p className="mt-2 text-3xl font-bold text-[#0f5132]">
                {registrations.filter((r) => r.status === "confirmed").length}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Menunggu</p>
              <p className="mt-2 text-3xl font-bold text-[#1f3c88]">
                {registrations.filter((r) => r.status === "registered").length}
              </p>
            </div>
          </div>
        </div>

        {/* Registrations List */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-[#0f172a]">
              Daftar Peserta ({registrations.length})
            </h2>
          </div>

          {registrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-zinc-500">Belum ada peserta terdaftar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">No</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Nama Lengkap</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">No. HP</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Nama Usaha</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Priority</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Hadir</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Kuesioner</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Tanggal Daftar</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {registrations.map((reg, index) => (
                    <tr key={reg.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 text-zinc-600">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-[#0f172a]">{reg.full_name}</td>
                      <td className="px-4 py-3 text-zinc-600">{reg.phone_number}</td>
                      <td className="px-4 py-3 text-zinc-600">{reg.email}</td>
                      <td className="px-4 py-3 text-zinc-600">{reg.business_name || "-"}</td>
                      <td className="px-4 py-3">
                        {reg.priority ? (
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              reg.priority === "HIGH"
                                ? "bg-green-100 text-green-800"
                                : reg.priority === "MEDIUM"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {reg.priority} ({typeof reg.priority_score === 'number' ? reg.priority_score.toFixed(1) : reg.priority_score}%)
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {reg.attended_at ? (
                          <div>
                            <span className="rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800">
                              ✓ Hadir
                            </span>
                            <p className="text-xs text-green-600 mt-0.5">
                              {new Date(reg.attended_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(
                            reg.status
                          )}`}
                        >
                          {reg.status === "registered"
                            ? "Terdaftar"
                            : reg.status === "confirmed"
                            ? "Dikonfirmasi"
                            : reg.status === "attended"
                            ? "Hadir"
                            : "Dibatalkan"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => fetchRegistrationAnswers(reg.id)}
                          className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 transition hover:bg-orange-100"
                        >
                          Lihat Jawaban
                        </button>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{formatDate(reg.registered_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {reg.status !== "cancelled" ? (
                            <button
                              onClick={() => handleCancelRegistration(reg.id)}
                              className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                            >
                              Batal
                            </button>
                          ) : (
                            <button
                              onClick={() => handleConfirmRegistration(reg.id)}
                              className="rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition hover:bg-green-100"
                            >
                              Konfirmasi
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Jawaban Kuesioner */}
      {showAnswersModal && selectedRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border-2 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
            {/* Modal Header */}
            <div className="sticky top-0 border-b-2 border-slate-900 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
                    Jawaban Kuesioner
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedRegistration.full_name} ({selectedRegistration.email})
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAnswersModal(false);
                    setSelectedRegistration(null);
                  }}
                  className="flex h-10 w-10 items-center justify-center border-2 border-slate-900 bg-white font-black text-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {selectedRegistration.answers.length === 0 ? (
                <div className="rounded-lg border-2 border-orange-600 bg-orange-50 p-4 text-center">
                  <p className="font-bold text-orange-600">
                    Peserta belum mengisi kuesioner
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group answers by section */}
                  {["Kapasitas Bayar", "Motivasi Berkembang", "Kesiapan Digital"].map(
                    (section) => {
                      const sectionAnswers = selectedRegistration.answers.filter(
                        (a) => a.section === section
                      );
                      if (sectionAnswers.length === 0) return null;

                      return (
                        <div key={section} className="space-y-3">
                          <div className="flex items-center gap-2 border-b-2 border-orange-200 pb-1">
                            <span className="text-sm font-black uppercase tracking-widest text-orange-600">
                              {section === "Kapasitas Bayar"
                                ? "💰"
                                : section === "Motivasi Berkembang"
                                ? "📈"
                                : "📱"}
                            </span>
                            <span className="text-xs font-black uppercase tracking-widest text-orange-600">
                              {section}
                            </span>
                          </div>

                          {sectionAnswers.map((answer, idx) => (
                            <div
                              key={answer.question_id}
                              className="rounded-lg border-2 border-slate-200 bg-white p-4"
                            >
                              <p className="mb-2 text-sm font-bold text-slate-700">
                                {idx + 1}. {answer.question_text}
                              </p>
                              <p className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900">
                                {answer.answer_value}
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 border-t-2 border-slate-900 bg-slate-50 p-4">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowAnswersModal(false);
                    setSelectedRegistration(null);
                  }}
                  className="rounded-lg border-2 border-slate-900 bg-white px-6 py-2 font-black uppercase tracking-widest text-sm text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loadingAnswers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border-2 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
            {/* Modal Header */}
            <div className="sticky top-0 border-b-2 border-slate-900 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
                    📥 Import Peserta dari CSV
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Format: nama, email, no_telf (header row wajib)
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportResults(null);
                    setPreviewData(null);
                    setShowPreview(false);
                  }}
                  className="flex h-10 w-10 items-center justify-center border-2 border-slate-900 bg-white font-black text-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Step 1: Upload */}
              {!showPreview && !importResults && (
                <div className="space-y-4">
                  <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
                    <input
                      type="file"
                      accept=".csv"
                      id="csv-upload"
                      className="hidden"
                      onChange={(e) => {
                        console.log('[CSV IMPORT] onChange triggered, files:', e.target.files?.length);
                        const file = e.target.files?.[0];
                        if (file) {
                          console.log('[CSV IMPORT] File:', file.name, file.size);
                          handlePreviewCSV(file);
                        } else {
                          console.log('[CSV IMPORT] No file selected');
                        }
                      }}
                    />
                    <label
                      htmlFor="csv-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <span className="text-4xl mb-3">📄</span>
                      <span className="font-bold text-slate-700">
                        {importing ? "Memproses..." : "Klik untuk pilih file CSV"}
                      </span>
                      <span className="text-xs text-slate-500 mt-1">
                        atau drag & drop file di sini
                      </span>
                    </label>
                    {importing && (
                      <div className="mt-4 flex justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <h3 className="font-bold text-blue-800 text-sm mb-2">Format CSV yang benar:</h3>
                    <pre className="text-xs text-blue-700 overflow-x-auto">
{`nama,email,no_telf,nama_usaha
Budi Santoso,budi@email.com,081234567890,Toko Budi
Ani Wijaya,ani@email.com,081234567891,UMKM Ani`}
                    </pre>
                    <p className="text-xs text-blue-600 mt-2">
                      Kolom: nama*, email*, no_telf, nama_usaha (* = wajib)
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Mendukung separator koma (,) dan tab
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Preview */}
              {showPreview && previewData && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-amber-50 border border-amber-300 p-4">
                    <h3 className="font-bold text-amber-800 text-sm mb-2 flex items-center gap-2">
                      <span className="text-xl">📋</span> Preview Data
                    </h3>
                    <p className="text-xs text-amber-700">
                      Periksa data di bawah sebelum mengimport. Data yang tidak valid akan di-skip.
                    </p>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-slate-100 p-4 text-center">
                      <p className="text-2xl font-bold text-slate-700">{previewData.valid_count + previewData.invalid_count}</p>
                      <p className="text-xs text-slate-500">Total Baris</p>
                    </div>
                    <div className="rounded-lg bg-green-100 p-4 text-center">
                      <p className="text-2xl font-bold text-green-700">{previewData.valid_count}</p>
                      <p className="text-xs text-green-600">Valid</p>
                    </div>
                    <div className="rounded-lg bg-red-100 p-4 text-center">
                      <p className="text-2xl font-bold text-red-700">{previewData.invalid_count}</p>
                      <p className="text-xs text-red-600">Invalid</p>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="max-h-80 overflow-y-auto rounded-lg border border-zinc-200">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-zinc-600 w-10">#</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-600">Nama</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-600">Email</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {/* Valid Rows */}
                        {previewData.valid_rows?.map((r: any, idx: number) => (
                          <tr key={`valid-${idx}`} className="bg-green-50">
                            <td className="px-3 py-2 text-zinc-500">{r.row}</td>
                            <td className="px-3 py-2 font-medium text-zinc-900">{r.full_name}</td>
                            <td className="px-3 py-2 text-zinc-600">{r.email}</td>
                            <td className="px-3 py-2">
                              <span className="text-green-600 font-medium">✓ Valid</span>
                            </td>
                          </tr>
                        ))}
                        {/* Invalid Rows */}
                        {previewData.invalid_rows?.map((r: any, idx: number) => (
                          <tr key={`invalid-${idx}`} className="bg-red-50">
                            <td className="px-3 py-2 text-zinc-500">{r.row}</td>
                            <td className="px-3 py-2 font-medium text-zinc-900">{r.full_name || "-"}</td>
                            <td className="px-3 py-2 text-zinc-600">{r.email || "-"}</td>
                            <td className="px-3 py-2">
                              <span className="text-red-600">✗ {r.invalid_reason || "Invalid"}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleConfirmImport}
                      disabled={importing || previewData.valid_count === 0}
                      className="flex-1 rounded-lg border-2 border-green-600 bg-green-600 px-6 py-3 font-black uppercase tracking-widest text-sm text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition hover:bg-green-700 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importing ? "Mengimport..." : `Import ${previewData.valid_count} Data`}
                    </button>
                    <button
                      onClick={handleCancelPreview}
                      disabled={importing}
                      className="rounded-lg border-2 border-slate-900 bg-white px-6 py-3 font-black uppercase tracking-widest text-sm text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Results */}
              {importResults && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-slate-100 p-4 text-center">
                      <p className="text-2xl font-bold text-slate-700">{importResults.total_rows}</p>
                      <p className="text-xs text-slate-500">Total Baris</p>
                    </div>
                    <div className="rounded-lg bg-green-100 p-4 text-center">
                      <p className="text-2xl font-bold text-green-700">{importResults.success_count}</p>
                      <p className="text-xs text-green-600">Berhasil</p>
                    </div>
                    <div className="rounded-lg bg-red-100 p-4 text-center">
                      <p className="text-2xl font-bold text-red-700">{importResults.fail_count + (importResults.skip_count || 0)}</p>
                      <p className="text-xs text-red-600">Gagal/Skip</p>
                    </div>
                  </div>

                  {/* Results List */}
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-zinc-200">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-zinc-600">#</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-600">Nama</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-600">Email</th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {importResults.results?.map((r: any, idx: number) => (
                          <tr key={idx} className={r.success ? "" : "bg-red-50"}>
                            <td className="px-3 py-2 text-zinc-500">{r.row}</td>
                            <td className="px-3 py-2 font-medium text-zinc-900">{r.full_name}</td>
                            <td className="px-3 py-2 text-zinc-600">{r.email}</td>
                            <td className="px-3 py-2">
                              <span className={r.success ? "text-green-600" : "text-red-600"}>
                                {r.success ? "✓ " + r.message : "✗ " + r.message}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportResults(null);
                    }}
                    className="w-full rounded-lg border-2 border-slate-900 bg-white px-6 py-3 font-black uppercase tracking-widest text-sm text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
