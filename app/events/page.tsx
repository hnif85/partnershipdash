"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// Types
type Event = {
  id: string;
  name: string;
  event_date: string;
  partner: string;
  location: string;
  event_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Partner = {
  id: number;
  partner: string;
  tipe: string;
};

type ApiResponse = {
  events?: Event[];
  partners?: Partner[];
  total_count?: number;
  page?: number;
  limit?: number;
  total_pages?: number;
  error?: string;
};

export default function EventsPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ApiResponse>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [partnerFilter, setPartnerFilter] = useState(searchParams.get('partnerFilter') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('statusFilter') || 'all');

  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    fetchData();
  }, [search, partnerFilter, statusFilter, page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (partnerFilter !== 'all') params.set('partnerFilter', partnerFilter);
      if (statusFilter !== 'all') params.set('statusFilter', statusFilter);
      params.set('page', page.toString());

      const response = await fetch(`/api/events?${params.toString()}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger refetch with current search
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

  const getEventTypeBadge = (type: string) => {
    const colors = {
      online: 'bg-blue-100 text-blue-800',
      offline: 'bg-green-100 text-green-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
                Partnership Management
              </p>
              <h1 className="text-3xl font-bold text-[#0f172a]">
                Kelola Event
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-zinc-600">
                Buat, edit, dan kelola event partnership Anda.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/events/create"
                className="rounded-lg bg-[#1f3c88] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f3c88]/90"
              >
                + Buat Event
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Total Event</p>
              <p className="mt-2 text-3xl font-bold text-[#0f172a]">
                {data.total_count || 0}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Event Aktif</p>
              <p className="mt-2 text-3xl font-bold text-[#0f5132]">
                {data.events?.filter(e => e.is_active).length || 0}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Event Tidak Aktif</p>
              <p className="mt-2 text-3xl font-bold text-[#64748b]">
                {data.events?.filter(e => !e.is_active).length || 0}
              </p>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Cari event..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
            />
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200"
            >
              Cari
            </button>
          </form>

          <div className="flex gap-3">
            <select
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
            >
              <option value="all">Semua Partner</option>
              {data.partners?.map((partner) => (
                <option key={partner.id} value={partner.partner}>
                  {partner.partner}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1f3c88] border-t-transparent"></div>
            </div>
          ) : data.events?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-zinc-500">Belum ada event</p>
              <Link
                href="/events/create"
                className="mt-2 text-sm font-medium text-[#1f3c88] hover:underline"
              >
                Buat event pertama
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">No</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Nama Event</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Tanggal</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Partner</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Lokasi</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Tipe</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.events?.map((event, index) => (
                    <tr key={event.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 text-zinc-600">
                        {(page - 1) * 10 + index + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#0f172a]">
                        {event.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {formatDate(event.event_date)}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {event.partner || '-'}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {event.location || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getEventTypeBadge(event.event_type)}`}>
                          {event.event_type === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(event.is_active)}`}>
                          {event.is_active ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/events/${event.id}`}
                            className="text-xs font-medium text-[#1f3c88] hover:underline"
                          >
                            Lihat
                          </Link>
                          <Link
                            href={`/events/${event.id}/edit`}
                            className="text-xs font-medium text-zinc-600 hover:underline"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/events/${event.id}/register`}
                            className="text-xs font-medium text-green-600 hover:underline"
                          >
                            Daftar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data.total_pages && data.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3">
              <p className="text-sm text-zinc-600">
                Halaman {data.page} dari {data.total_pages}
              </p>
              <div className="flex gap-2">
                {data.page && data.page > 1 && (
                  <Link
                    href={`/events?${new URLSearchParams({
                      page: (data.page - 1).toString(),
                      search,
                      partnerFilter,
                      statusFilter,
                    }).toString()}`}
                    className="rounded-lg border border-zinc-200 px-3 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    Prev
                  </Link>
                )}
                {data.page && data.page < data.total_pages && (
                  <Link
                    href={`/events?${new URLSearchParams({
                      page: (data.page + 1).toString(),
                      search,
                      partnerFilter,
                      statusFilter,
                    }).toString()}`}
                    className="rounded-lg border border-zinc-200 px-3 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
