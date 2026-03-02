"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Customer = {
  guid?: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  city?: string;
  country?: string;
  status?: string;
  is_active?: string;
  is_email_verified?: boolean;
  is_phone_number_verified?: boolean;
  referal_code?: string;
  created_at?: string;
  updated_at?: string;
  credit_added?: number;
  credit_used?: number;
  last_debit_at?: string | null;
  churn_status?: "pasif" | "idle" | "aktif" | string;
  applications?: string[] | null;
  app_credits?: Array<{
    product_name: string;
    credit_added: number;
    credit_used: number;
    credit_events?: Array<{ date: string; amount: number }> | null;
    debit_events?: Array<{ date: string; amount: number }> | null;
  }> | null;
  training_data?: Array<{
    nama?: string | null;
    jenis_usaha?: string | null;
    no_hp?: string[] | null;
  }> | null;
  subscribe_list?: unknown;
};

type ApiResponse = {
  customers?: Customer[];
  referralPartners?: ReferralPartner[];
  total_count?: number;
  page?: number;
  limit?: number;
  total_pages?: number;
  error?: string;
};

type ReferralPartner = {
  partner?: string;
  code?: string;
};

type DashboardData = {
  creditStats: {
    users_with_transactions: number;
    total_credits: number;
    total_debits: number;
    avg_credit: number;
    avg_debit: number;
    credits_today: number;
    debits_today: number;
    credits_amount_today: number;
  };
  customerStats: {
    total_customers: number;
    new_last_30_days: number;
    with_email: number;
    active_customers: number;
    users_with_subscriptions: number;
    expired_users: number;
  };
  churnStats?: {
    active_users: number;
    idle_users: number;
    passive_users: number;
  };
  dailyActivity: Array<{
    date: string;
    credit_transactions: number;
    debit_transactions: number;
    daily_credits: number;
    daily_debits: number;
  }>;
  referralPartners: Array<{
    referal_code: string;
    count: number;
  }>;
  timestamp: string;
};

type ReferralPartnersData = Array<{
  partner: string;
  code: string;
}>;


const formatNumber = (value?: number) =>
  typeof value === "number" ? value.toLocaleString("id-ID") : "-";


const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
};

