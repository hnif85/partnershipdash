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
};

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
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
      const [eventRes, regRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/registrations`),
      ]);

      const eventData = await eventRes.json();
      const regData = await regRes.json();

      if (!eventRes.ok) {
        throw new Error(eventData.error || 'Gagal mengambil data event');
      }

      setEvent(eventData.event);
      setRegistrations(regData.registrations || []);
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
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      registered: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      attended: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus event ini?')) return;

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Gagal menghapus event');
      }

      router.push('/events');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan');
    }
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/events"
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                ← Kembali
              </Link>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/events/${eventId}/edit`}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
              >
                Edit Event
              </Link>
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
            <h1 className="text-3xl font-bold text-[#0f172a]">
              {event.name}
            </h1>
          </div>
        </header>

        {/* Event Details */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#0f172a] mb-4">Detail Event</h2>
              <dl className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm text-zinc-500">Tanggal</dt>
                  <dd className="col-span-2 text-sm font-medium text-[#0f172a]">
                    {formatDate(event.event_date)}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm text-zinc-500">Partner</dt>
                  <dd className="col-span-2 text-sm font-medium text-[#0f172a]">
                    {event.partner || '-'}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm text-zinc-500">Lokasi</dt>
                  <dd className="col-span-2 text-sm font-medium text-[#0f172a]">
                    {event.location || '-'}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm text-zinc-500">Tipe</dt>
                  <dd className="col-span-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      event.event_type === 'online' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {event.event_type === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm text-zinc-500">Status</dt>
                  <dd className="col-span-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      event.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {event.is_active ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm text-zinc-500">Maksimal Peserta</dt>
                  <dd className="col-span-2 text-sm font-medium text-[#0f172a]">
                    {event.max_participants || 'Tidak terbatas'}
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
                <h2 className="text-lg font-semibold text-[#0f172a] mb-4">Deskripsi</h2>
                <p className="text-sm text-zinc-600 whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Total Pendaftaran</p>
              <p className="mt-2 text-3xl font-bold text-[#0f172a]">
                {registrations.length}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {event.max_participants 
                  ? ` dari ${event.max_participants} slots` 
                  : 'peserta'}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Sudah Dikonfirmasi</p>
              <p className="mt-2 text-3xl font-bold text-[#0f5132]">
                {registrations.filter(r => r.status === 'confirmed').length}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Menunggu</p>
              <p className="mt-2 text-3xl font-bold text-[#1f3c88]">
                {registrations.filter(r => r.status === 'registered').length}
              </p>
            </div>
          </div>
        </div>

        {/* Registrations List */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
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
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Tanggal Daftar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {registrations.map((reg, index) => (
                    <tr key={reg.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 text-zinc-600">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-[#0f172a]">{reg.full_name}</td>
                      <td className="px-4 py-3 text-zinc-600">{reg.phone_number}</td>
                      <td className="px-4 py-3 text-zinc-600">{reg.email}</td>
                      <td className="px-4 py-3 text-zinc-600">{reg.business_name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(reg.status)}`}>
                          {reg.status === 'registered' ? 'Terdaftar' : 
                           reg.status === 'confirmed' ? 'Dikonfirmasi' :
                           reg.status === 'attended' ? 'Hadir' : 'Dibatalkan'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {formatDate(reg.registered_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
