"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

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
  referral_name?: string;
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
  unique_customer_count?: number;
  page?: number;
  limit?: number;
  total_pages?: number;
  error?: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
};

const formatCurrency = (value: number, currency: string = "USD") => {
  // Validate currency code - only allow valid ISO currency codes
  const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'IDR', 'SGD', 'MYR', 'THB', 'VND', 'PHP', 'KRW', 'CNY', 'HKD', 'TWD'];

  // If currency is not valid or contains invalid characters, use USD as fallback
  if (!currency || !validCurrencies.includes(currency.toUpperCase()) || !/^[A-Z]{3}$/.test(currency.toUpperCase())) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  }

  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    // Fallback to USD if currency formatting fails
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  }
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("");
  const [referralFilter, setReferralFilter] = useState<string>("");
  const [referrals, setReferrals] = useState<string[]>([]);
  const [paymentChannels, setPaymentChannels] = useState<Array<{name: string, code: string}>>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [uniqueCustomerCount, setUniqueCustomerCount] = useState(0);
  const [globalStats, setGlobalStats] = useState({
    total_transactions: 0,
    finished_transactions: 0,
    failed_transactions: 0,
    total_revenue: 0
  });
  const pageSize = 50;
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncResults, setSyncResults] = useState<{
    total_processed: number;
    success_count: number;
    error_count: number;
    errors?: Array<{ guid: string; error?: string }>;
  } | null>(null);
  const [updateStartDate, setUpdateStartDate] = useState<string>("2026-02-03");
  const [updateEndDate, setUpdateEndDate] = useState<string>("2026-02-05"); 
  const [showUpdatePanel, setShowUpdatePanel] = useState(false);
  const [lastTransactionDate, setLastTransactionDate] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
  }, [page, statusFilter, startDate, endDate, customerFilter, paymentFilter, referralFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, startDate, endDate, customerFilter, paymentFilter, referralFilter]);

  useEffect(() => {
    loadPaymentChannels();
    loadDefaultUpdateDates();
    loadReferrals();
  }, []);

  useEffect(() => {
    loadGlobalStats();
  }, [search, statusFilter, startDate, endDate, customerFilter, paymentFilter, referralFilter]);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const limit = pageSize.toString();

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit,
        search: search.trim(),
        status: statusFilter !== "all" ? statusFilter : "",
        start_date: startDate,
        end_date: endDate,
        customer_guid: customerFilter,
        payment_channel: paymentFilter,
        referral: referralFilter,
      });

      const res = await fetch(`/api/transactions?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = (await res.json()) as ApiResponse;
      if (!data.transactions) throw new Error(data.error || "Payload kosong");
      setTransactions(data.transactions);
      setTotalCount(data.total_count || 0);
      setUniqueCustomerCount(data.unique_customer_count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const loadReferrals = async () => {
    try {
      const res = await fetch('/api/referral', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error(`Failed to load referrals: ${res.status}`);
      const data: any = await res.json();
      if (data.referrals) {
        const uniqueReferrals: string[] = [...new Set((data.referrals as any[])
          .map((r: { partner_name: string }) => r.partner_name)
          .filter((name: any): name is string => Boolean(name)))];
        setReferrals(uniqueReferrals);
      }
    } catch (error) {
      console.error('Error loading referrals:', error);
    }
  };

  const loadPaymentChannels = async () => {
    try {
      const res = await fetch('/api/transactions/payment-channels', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error(`Failed to load payment channels: ${res.status}`);
      const data = await res.json();
      if (data.payment_channels) {
        setPaymentChannels(data.payment_channels);
      }
    } catch (error) {
      console.error('Error loading payment channels:', error);
    }
  };

  const loadGlobalStats = async () => {
    try {
      const params = new URLSearchParams({
        search: search.trim(),
        status: statusFilter !== "all" ? statusFilter : "",
        start_date: startDate,
        end_date: endDate,
        customer_guid: customerFilter,
        payment_channel: paymentFilter,
        referral: referralFilter,
      });

      const res = await fetch(`/api/transactions/stats?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error(`Failed to load global stats: ${res.status}`);
      const data = await res.json();
      if (data.total_transactions !== undefined) {
        setGlobalStats(data);
      }
    } catch (error) {
      console.error('Error loading global stats:', error);
    }
  };

  const loadDefaultUpdateDates = async () => {
    try {
      const res = await fetch('/api/transactions?get_last_date=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        console.error('Failed to get last transaction date');
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        setUpdateEndDate(today.toISOString().split('T')[0]);
        setUpdateStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
        return;
      }

      const data = await res.json();
      const lastTransactionDate = data.last_transaction_date;

      const today = new Date();
      setUpdateEndDate(today.toISOString().split('T')[0]);
      setLastTransactionDate(lastTransactionDate || null);

      if (lastTransactionDate) {
        const lastDate = new Date(lastTransactionDate);
        lastDate.setDate(lastDate.getDate() - 1);
        setUpdateStartDate(lastDate.toISOString().split('T')[0]);
      } else {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        setUpdateStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
      }

    } catch (error) {
      console.error('Error loading default update dates:', error);
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      setUpdateEndDate(today.toISOString().split('T')[0]);
      setUpdateStartDate(sevenDaysAgo.toISOString().split('T')[0]);
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
      const matchesReferral = !referralFilter || t.referral_name?.toLowerCase() === referralFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesDateRange && matchesCustomer && matchesReferral;
    });

    filteredTransactions.sort((a, b) => {
      const dateA = new Date(a.created_at || '');
      const dateB = new Date(b.created_at || '');
      return dateB.getTime() - dateA.getTime();
    });

    return filteredTransactions;
  }, [transactions, search, statusFilter, startDate, endDate, customerFilter, referralFilter]);

  const paginated = useMemo(
    () => transactions,
    [transactions],
  );

  const stats = useMemo(() => {
    const total = totalCount;
    const totalRevenue = transactions
      .filter((t) => t.status?.toLowerCase() === 'finished' && t.valuta_code?.toUpperCase() === 'IDR')
      .reduce((sum, t) => sum + (t.grand_total || 0), 0);
    const finishedTransactions = transactions.filter((t) => t.status?.toLowerCase() === 'finished').length;
    const failedTransactions = transactions.filter((t) => t.status?.toLowerCase() === 'failed').length;

    return { total, totalRevenue, finishedTransactions, failedTransactions };
  }, [transactions, totalCount]);

  const handleSyncTransactions = async (syncAll: boolean = false) => {
    setSyncStatus("syncing");
    setSyncResults(null);

    try {
      const body: any = {};
      if (!syncAll) {
        body.startDate = updateStartDate;
        body.endDate = updateEndDate;
      }

      const res = await fetch("/api/sync-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.status !== "sync_completed") {
        throw new Error(data.error || "Sync failed");
      }

      setSyncResults({
        total_processed: data.total_processed || 0,
        success_count: data.success_count || 0,
        error_count: data.error_count || 0,
        errors: data.errors || data.results?.filter((r: any) => r.status === "error"),
      });
      setSyncStatus("success");

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setSyncStatus("error");
      console.error("Sync transactions error:", error);
    }
  };

  const handleExportToXLS = async () => {
    try {
      const limit = '99999';
      const params = new URLSearchParams({
        page: '1',
        limit,
        search: search.trim(),
        status: statusFilter !== "all" ? statusFilter : "",
        start_date: startDate,
        end_date: endDate,
        customer_guid: customerFilter,
        payment_channel: paymentFilter,
        referral: referralFilter,
      });

      const res = await fetch(`/api/transactions?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data: any = await res.json();
      if (!data.transactions) throw new Error(data.error || "Payload kosong");

      const allTransactions = data.transactions as Transaction[];

      const exportData = allTransactions.map((transaction) => ({
        Invoice: transaction.invoice_number || '',
        Customer: transaction.customer_full_name || transaction.customer_username || 'N/A',
        Referral: transaction.referral_name || 'N/A',
        Email: transaction.customer_email || '',
        Product: transaction.transaction_details && transaction.transaction_details.length > 0
          ? transaction.transaction_details.length === 1
            ? transaction.transaction_details[0].product_name
            : `${transaction.transaction_details[0].product_name} (+${transaction.transaction_details.length - 1} more items)`
          : '-',
        Payment: transaction.payment_channel_name || '',
        Amount: `${transaction.valuta_code || 'USD'} ${transaction.grand_total?.toLocaleString('id-ID', { minimumFractionDigits: 2 }) || '0.00'}`,
        Quantity: transaction.qty || 0,
        Status: transaction.status || 'Unknown',
        Date: formatDate(transaction.created_at),
        Transaction_GUID: transaction.guid,
        Customer_GUID: transaction.customer_guid,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      const colWidths = [
        { wch: 20 }, // Invoice
        { wch: 25 }, // Customer
        { wch: 20 }, // Referral
        { wch: 30 }, // Email
        { wch: 35 }, // Product
        { wch: 20 }, // Payment
        { wch: 15 }, // Amount
        { wch: 10 }, // Quantity
        { wch: 12 }, // Status
        { wch: 12 }, // Date
        { wch: 40 }, // Transaction_GUID
        { wch: 40 }, // Customer_GUID
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "MWX Transactions");

      const now = new Date();
      const filename = `mwx_transactions_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.xlsx`;

      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-[#0f172a]">Transactions</h1>
            <p className="text-sm text-zinc-600">
              {lastTransactionDate
                ? `Last data update from DB: ${formatDate(lastTransactionDate)}`
                : "Last data update from DB: belum tersedia"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleSyncTransactions(true)}
              disabled={syncStatus === "syncing"}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                syncStatus === "syncing"
                  ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                  : "border-green-600 bg-green-600 text-white hover:bg-green-700 hover:border-green-700"
              }`}
              type="button"
            >
              {syncStatus === "syncing" ? "Sedang Sinkron..." : "Sinkron Semua"}
            </button>
            <button
              onClick={handleExportToXLS}
              disabled={totalCount === 0}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                totalCount === 0
                  ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                  : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700"
              }`}
              type="button"
            >
              Export to XLS ({totalCount} records)
            </button>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari invoice, nama, email..."
              className="w-full min-w-[240px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88] md:w-auto"
            />
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Jumlah User</p>
            <p className="mt-2 text-2xl font-semibold text-[#0f172a]">
              {uniqueCustomerCount.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Jumlah Transaksi</p>
            <p className="mt-2 text-2xl font-semibold text-[#0f172a]">
              {totalCount.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-green-600">Finished</p>
            <p className="mt-2 text-2xl font-semibold text-green-700">
              {globalStats.finished_transactions.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-red-600">Failed</p>
            <p className="mt-2 text-2xl font-semibold text-red-700">
              {globalStats.failed_transactions.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Total Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-[#0f172a]">
              {formatCurrency(globalStats.total_revenue, "IDR")}
            </p>
          </div>
        </section>

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
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
            >
              <option value="">Payment: Semua</option>
              {paymentChannels.map((channel, index) => (
                <option key={`${channel.code}-${channel.name}-${index}`} value={channel.name}>
                  {channel.name}
                </option>
              ))}
            </select>
            <select
              value={referralFilter}
              onChange={(e) => setReferralFilter(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
            >
              <option value="">Referral: Semua</option>
              {referrals.map((referral, index) => (
                <option key={`${referral}-${index}`} value={referral}>
                  {referral}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
            />
            <button
              onClick={() => {
                setSearch("");

                setStatusFilter("all");
                setPaymentFilter("");

                setReferralFilter("");

                setStartDate("");

                setEndDate("");

                setCustomerFilter("");

                setPage(1);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-400"
              type="button"
            >
              Reset Filter
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white shadow-sm mb-8">
          <button
            type="button"
            onClick={() => setShowUpdatePanel((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#f7f8fb] transition"
          >
            <div>
              <p className="text-xs font-semibold uppercase text-[#1f3c88]">Sinkronisasi</p>
              <h3 className="text-lg font-semibold text-[#0f172a]">Update Data Transactions</h3>
              <p className="text-sm text-zinc-500">Rentang fokus: 03/02/2026 - 05/02/2026</p>
            </div>
            <span className="text-sm font-semibold text-[#1f3c88]">{showUpdatePanel ? "Sembunyikan" : "Tampilkan"}</span>
          </button>

          {showUpdatePanel && (
            <div className="border-t border-zinc-200 px-4 py-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={updateStartDate}
                  onChange={(e) => setUpdateStartDate(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                />
                <span className="text-sm text-zinc-500">s/d</span>
                <input
                  type="date"
                  value={updateEndDate}
                  onChange={(e) => setUpdateEndDate(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                />
              </div>
              <button
                onClick={() => handleSyncTransactions(true)}
                disabled={syncStatus === "syncing"}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  syncStatus === "syncing"
                    ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                    : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700"
                }`}
                type="button"
              >
                Sinkron Semua
              </button>

              {syncStatus !== "idle" && (
                <div className={`p-3 rounded-lg text-sm ${
                  syncStatus === "success" ? "bg-green-50 text-green-700 border border-green-200" :
                  syncStatus === "error" ? "bg-red-50 text-red-700 border border-red-200" :
                  "bg-blue-50 text-blue-700 border border-blue-200"
                }`}>
                  {syncStatus === "syncing" && "Sedang menyinkronkan data..."}
                  {syncStatus === "success" && syncResults && (
                    <div className="space-y-2">
                      <div>
                        Sinkron selesai: {syncResults.success_count} berhasil, {syncResults.error_count} gagal dari {syncResults.total_processed} data.
                      </div>
                      {syncResults.error_count > 0 && (
                        <div className="text-xs text-red-700">
                          Detail error (maks 10):
                          <ul className="list-disc list-inside space-y-0.5 mt-1">
                            {(syncResults.errors || []).slice(0, 10).map((err, idx) => (
                              <li key={`${err.guid}-${idx}`}>
                                <span className="font-semibold">{err.guid || "no-guid"}</span>: {err.error || "Unknown error"}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {syncStatus === "error" && "Sinkron gagal. Silakan coba lagi."}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-500">Daftar Transaksi</p>
              <h2 className="text-lg font-semibold text-[#0f172a]">MWX Transactions</h2>
            </div>
            <div className="text-sm text-zinc-500">
              <span className="ml-3 text-xs text-zinc-400">
                Page {page} / {Math.ceil(totalCount / pageSize)}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-6 text-sm text-zinc-600">Memuat data transaksi...</div>
          ) : error ? (
            <div className="px-5 py-6 text-sm text-red-600">Gagal memuat: {error}</div>
          ) : !paginated.length ? (
            <div className="px-5 py-6 text-sm text-zinc-600">Tidak ada data transaksi yang cocok.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full table-fixed divide-y divide-zinc-200">
                <colgroup>
                  <col className="w-[12%]" />
                  <col className="w-[18%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
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
                      Referral
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
                        <div className="font-semibold">{transaction.referral_name || "N/A"}</div>
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
            Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} dari {totalCount} transaksi
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
              {page} / {Math.ceil(totalCount / pageSize)}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
              disabled={page === Math.ceil(totalCount / pageSize)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                page === Math.ceil(totalCount / pageSize)
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