const renderChurnBadge = (status?: string | null) => {
  const normalized = (status || "").toLowerCase();
  const variants: Record<string, { label: string; className: string }> = {
    aktif: {
      label: "Aktif (≤7 hari)",
      className: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    },
    idle: {
      label: "Idle (7-30 hari)",
      className: "bg-amber-100 text-amber-800 border border-amber-200",
    },
    pasif: {
      label: "Pasif (>30 hari)",
      className: "bg-red-100 text-red-800 border border-red-200",
    },
  };

  const variant = variants[normalized] || variants.pasif;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${variant.className}`}>
      {variant.label}
    </span>
  );
};

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("statusFilter") || "all";
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [referralPartners, setReferralPartners] = useState<ReferralPartnersData>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [appFilter, setAppFilter] = useState<string>("all");
  const [referralPartnerFilter, setReferralPartnerFilter] = useState<string>("all");
  const initialChurn = searchParams.get("churnFilter") || "all";
  const [churnFilter, setChurnFilter] = useState<string>(initialChurn);
  const [applications, setApplications] = useState<string[]>([]);


  // Sync usage state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);

  // Sync customers state
  const [syncCustomersLoading, setSyncCustomersLoading] = useState(false);
  const [syncCustomersMessage, setSyncCustomersMessage] = useState<string | null>(null);
  const [syncCustomersSuccess, setSyncCustomersSuccess] = useState<boolean | null>(null);

  // Sync all state
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [syncAllMessage, setSyncAllMessage] = useState<string | null>(null);
  const [syncAllSuccess, setSyncAllSuccess] = useState<boolean | null>(null);
  const [syncAllCustomerCount, setSyncAllCustomerCount] = useState<number>(0);
  const [syncAllTransactionCount, setSyncAllTransactionCount] = useState<number>(0);
  const [syncAllPurchaseCount, setSyncAllPurchaseCount] = useState<number>(0);
  const fetchIdRef = useRef(0);

  const [exportLoading, setExportLoading] = useState(false);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          setDashboardData(data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard:", error);
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Apply statusFilter from query string (e.g., ?statusFilter=expiring_soon)
  useEffect(() => {
    const param = searchParams.get("statusFilter");
    if (param && param !== statusFilter) {
      setStatusFilter(param);
      setPage(1);
    }
  }, [searchParams, statusFilter]);

  // Apply churnFilter from query string
  useEffect(() => {
    const param = searchParams.get("churnFilter");
    if (param && param !== churnFilter) {
      setChurnFilter(param);
      setPage(1);
    }
  }, [searchParams, churnFilter]);

  // Fetch applications list
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const res = await fetch("/api/applications");
        if (res.ok) {
          const data = await res.json();
          setApplications(data.applications || []);
        }
      } catch (error) {
        console.error("Failed to fetch applications:", error);
      }
    };

    fetchApplications();
  }, []);

  // Load customer data with search and filter
  useEffect(() => {
    const loadCustomers = async () => {
      const fetchId = ++fetchIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pageSize.toString(),
          search: search,
          statusFilter: statusFilter,
          appFilter: appFilter,
          referral_partner: referralPartnerFilter,
          churnFilter: churnFilter,
        });

        const apiUrl = `/api/cms-customers?${params}`;
        const res = await fetch(apiUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const data = (await res.json()) as ApiResponse;

        if (!data.customers) throw new Error(data.error || "Payload kosong");

        if (fetchId !== fetchIdRef.current) return;

        setCustomers(data.customers);
        setReferralPartners(
          (data.referralPartners || [])
            .filter(rp => rp.partner && rp.code)
            .map(rp => ({ partner: rp.partner!, code: rp.code! }))
        );
        setTotalCount(data.total_count || 0);
      } catch (err) {
        if (fetchId !== fetchIdRef.current) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    };

    loadCustomers();
  }, [page, search, statusFilter, appFilter, referralPartnerFilter, churnFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageSafe = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, appFilter, referralPartnerFilter, churnFilter]);

  // Sync search input with search state
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Sync usage function
  const syncUsage = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    setSyncSuccess(null);

    try {
      const res = await fetch('/api/sync-credit-manager-transactions', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        setSyncSuccess(true);
        setSyncMessage(`✅ Sync berhasil! ${data.success_count || 0} transaksi berhasil, ${data.error_count || 0} error. Total diproses: ${data.total_processed || 0}`);

        // Refresh dashboard data after sync
        const dashboardRes = await fetch("/api/dashboard");
        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json();
          setDashboardData(dashboardData);
        }
      } else {
        setSyncSuccess(false);
        setSyncMessage(`❌ Sync gagal: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setSyncSuccess(false);
      setSyncMessage(`❌ Error: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // Sync customers function
  const syncCustomers = async () => {
    setSyncCustomersLoading(true);
    setSyncCustomersMessage(null);
    setSyncCustomersSuccess(null);

    try {
      const res = await fetch('/api/sync-customers', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        setSyncCustomersSuccess(true);
        setSyncCustomersMessage(`✅ Sync berhasil! ${data.success_count || 0} customer berhasil, ${data.error_count || 0} error. Total diproses: ${data.total_processed || 0}`);

        // Refresh customer data after sync
        const customersRes = await fetch(`/api/cms-customers?page=${page}&limit=${pageSize}&search=${search}&statusFilter=${statusFilter}&appFilter=${appFilter}&referral_partner=${referralPartnerFilter}`, { cache: "no-store" });
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          setCustomers(customersData.customers || []);
          setTotalCount(customersData.total_count || 0);
        }

        // Refresh dashboard data after sync
        const dashboardRes = await fetch("/api/dashboard");
        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json();
          setDashboardData(dashboardData);
        }
      } else {
        setSyncCustomersSuccess(false);
        setSyncCustomersMessage(`❌ Sync gagal: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setSyncCustomersSuccess(false);
      setSyncCustomersMessage(`❌ Error: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setSyncCustomersLoading(false);
    }
  };

  // Sync all function
  const syncAll = async () => {
    setSyncAllLoading(true);
    setSyncAllMessage(null);
    setSyncAllSuccess(null);
    setSyncAllCustomerCount(0);
    setSyncAllTransactionCount(0);
    setSyncAllPurchaseCount(0);

    try {
      // Step 1: Sync customers
      setSyncAllMessage("🔄 Mengambil customer...");
      const customerRes = await fetch('/api/sync-customers', {
        method: 'POST',
      });

      if (!customerRes.ok) {
        throw new Error('Failed to sync customers');
      }

      const customerData = await customerRes.json();
      const customersAdded = customerData.success_count || 0;
      setSyncAllCustomerCount(customersAdded);

      setSyncAllMessage(`✅ Berhasil mengambil customer - ${customersAdded} customer baru`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause to show status

      // Step 2: Sync transactions (purchase)
      setSyncAllMessage("🔄 Mengambil transaksi...");
      const transactionRes = await fetch('/api/sync-transactions', {
        method: 'POST',
      });

      if (!transactionRes.ok) {
        throw new Error('Failed to sync transactions');
      }

      const transactionData = await transactionRes.json();
      const transactionsAdded = transactionData.success_count || 0;
      setSyncAllTransactionCount(transactionsAdded);

      setSyncAllMessage(`✅ Berhasil mengambil transaksi - ${transactionsAdded} transaksi baru`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause to show status

      // Step 3: Sync usage (credit manager transactions)
      setSyncAllMessage("🔄 Mengsinkronkan usage...");
      const usageRes = await fetch('/api/sync-credit-manager-transactions', {
        method: 'POST',
      });

      if (!usageRes.ok) {
        throw new Error('Failed to sync usage transactions');
      }

      const usageData = await usageRes.json();
      const usagesAdded = usageData.success_count || 0;
      setSyncAllPurchaseCount(usagesAdded);

      setSyncAllMessage(`✅ Berhasil mengsinkronkan usage - ${usagesAdded} penggunaan kredit baru`);
      setSyncAllSuccess(true);

      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause

      setSyncAllMessage(`🎉 Sync semua selesai! ${customersAdded} customer baru, ${transactionsAdded} transaksi baru, ${usagesAdded} penggunaan kredit baru`);

      // Refresh customer data and dashboard after sync
      const customersRes = await fetch(`/api/cms-customers?page=${page}&limit=${pageSize}&search=${search}&statusFilter=${statusFilter}&appFilter=${appFilter}&referral_partner=${referralPartnerFilter}`, { cache: "no-store" });
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData.customers || []);
        setTotalCount(customersData.total_count || 0);
      }

      const dashboardRes = await fetch("/api/dashboard");
      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();
        setDashboardData(dashboardData);
      }
    } catch (error) {
      setSyncAllSuccess(false);
      setSyncAllMessage(`❌ Error: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setSyncAllLoading(false);
    }
  };

  // Export Excel function
  const exportExcel = async () => {
    setExportLoading(true);

    try {
      const params = new URLSearchParams({
        search,
        statusFilter,
        appFilter,
        referral_partner: referralPartnerFilter,
        churnFilter,
      });

      const res = await fetch(`/api/cms-customers/export?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || `Export gagal (status ${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().split("T")[0];
      link.download = `customers_filtered_${timestamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Export gagal: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-[#0f172a]">Dashboard</h1>
              <p className="text-sm text-zinc-600">
                Ringkasan data customer dan aktivitas kredit
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={exportExcel}
                  disabled={exportLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {exportLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Mengekspor...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export Excel</span>
                    </>
                  )}
                </button>
                <button
                  onClick={syncCustomers}
                  disabled={syncCustomersLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-purple-600 bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncCustomersLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Get Customers</span>
                    </>
                  )}
                </button>
                <button
                  onClick={syncUsage}
                  disabled={syncLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-green-600 bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Sync Usage</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {syncMessage && (
                  <div className={`text-xs px-2 py-1 rounded ${
                    syncSuccess
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {syncMessage}
                  </div>
                )}
                {syncAllMessage && (
                  <div className={`text-xs px-2 py-1 rounded ${
                    syncAllSuccess
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {syncAllMessage}
                  </div>
                )}
                {syncCustomersMessage && (
                  <div className={`text-xs px-2 py-1 rounded ${
                    syncCustomersSuccess
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {syncCustomersMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Metrics */}
        {dashboardLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1f3c88] border-t-transparent"></div>
            <span className="ml-3 text-lg">Memuat dashboard...</span>
          </div>
        ) : (
          <>
                      

            {/* Customer Overview Cards - single card with total + active/idle/pasif */}
            <section className="grid gap-4">
              <div className="rounded-xl border border-zinc-200 bg-white px-5 py-5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-zinc-500">Jumlah Customer</p>
                    <p className="text-3xl font-bold text-[#0f172a]">
                      {formatNumber(dashboardData?.customerStats?.total_customers ?? totalCount)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Total customer terdaftar di sistem.
                    </p>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Last update: {formatDate(dashboardData?.timestamp)}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {(() => {
                    const total = dashboardData?.customerStats?.total_customers ?? 0;
                    const active =
                      dashboardData?.churnStats?.active_users ?? dashboardData?.customerStats?.active_customers ?? 0;
                    const idle = dashboardData?.churnStats?.idle_users ?? 0;
                    const passive =
                      dashboardData?.churnStats?.passive_users ?? dashboardData?.customerStats?.expired_users ?? 0;
                    const percent = (value: number) =>
                      total > 0 ? ((value / total) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 }) : "0";

                    const blocks = [
                      {
                        label: "Aktif (≤7 hari)",
                        value: active,
                        percent: percent(active),
                        color: "text-emerald-700",
                        border: "border-emerald-200 bg-emerald-50",
                      },
                      {
                        label: "Idle (7-30 hari)",
                        value: idle,
                        percent: percent(idle),
                        color: "text-amber-700",
                        border: "border-amber-200 bg-amber-50",
                      },
                      {
                        label: "Pasif (>30 hari)",
                        value: passive,
                        percent: percent(passive),
                        color: "text-red-700",
                        border: "border-red-200 bg-red-50",
                      },
                    ];

                    return blocks.map((item) => (
                      <div
                        key={item.label}
                        className={`rounded-lg border px-4 py-3 ${item.border}`}
                      >
                        <p className={`text-xs font-semibold uppercase ${item.color}`}>{item.label}</p>
                        <p className={`mt-2 text-2xl font-bold ${item.color}`}>
                          {item.percent}%
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">
                          {formatNumber(item.value)} dari {formatNumber(total)} customer
                        </p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </section>


            {/* Customer Table with Search */}
            <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">Customer List</p>
                  <h2 className="text-lg font-semibold text-[#0f172a]">Daftar Customer</h2>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Cari nama atau email..."
                    className="w-64 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                  />
                  <button
                    onClick={() => setSearch(searchInput)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#1f3c88] bg-[#1f3c88] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f3c88]/90"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Cari
                  </button>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                  >
                    <option value="all">Status: Semua</option>
                    <option value="with_apps">Dengan Aplikasi</option>
                    <option value="without_apps">Tanpa Aplikasi</option>
                    <option value="expired_apps">Aplikasi Expired</option>
                    <option value="expiring_soon">Akan Expired &lt; 7 hari</option>
                  </select>
                  <select
                    value={appFilter}
                    onChange={(e) => setAppFilter(e.target.value)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                  >
                    <option value="all">Aplikasi: Semua</option>
                    {applications.map((app) => (
                      <option key={app} value={app}>
                        {app}
                      </option>
                    ))}
                  </select>
                  <select
                    value={referralPartnerFilter}
                    onChange={(e) => setReferralPartnerFilter(e.target.value)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                  >
                    <option value="all">Partner: Semua</option>
                    {referralPartners.map((partner) => (
                      <option key={partner.code} value={partner.code}>
                        {partner.partner} ({partner.code})
                      </option>
                    ))}
                  </select>
                  <select
                    value={churnFilter}
                    onChange={(e) => setChurnFilter(e.target.value)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                  >
                    <option value="all">Churn: Semua</option>
                    <option value="aktif">Aktif (≤7 hari)</option>
                    <option value="idle">Idle (7-30 hari)</option>
                    <option value="pasif">Pasif (&gt;30 hari)</option>
                  </select>
                  <span className="text-sm text-zinc-500">
                    Total: {(totalCount || 0).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="px-5 py-12 text-center">
                  <div className="inline-flex items-center gap-3 text-zinc-600">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent"></div>
                    <span>Memuat data customer...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="px-5 py-12 text-center text-sm text-red-600">
                  Gagal memuat: {error}
                </div>
              ) : !customers.length ? (
                <div className="px-5 py-12 text-center text-sm text-zinc-600">
                  {search ? "Tidak ada customer yang cocok dengan pencarian." : "Belum ada data customer."}
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-[#f9fafb]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                          Nama / Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                          No. Telepon
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                          Kredit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                          Activity status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                          Partner
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                          Aplikasi
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                          Dibuat
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                          Detail
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {customers.map((customer: Customer) => {
                        const training = customer.training_data?.[0];
                        const displayName = (customer.full_name || "").trim() || training?.nama || "N/A";
                        const detailId = customer.guid || customer.email || "";
                        const phoneNumber = (customer.phone_number || training?.no_hp?.[0] || "").toString().trim();

                        // Parse subscription applications
                        const getSubscriptionApps = () => {
                          if (!customer.subscribe_list) return [];

                          try {
                            const subscriptions = Array.isArray(customer.subscribe_list)
                              ? customer.subscribe_list
                              : [customer.subscribe_list];

                            const apps: Array<{name: string, expired: boolean, expiredAt?: string, formattedExpiry?: string}> = [];

                            subscriptions.forEach((sub: any) => {
                              if (sub?.product_list && Array.isArray(sub.product_list)) {
                                sub.product_list.forEach((product: any) => {
                                  if (product?.product_name) {
                                    const expiredAt = product.expired_at;
                                    let expired = false;
                                    let formattedExpiry = '';

                                    if (expiredAt) {
                                      try {
                                        const expiredDate = new Date(expiredAt);
                                        expired = expiredDate < new Date();
                                        formattedExpiry = formatDate(expiredAt);
                                      } catch (e) {
                                        expired = false;
                                        formattedExpiry = expiredAt;
                                      }
                                    }

                                    apps.push({
                                      name: product.product_name,
                                      expired,
                                      expiredAt,
                                      formattedExpiry
                                    });
                                  }
                                });
                              }
                            });

                            return apps;
                          } catch (e) {
                            return [];
                          }
                        };

                        const subscriptionApps = getSubscriptionApps();

                        const partnerName = referralPartners.find(rp => rp.code === customer.referal_code)?.partner || "-";

                        return (
                          <tr key={customer.guid || customer.email} className="hover:bg-[#f7f8fb]">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-[#0f172a]">{displayName}</div>
                              <div className="text-xs text-zinc-500">{customer.email || "-"}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-700">
                              <div className="font-mono text-xs text-zinc-700">
                                {phoneNumber || "-"}
                              </div>
                              {customer.is_phone_number_verified && (
                                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                  Verified
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-700">
                              <div className="font-semibold">
                                +{(customer.credit_added ?? 0).toLocaleString("id-ID")}
                              </div>
                              <div className="text-xs text-zinc-500">
                                -{(customer.credit_used ?? 0).toLocaleString("id-ID")}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-700">
                              {renderChurnBadge(customer.churn_status)}
                              {customer.last_debit_at && (
                                <div className="mt-1 text-[11px] text-zinc-500">
                                  Terakhir debit: {formatDate(customer.last_debit_at)}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-700">
                              {partnerName}
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                {subscriptionApps.length > 0 ? (
                                  subscriptionApps.map((app, index) => (
                                    <div
                                      key={index}
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        app.expired
                                          ? 'bg-red-100 text-red-800 border border-red-200'
                                          : 'bg-green-100 text-green-800 border border-green-200'
                                      }`}
                                      title={`${app.name} - ${app.expired ? 'Expired' : 'Active'}${app.formattedExpiry ? ` (${app.formattedExpiry})` : ''}`}
                                    >
                                      <span>{app.name}</span>
                                      {app.formattedExpiry && (
                                        <span className={`ml-1 ${app.expired ? 'text-red-700' : 'text-green-700'}`}>
                                          ({app.formattedExpiry})
                                        </span>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-xs text-zinc-400">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-700">
                              {formatDate(customer.created_at)}
                            </td>
                            <td className="px-4 py-3">
                              {detailId ? (
                                <Link
                                  href={`/customers/${encodeURIComponent(detailId)}`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-[#1f3c88] bg-[#1f3c88] px-3 py-1 text-xs font-medium text-white transition hover:bg-[#1f3c88]/90"
                                >
                                  Lihat Detail
                                </Link>
                              ) : (
                                <span className="text-xs text-zinc-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {customers.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-5 py-4">
                  <div className="text-sm text-zinc-500">
                    Menampilkan {(pageSafe - 1) * pageSize + 1} -{" "}
                    {Math.min(pageSafe * pageSize, totalCount)} dari {totalCount} customer
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pageSafe === 1}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        pageSafe === 1
                          ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                          : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400"
                      }`}
                    >
                      Prev
                    </button>
                    <div className="text-sm font-semibold text-zinc-700">
                      {pageSafe} / {Math.max(1, Math.ceil(totalCount / pageSize))}
                    </div>
                    <button
                      onClick={() => setPage((p) => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                      disabled={pageSafe === Math.ceil(totalCount / pageSize)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        pageSafe === Math.ceil(totalCount / pageSize)
                          ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                          : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

      </div>
    </main>
  );
}
