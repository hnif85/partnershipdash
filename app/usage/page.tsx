"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import * as XLSX from "xlsx";

type UserUsage = {
  user_id: string;
  full_name: string;
  email: string;
  partner_name: string | null;
  product_name: string;
  debit_count: number;
  total_usage: number;
  event_usage: number;
  non_event_usage: number;
  last_usage_at: string;
  is_user_benar: boolean;
};

type UsageData = {
  users: UserUsage[];
  summary: { total_users: number; total_debits: number; total_usage: number };
  products: string[];
  partners: string[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const formatNumber = (n: number | undefined) =>
  typeof n === "number" ? n.toLocaleString("id-ID") : "-";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
};

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = () => new Date().toISOString().split("T")[0];
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split("T")[0];
  };

  const [startDate, setStartDate] = useState(() => daysAgo(30));
  const [endDate, setEndDate] = useState(today);
  const [userBenarOnly, setUserBenarOnly] = useState(false);
  const [productFilter, setProductFilter] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Committed filter values — only update on "Cari" click
  const [committed, setCommitted] = useState({ startDate: "", endDate: "", productFilter: "", partnerFilter: "", search: "", userBenarOnly: false });

  const [sortBy, setSortBy] = useState("last_usage_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const applyFilters = () => {
    setCommitted({ startDate, endDate, productFilter, partnerFilter, search: searchInput, userBenarOnly });
    setPage(1);
  };

  useEffect(() => {
    fetchData();
  }, [committed, sortBy, sortOrder, page]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        start_date: committed.startDate,
        end_date: committed.endDate,
        page: page.toString(),
        limit: pageSize.toString(),
      });
      params.set("sort_by", sortBy);
      params.set("sort_order", sortOrder);
      if (committed.productFilter) params.set("product", committed.productFilter);
      if (committed.partnerFilter) params.set("partner", committed.partnerFilter);
      if (committed.search.trim()) params.set("search", committed.search.trim());
      if (committed.userBenarOnly) params.set("user_benar", "true");

      const token = localStorage.getItem("crm_token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/usage?${params}`, { cache: "no-store", headers });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <span className="ml-1 text-zinc-300">&#8597;</span>;
    return <span className="ml-1 text-[#1f3c88]">{sortOrder === "asc" ? "\u2191" : "\u2193"}</span>;
  };

  const exportExcel = useCallback(async () => {
    if (!data) return;
    const params = new URLSearchParams({
      start_date: committed.startDate, end_date: committed.endDate,
      page: "1", limit: "999999",
      sort_by: sortBy, sort_order: sortOrder,
    });
    if (committed.productFilter) params.set("product", committed.productFilter);
    if (committed.partnerFilter) params.set("partner", committed.partnerFilter);
    if (committed.search.trim()) params.set("search", committed.search.trim());
    if (committed.userBenarOnly) params.set("user_benar", "true");

    const token = localStorage.getItem("crm_token");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`/api/usage?${params}`, { cache: "no-store", headers });
    const json = await res.json();

    const rows = json.users.map((u: UserUsage) => ({
      Email: u.email,
      Partner: u.partner_name || "-",
      Produk: u.product_name,
      "Usage Event": u.event_usage,
      "Usage Non-Event": u.non_event_usage,
      Total: u.total_usage,
      Transaksi: u.debit_count,
      "Terakhir Usage": u.last_usage_at ? new Date(u.last_usage_at).toLocaleDateString("id-ID") : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usage");
    const range = `A1:H${rows.length + 1}`;
    const colWidths = [35, 20, 20, 15, 15, 15, 10, 15];
    ws["!cols"] = colWidths.map((w) => ({ wch: w }));
    XLSX.writeFile(wb, `usage_${committed.startDate}_${committed.endDate}.xlsx`);
  }, [data, committed, sortBy, sortOrder]);

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-[#0f172a]">Usage</h1>
            <p className="text-sm text-zinc-600">
              Pemantauan pemakaian kredit user berdasarkan transaksi debit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-zinc-400">
              <input
                type="checkbox"
                checked={userBenarOnly}
                onChange={(e) => setUserBenarOnly(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-[#1f3c88] focus:ring-[#1f3c88]"
              />
              <span className="font-medium text-zinc-700">User Benar Only</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
            />
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
            >
              <option value="">Semua Produk</option>
              {data?.products.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
            >
              <option value="">Semua Partner</option>
              {data?.partners.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
              placeholder="Cari nama/email..."
              className="w-full min-w-[160px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88] md:w-auto"
            />
            <button
              onClick={applyFilters}
              className="rounded-lg border border-[#1f3c88] bg-[#1f3c88] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#16306b]"
            >
              Cari
            </button>
            <button
              onClick={() => {
                const d = daysAgo(30);
                const t = today();
                setStartDate(d);
                setEndDate(t);
                setProductFilter("");
                setPartnerFilter("");
                setSearchInput("");
                setUserBenarOnly(false);
                setCommitted({ startDate: d, endDate: t, productFilter: "", partnerFilter: "", search: "", userBenarOnly: false });
                setPage(1);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-400"
            >
              Reset
            </button>
            <button
              onClick={exportExcel}
              disabled={!data}
              className="rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export Excel
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">User dengan Usage</p>
            <p className="mt-2 text-2xl font-semibold text-[#0f172a]">
              {formatNumber(data?.summary.total_users)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Total Transaksi Debit</p>
            <p className="mt-2 text-2xl font-semibold text-[#0f172a]">
              {formatNumber(data?.summary.total_debits)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Total Kredit Terpakai</p>
            <p className="mt-2 text-2xl font-semibold text-[#0f172a]">
              {formatNumber(data?.summary.total_usage)}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-500">Detail User Usage</p>
              <h2 className="text-lg font-semibold text-[#0f172a]">
                User dengan Pemakaian Kredit
                {data && <span className="ml-2 text-sm font-normal text-zinc-500">({data.pagination.total} user)</span>}
              </h2>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-[#f9fafb]">
                <tr>
                  <th onClick={() => handleSort("email")} className="cursor-pointer px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 select-none hover:text-[#1f3c88]">Email<SortIcon col="email" /></th>
                  <th onClick={() => handleSort("partner_name")} className="cursor-pointer px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 select-none hover:text-[#1f3c88]">Partner<SortIcon col="partner_name" /></th>
                  <th onClick={() => handleSort("product_name")} className="cursor-pointer px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 select-none hover:text-[#1f3c88]">Produk<SortIcon col="product_name" /></th>
                  <th onClick={() => handleSort("event_usage")} className="cursor-pointer px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600 select-none hover:text-[#1f3c88]">Usage Event<SortIcon col="event_usage" /></th>
                  <th onClick={() => handleSort("non_event_usage")} className="cursor-pointer px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600 select-none hover:text-[#1f3c88]">Usage Non-Event<SortIcon col="non_event_usage" /></th>
                  <th onClick={() => handleSort("total_usage")} className="cursor-pointer px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600 select-none hover:text-[#1f3c88]">Total<SortIcon col="total_usage" /></th>
                  <th onClick={() => handleSort("debit_count")} className="cursor-pointer px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600 select-none hover:text-[#1f3c88]">Transaksi<SortIcon col="debit_count" /></th>
                  <th onClick={() => handleSort("last_usage_at")} className="cursor-pointer px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600 select-none hover:text-[#1f3c88]">Terakhir<SortIcon col="last_usage_at" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-zinc-500">
                      Memuat data usage...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-red-600">
                      Gagal memuat: {error}
                    </td>
                  </tr>
                ) : (data?.users ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-zinc-500">
                      Tidak ada data usage untuk periode ini.
                    </td>
                  </tr>
                ) : (
                  data?.users.map((u, i) => (
                    <tr key={`${u.user_id}-${u.product_name}-${i}`} className="hover:bg-[#f7f8fb]">
                      <td className="px-3 py-3 text-sm text-zinc-600">
                        <div className="flex items-center gap-2">
                          <span>{u.email || "-"}</span>
                          {u.is_user_benar && (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              User Benar
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-zinc-600">{u.partner_name || "-"}</td>
                      <td className="px-3 py-3 text-sm text-zinc-700 whitespace-nowrap">{u.product_name}</td>
                      <td className="px-3 py-3 text-right text-sm text-emerald-600 font-semibold">
                        {u.event_usage > 0 ? formatNumber(u.event_usage) : "-"}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-zinc-700">
                        {formatNumber(u.non_event_usage)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-zinc-700">
                        {formatNumber(u.total_usage)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-zinc-600">
                        {formatNumber(u.debit_count)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-zinc-600 whitespace-nowrap">
                        {formatDate(u.last_usage_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {data && data.pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-zinc-500">
              Menampilkan {(page - 1) * pageSize + 1} -{" "}
              {Math.min(page * pageSize, data.pagination.total)} dari {data.pagination.total} user
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  page === 1
                    ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                    : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400"
                }`}
              >
                Prev
              </button>
              <div className="text-sm font-semibold text-zinc-700">
                {page} / {data.pagination.totalPages}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  page === data.pagination.totalPages
                    ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                    : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
