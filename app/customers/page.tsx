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



const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
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
  const [applications, setApplications] = useState<string[]>([]);

  // Chart data
  const [chartData, setChartData] = useState<any>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // 30 days ago
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });

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

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // 30 days ago
    return date.toISOString().split('T')[0];
  });
  const [exportEndDate, setExportEndDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
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
  }, [page, search, statusFilter, appFilter, referralPartnerFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageSafe = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, appFilter, referralPartnerFilter]);

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
        startDate: exportStartDate,
        endDate: exportEndDate,
      });

      const res = await fetch(`/api/export-credit-transactions?${params}`);

      if (res.ok) {
        // Create download link
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `credit_transactions_${exportStartDate}_to_${exportEndDate}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setShowExportModal(false);
      } else {
        const error = await res.text();
        alert(`Export gagal: ${error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Network error'}`);
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
                  onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export Excel</span>
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
                  onClick={syncAll}
                  disabled={syncAllLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-orange-600 bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncAllLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Syncing All...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15M9 9V3m0 3h6" />
                      </svg>
                      <span>Sync All</span>
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
                      

            {/* Customer Overview Cards */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase text-zinc-500">Customers</p>
                <p className="mt-2 text-2xl font-bold text-[#0f172a]">{totalCount}</p>
                
                <p className="text-xs text-zinc-500 mt-1">
                  {(dashboardData?.creditStats?.users_with_transactions ?? 0).toLocaleString("id-ID")} Customer yang aktif (pernah transaksi atau punya subscription)
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {(dashboardData?.customerStats?.total_customers ?? 0).toLocaleString("id-ID")} Total customer terdaftar
                </p>
              </div>

            
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase text-red-600">Expired Users</p>
                <p className="mt-2 text-2xl font-bold text-red-800">
                  {dashboardData?.customerStats?.total_customers ?
                    Math.round(((dashboardData.customerStats.expired_users || 0) / dashboardData.customerStats.total_customers) * 100) : 0}%
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {(dashboardData?.customerStats?.expired_users ?? 0).toLocaleString("id-ID")} dari {(dashboardData?.customerStats?.total_customers ?? 0).toLocaleString("id-ID")} total users
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase text-emerald-600">Active User Ratio</p>
                <p className="mt-2 text-2xl font-bold text-emerald-800">
                  {dashboardData?.customerStats?.total_customers ?
                    Math.round(((dashboardData.customerStats.active_customers || 0) / dashboardData.customerStats.total_customers) * 100) : 0}%
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  {(dashboardData?.customerStats?.active_customers ?? 0).toLocaleString("id-ID")} dari {(dashboardData?.customerStats?.total_customers ?? 0).toLocaleString("id-ID")}
                </p>
              </div>

              
              
            </section>

            {/* Charts Section - Separate Credit and Debit */}
            <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">Transaction Charts</p>
                  <h2 className="text-lg font-semibold text-[#0f172a]">Frekuensi Penggunaan </h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-zinc-600">Start:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-zinc-600">End:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      setChartLoading(true);
                      try {
                        const params = new URLSearchParams({
                          startDate,
                          endDate,
                        });
                        const res = await fetch(`/api/dashboard/charts?${params}`);
                        if (res.ok) {
                          const data = await res.json();
                          setChartData(data);
                        }
                      } catch (error) {
                        console.error("Failed to fetch chart data:", error);
                      } finally {
                        setChartLoading(false);
                      }
                    }}
                    disabled={chartLoading}
                    className="rounded-lg border border-[#1f3c88] bg-[#1f3c88] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#1f3c88]/90 disabled:opacity-50"
                  >
                    {chartLoading ? "Loading..." : "Load Charts"}
                  </button>
                </div>
              </div>

              <div className="p-5">
                {chartLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1f3c88] border-t-transparent"></div>
                    <span className="ml-3">Memuat data chart...</span>
                  </div>
                ) : chartData && chartData.data.length > 0 ? (
                  <div className="space-y-6">
                    {/* Side by Side Charts */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Credit Chart */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-zinc-800 text-center">📈 Credit (Bertambah)</h3>
                        <div className="relative">
                          <div className="flex items-end gap-1 overflow-x-auto pb-4 min-h-[220px]">
                            {chartData.data.map((item: any, index: number) => {
                              const maxCredit = Math.max(...chartData.data.map((d: any) => d.credit_count));
                              const creditHeight = maxCredit > 0 ? (item.credit_count / maxCredit) * 180 : 0;

                              return (
                                <div key={`credit-${item.date}`} className="flex flex-col items-center gap-1 min-w-[35px] group">
                                  <div
                                    className="w-5 bg-blue-500 rounded-t transition-all duration-200 hover:bg-blue-600 cursor-pointer"
                                    style={{ height: `${creditHeight}px` }}
                                  >
                                    {/* Hover Tooltip */}
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                      {new Date(item.date).toLocaleDateString('id-ID')}
                                      <br />
                                      Credit: {item.credit_count}
                                      <br />
                                      Amount: {item.credit_amount?.toLocaleString() || 0}
                                    </div>
                                  </div>
                                  <div className="text-xs text-zinc-500 transform -rotate-45 origin-top-left whitespace-nowrap">
                                    {new Date(item.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-500 rounded"></div>
                            <span>Credit (Penambahan Kredit)</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">{chartData.totalCredits.toLocaleString()}</p>
                          <p className="text-xs text-zinc-500">Total Transaksi Credit</p>
                        </div>
                      </div>

                      {/* Debit Chart */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-zinc-800 text-center">📉 Debit (Berkurang)</h3>
                        <div className="relative">
                          <div className="flex items-end gap-1 overflow-x-auto pb-4 min-h-[220px]">
                            {chartData.data.map((item: any, index: number) => {
                              const maxDebit = Math.max(...chartData.data.map((d: any) => d.debit_count));
                              const debitHeight = maxDebit > 0 ? (item.debit_count / maxDebit) * 180 : 0;

                              return (
                                <div key={`debit-${item.date}`} className="flex flex-col items-center gap-1 min-w-[35px] group">
                                  <div
                                    className="w-5 bg-red-500 rounded-t transition-all duration-200 hover:bg-red-600 cursor-pointer"
                                    style={{ height: `${debitHeight}px` }}
                                  >
                                    {/* Hover Tooltip */}
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                      {new Date(item.date).toLocaleDateString('id-ID')}
                                      <br />
                                      Debit: {item.debit_count}
                                      <br />
                                      Amount: {item.debit_amount?.toLocaleString() || 0}
                                    </div>
                                  </div>
                                  <div className="text-xs text-zinc-500 transform -rotate-45 origin-top-left whitespace-nowrap">
                                    {new Date(item.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span>Debit (Penggunaan Kredit)</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-red-600">{chartData.totalDebits.toLocaleString()}</p>
                          <p className="text-xs text-zinc-500">Total Transaksi Debit</p>
                        </div>
                      </div>
                    </div>

                    {/* Overall Summary */}
                    <div className="pt-4 border-t border-zinc-200">
                      <div className="grid gap-4 sm:grid-cols-3 text-center">
                        <div>
                          <p className="text-lg font-bold text-blue-600">{chartData.totalCredits.toLocaleString()}</p>
                          <p className="text-xs text-zinc-500">Total Credit Transactions</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-red-600">{chartData.totalDebits.toLocaleString()}</p>
                          <p className="text-xs text-zinc-500">Total Debit Transactions</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-zinc-600">{chartData.totalDays}</p>
                          <p className="text-xs text-zinc-500">Days in Range</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : chartData && chartData.data.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    Tidak ada data transaksi dalam rentang tanggal yang dipilih
                  </div>
                ) : (
                  <div className="text-center py-12 text-zinc-500">
                    Klik "Load Charts" untuk menampilkan frekuensi credit & debit terpisah
                  </div>
                )}
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
                          Kredit
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
                              <div className="font-semibold">
                                +{(customer.credit_added ?? 0).toLocaleString("id-ID")}
                              </div>
                              <div className="text-xs text-zinc-500">
                                -{(customer.credit_used ?? 0).toLocaleString("id-ID")}
                              </div>
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

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-zinc-200">
                <h3 className="text-lg font-semibold text-[#0f172a]">Export Credit Transactions</h3>
                <p className="text-sm text-zinc-600 mt-1">
                  Pilih rentang tanggal untuk export data transaksi kredit ke Excel
                </p>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Tanggal Mulai
                    </label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Tanggal Akhir
                    </label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                    />
                  </div>
                </div>

                <div className="text-xs text-zinc-500 bg-zinc-50 p-3 rounded">
                  <p className="font-medium mb-1">Data yang akan diexport:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Nama User (dari database customer)</li>
                    <li>Email User</li>
                    <li>Nama Aplikasi (dari master data produk)</li>
                    <li>Tipe (Credit/Debit)</li>
                    <li>Jumlah</li>
                    <li>Tanggal</li>
                  </ul>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 border border-zinc-300 rounded-lg hover:bg-zinc-200 transition"
                  disabled={exportLoading}
                >
                  Batal
                </button>
                <button
                  onClick={exportExcel}
                  disabled={exportLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {exportLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Exporting...</span>
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
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
