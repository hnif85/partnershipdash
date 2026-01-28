"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Transaction = {
  guid: string;
  invoice_number: string;
  customer_guid: string;
  customer_full_name?: string;
  customer_username?: string;
  customer_email?: string;
  transaction_callback_id: string;
  status: string;
  payment_channel_id: string;
  payment_channel_code: string;
  payment_channel_name: string;
  payment_url: string;
  qty: number;
  valuta_code: string;
  sub_total: number;
  platform_fee: number;
  payment_service_fee: number;
  total_discount: number;
  grand_total: number;
  created_at: string;
  created_by_guid: string;
  created_by_name: string;
  transaction_details?: TransactionDetail[];
};

type TransactionDetail = {
  guid: string;
  transaction_guid: string;
  merchant_guid: string;
  merchant_store_name: string;
  product_name: string;
  product_price: number;
  purchase_type_id: string;
  purchase_type_name: string;
  purchase_type_value: string;
  qty: number;
  total_discount: number;
  grand_total: number;
};

type ApiResponse = {
  transactions?: Transaction[];
  total_count?: number;
  error?: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
};

const formatCurrency = (value: number, currency: string = "USD") => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(value);
};

export default function PurchasesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncResults, setSyncResults] = useState<{
    total_processed: number;
    success_count: number;
    error_count: number;
  } | null>(null);

  useEffect(() => {
    loadTransactions();
  }, [page, statusFilter, startDate, endDate, customerFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, startDate, endDate, customerFilter]);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        search: search.trim(),
        status: statusFilter !== "all" ? statusFilter : "",
        start_date: startDate,
        end_date: endDate,
        customer_guid: customerFilter,
      });

      const res = await fetch(`/api/transactions?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = (await res.json()) as ApiResponse;
      if (!data.transactions) throw new Error(data.error || "Payload kosong");
      setTransactions(data.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let filteredTransactions = transactions.filter((t) => {
      const matchesSearch =
        !term ||
        t.invoice_number?.toLowerCase().includes(term) ||
        t.customer_full_name?.toLowerCase().includes(term) ||
        t.customer_email?.toLowerCase().includes(term) ||
        t.customer_username?.toLowerCase().includes(term);

      const matchesStatus = statusFilter === "all" || t.status?.toLowerCase() === statusFilter.toLowerCase();

      const matchesDateRange = (() => {
        if (!startDate && !endDate) return true;
        const transactionDate = new Date(t.created_at);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start && end) {
          return transactionDate >= start && transactionDate <= end;
        } else if (start) {
          return transactionDate >= start;
        } else if (end) {
          return transactionDate <= end;
        }
        return true;
      })();

      const matchesCustomer = !customerFilter || t.customer_guid === customerFilter;

      return matchesSearch && matchesStatus && matchesDateRange && matchesCustomer;
    });

    // Sort by created_at (desc)
    filteredTransactions.sort((a, b) => {
      const dateA = new Date(a.created_at || '');
      const dateB = new Date(b.created_at || '');
      return dateB.getTime() - dateA.getTime();
    });

    return filteredTransactions;
  }, [transactions, search, statusFilter, startDate, endDate, customerFilter]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const stats = useMemo(() => {
    const total = filtered.length;
    const totalRevenue = filtered.reduce((sum, t) => sum + (t.grand_total || 0), 0);
    const finishedTransactions = filtered.filter((t) => t.status?.toLowerCase() === 'finished').length;
    const failedTransactions = filtered.filter((t) => t.status?.toLowerCase() === 'failed').length;

    return { total, totalRevenue, finishedTransactions, failedTransactions };
  }, [filtered]);

  const handleSyncPurchases = async () => {
    setSyncStatus("syncing");
    setSyncResults(null);
    try {
      // Ensure authentication first
      console.log("Ensuring MWX authentication...");
      const authRes = await fetch("/api/mwx-auth", { method: "POST" });
      if (!authRes.ok) {
        const authData = await authRes.json();
        throw new Error(`Authentication failed: ${authData.message}`);
      }
      console.log("MWX authentication successful");

      // Now sync transactions
      const res = await fetch("/api/sync-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          customerGuid: customerFilter || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.status === "sync_completed") {
        setSyncResults({
          total_processed: data.total_processed,
          success_count: data.success_count,
          error_count: data.error_count,
        });
        setSyncStatus("success");

        // Show success alert and reload transaction data after successful sync
        if (syncResults) {
          alert(`Sync completed successfully! ${syncResults.success_count} transactions saved.`);
        }
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error("Sync failed");
      }
    } catch (error) {
      setSyncStatus("error");
      console.error("Sync purchases error:", error);
      alert(`Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-[#0f172a]">Purchases</h1>
            <p className="text-sm text-zinc-600">
              Daftar pembelian dan transaksi dari MWX Marketplace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSyncPurchases}
              disabled={syncStatus === "syncing"}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                syncStatus === "syncing"
                  ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                  : "border-purple-600 bg-purple-600 text-white hover:bg-purple-700 hover:border-purple-700"
              }`}
            >
              {syncStatus === "syncing" ? "Sedang Mengambil..." : "Get Transactions"}
            </button>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari invoice, nama, email..."
              className="w-full min-w-[240px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88] md:w-auto"
            />
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Total Pembelian</p>
            <p className="mt-2 text-2xl font-semibold text-[#0f172a]">
              {stats.total.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Total Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-[#0f172a]">
              {formatCurrency(stats.totalRevenue)}
            </p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-green-600">Berhasil</p>
            <p className="mt-2 text-2xl font-semibold text-green-700">
              {stats.finishedTransactions.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-red-600">Gagal</p>
            <p className="mt-2 text-2xl font-semibold text-red-700">
              {stats.failedTransactions.toLocaleString("id-ID")}
            </p>
          </div>
        </section>

        {(syncStatus !== "idle" || syncResults) && (
          <section className="rounded-xl border border-purple-200 bg-purple-50 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase text-purple-600">Status Sinkronisasi Purchases</p>
                <h2 className="text-lg font-semibold text-purple-800">MWX Sync Transactions</h2>
              </div>
              <div className="flex items-center gap-2">
                {syncStatus === "syncing" && (
                  <div className="flex items-center gap-2 text-purple-600">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
                    <span className="text-sm font-medium">Sedang mengambil data dari MWX API...</span>
                  </div>
                )}
                {syncStatus === "success" && syncResults && (
                  <div className="text-sm text-green-600 font-medium">
                    ✓ Sinkronisasi selesai
                  </div>
                )}
                {syncStatus === "error" && (
                  <div className="text-sm text-red-600 font-medium">
                    ✗ Sinkronisasi gagal
                  </div>
                )}
              </div>
            </div>

            {syncResults && (
              <div className="grid gap-4 p-5 sm:grid-cols-3">
                <div className="rounded-lg border border-purple-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-purple-600">Total Diproses</p>
                  <p className="mt-1 text-xl font-semibold text-purple-800">
                    {syncResults.total_processed.toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-purple-600">Transactions dari MWX API</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-green-600">Berhasil Disimpan</p>
                  <p className="mt-1 text-xl font-semibold text-green-700">
                    {syncResults.success_count.toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-green-600">Insert/Update berhasil</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-red-600">Gagal Diproses</p>
                  <p className="mt-1 text-xl font-semibold text-red-700">
                    {syncResults.error_count.toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-red-600">Error dalam proses</p>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
            >
              <option value="all">Status: Semua</option>
              <option value="finished">Finished</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
              placeholder="End Date"
            />
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setStartDate("");
                setEndDate("");
                setCustomerFilter("");
                setPage(1);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-400"
            >
              Reset Filter
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-500">Daftar Pembelian</p>
              <h2 className="text-lg font-semibold text-[#0f172a]">MWX Purchases</h2>
            </div>
            <div className="text-sm text-zinc-500">
              
              <span className="ml-3 text-xs text-zinc-400">
                Page {page} / {Math.ceil(filtered.length / pageSize)}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-6 text-sm text-zinc-600">Memuat data pembelian...</div>
          ) : error ? (
            <div className="px-5 py-6 text-sm text-red-600">Gagal memuat: {error}</div>
          ) : !paginated.length ? (
            <div className="px-5 py-6 text-sm text-zinc-600">Tidak ada data pembelian yang cocok.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full table-fixed divide-y divide-zinc-200">
                <colgroup>
                  <col className="w-[15%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="bg-[#f9fafb]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Invoice
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {paginated.map((transaction) => (
                    <tr key={transaction.guid} className="hover:bg-[#f7f8fb]">
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <div className="font-semibold text-[#1f3c88]">{transaction.invoice_number}</div>
                        <div className="text-xs text-zinc-500">{transaction.guid.substring(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <div className="font-semibold">
                          {transaction.customer_full_name || transaction.customer_username || "N/A"}
                        </div>
                        <div className="text-xs text-zinc-500">{transaction.customer_email || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        {transaction.transaction_details && transaction.transaction_details.length > 0 ? (
                          <div>
                            <div className="font-semibold">{transaction.transaction_details[0].product_name}</div>
                            {transaction.transaction_details.length > 1 && (
                              <div className="text-xs text-zinc-500">
                                +{transaction.transaction_details.length - 1} more items
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <div className="font-semibold">{transaction.payment_channel_name}</div>
                        <div className="text-xs text-zinc-500">{transaction.payment_channel_code}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <div className="font-semibold">{formatCurrency(transaction.grand_total, transaction.valuta_code)}</div>
                        <div className="text-xs text-zinc-500">Qty: {transaction.qty}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.status?.toLowerCase() === 'finished'
                            ? 'bg-green-100 text-green-800'
                            : transaction.status?.toLowerCase() === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaction.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <div>{formatDate(transaction.created_at)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-zinc-500">
            Menampilkan {(page - 1) * pageSize + 1} -{" "}
            {Math.min(page * pageSize, filtered.length)} dari {filtered.length} pembelian
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
              {page} / {Math.ceil(filtered.length / pageSize)}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / pageSize), p + 1))}
              disabled={page === Math.ceil(filtered.length / pageSize)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                page === Math.ceil(filtered.length / pageSize)
                  ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                  : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}