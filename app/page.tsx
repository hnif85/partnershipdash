"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, Dispatch, SetStateAction } from "react";
import * as XLSX from "xlsx";

type ReferralRow = {
  referal_code?: string | null;
  partner_name?: string | null;
  registered_users: number;
  buying_users: number;
  expired_app_users: number;
  all_active_app_users: number;
  transaction_count: number;
};

type DailyPurchase = {
  date: string;
  transactions: number;
  unique_buyers: number;
  total_idr: number;
};

type DailyUsage = {
  date: string;
  usage_events: number;
  unique_users: number;
  total_amount: number;
};

type DashboardData = {
  usersPurchasedIdrFinished: number;
  transactionsPurchasedIdrFinished: number;
  referralStats: ReferralRow[];
  dailyPurchases: DailyPurchase[];
  dailyUsage: DailyUsage[];
  expiringSoonUsers: number;
  creditStats?: {
    users_with_transactions: number;
  };
  customerStats?: {
    total_customers: number;
    active_customers: number;
    expired_users: number;
    last_updated?: string | null;
  };
  churnStats?: {
    active_users: number;
    idle_users: number;
    passive_users: number;
  };
  timestamp: string;
};

const formatNumber = (n: number | undefined) =>
  typeof n === "number" ? n.toLocaleString("id-ID") : "-";

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
};

type SyncState = {
  status: "idle" | "loading" | "success" | "error";
  message: string | null;
};

type SortKey =
  | "referal_code"
  | "partner_name"
  | "buying_users"
  | "registered_users"
  | "expired_app_users"
  | "all_active_app_users"
  | "transaction_count";

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });

type MiniBarDatum = { label: string; value: number; secondary?: number; total?: number };

const buildCumulativeData = (data: MiniBarDatum[]) => {
  let primary = 0;
  let secondary = 0;
  return data.map((d) => {
    primary += d.value;
    const nextSecondary = d.secondary !== undefined ? (secondary += d.secondary) : undefined;
    return { ...d, value: primary, secondary: nextSecondary };
  });
};

const MiniBarChart = ({
  data,
  color,
  secondaryColor,
  title,
  valueLabel,
  secondaryLabel,
}: {
  data: MiniBarDatum[];
  color: string;
  secondaryColor?: string;
  title: string;
  valueLabel: string;
  secondaryLabel?: string;
}) => {
  const maxValue = Math.max(...data.map((d) => Math.max(d.value, d.secondary || 0)), 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-zinc-600">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          <span>{valueLabel}</span>
          {secondaryLabel && secondaryColor ? (
            <>
              <span className="text-zinc-300">•</span>
              <span className="h-2 w-2 rounded-full" style={{ background: secondaryColor }} />
              <span>{secondaryLabel}</span>
            </>
          ) : null}
        </div>
        <span className="text-xs uppercase tracking-wide text-zinc-500">{title}</span>
      </div>
      <div className="flex h-40 items-end gap-2 overflow-x-auto pb-2">
        {data.map((d) => {
          const primaryHeight = `${(d.value / maxValue) * 100}%`;
          const secondaryHeight =
            d.secondary !== undefined ? `${(d.secondary / maxValue) * 100}%` : "0%";
          return (
            <div key={d.label} className="flex flex-col items-center text-[11px] text-zinc-500">
              <div className="relative flex h-32 w-4 items-end justify-center rounded-sm bg-[#f4f6fb]">
                <div
                  className="w-[55%] rounded-sm"
                  style={{ height: primaryHeight, background: color }}
                  title={`${valueLabel}: ${d.value.toLocaleString("id-ID")}`}
                />
                {d.secondary !== undefined ? (
                  <div
                    className="absolute bottom-0 left-1/2 w-[55%] -translate-x-1/2 translate-y-[6px] rounded-sm"
                    style={{ height: secondaryHeight, background: secondaryColor }}
                    title={`${secondaryLabel}: ${d.secondary.toLocaleString("id-ID")}`}
                  />
                ) : null}
              </div>
              <span className="mt-2 whitespace-nowrap">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ModeToggle = ({
  mode,
  onChange,
}: {
  mode: "daily" | "cumulative";
  onChange: (value: "daily" | "cumulative") => void;
}) => {
  const options: Array<{ key: "daily" | "cumulative"; label: string }> = [
    { key: "daily", label: "Harian" },
    { key: "cumulative", label: "Akumulasi" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-1 text-[11px] font-semibold text-zinc-600">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`rounded-full px-2 py-1 transition ${
            mode === opt.key
              ? "bg-white text-[#0f172a] shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("registered_users");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [exporting, setExporting] = useState(false);
  const [exportingSales, setExportingSales] = useState(false);
  const [syncUserState, setSyncUserState] = useState<SyncState>({ status: "idle", message: null });
  const [syncTransactionState, setSyncTransactionState] = useState<SyncState>({ status: "idle", message: null });
  const [syncUsageState, setSyncUsageState] = useState<SyncState>({ status: "idle", message: null });
  const [purchaseMode, setPurchaseMode] = useState<"daily" | "cumulative">("daily");
  const [usageCreditMode, setUsageCreditMode] = useState<"daily" | "cumulative">("daily");
  const [usageUserMode, setUsageUserMode] = useState<"daily" | "cumulative">("daily");

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      const json = (await res.json()) as DashboardData;
      setData(json);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchDashboard();
      setLoading(false);
    };
    load();
  }, [fetchDashboard]);

  const runSync = async (
    endpoint: string,
    setState: Dispatch<SetStateAction<SyncState>>,
    formatSuccess: (data: any) => string,
    options?: RequestInit
  ) => {
    setState({ status: "loading", message: null });
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        ...(options || {}),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setState({ status: "success", message: formatSuccess(data) });
        await fetchDashboard();
      } else {
        setState({ status: "error", message: data?.error || "Sync gagal" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      setState({ status: "error", message });
    }
  };

  // Gunakan endpoint sync customers (sama seperti tombol \"Get Customers\" di halaman /customers)
  const handleSyncUsers = () =>
    runSync(
      "/api/sync-customers",
      setSyncUserState,
      (data) => `Sync customer berhasil (${data.success_count ?? 0} sukses, ${data.error_count ?? 0} gagal, total ${data.total_processed ?? 0})`
    );

  const handleSyncTransactions = () =>
    runSync(
      "/api/sync-transactions",
      setSyncTransactionState,
      (data) => `Sync transaksi berhasil (${data.success_count ?? 0} sukses, ${data.error_count ?? 0} gagal, total ${data.total_processed ?? 0})`,
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // sesuai tombol "Sinkron Semua" di /sales
      }
    );

  const handleSyncUsage = () =>
    runSync(
      "/api/sync-credit-manager-transactions",
      setSyncUsageState,
      (data) => `Sync usage berhasil (${data.success_count ?? 0} sukses, ${data.error_count ?? 0} gagal, total ${data.total_processed ?? 0})`
    );

  const purchaseChartData: MiniBarDatum[] = useMemo(() => {
    if (!data?.dailyPurchases) return [];
    return data.dailyPurchases.map((row) => ({
      label: formatShortDate(row.date),
      value: row.transactions,
      secondary: row.unique_buyers,
      total: row.total_idr,
    }));
  }, [data?.dailyPurchases]);

  const purchaseOnlyChartData: MiniBarDatum[] = useMemo(() => {
    if (purchaseChartData.length === 0) return [];
    return purchaseChartData.map((row) => ({ label: row.label, value: row.value }));
  }, [purchaseChartData]);

  const purchaseCumulativeChartData = useMemo(
    () => buildCumulativeData(purchaseOnlyChartData),
    [purchaseOnlyChartData]
  );

  const totalTransactions = useMemo(
    () => purchaseChartData.reduce((s, d) => s + d.value, 0),
    [purchaseChartData]
  );

  const totalUniqueBuyers = useMemo(
    () => purchaseChartData.reduce((s, d) => s + (d.secondary || 0), 0),
    [purchaseChartData]
  );

  const usageCreditChartData: MiniBarDatum[] = useMemo(() => {
    if (!data?.dailyUsage) return [];
    return data.dailyUsage.map((row) => ({
      label: formatShortDate(row.date),
      value: row.total_amount,
    }));
  }, [data?.dailyUsage]);

  const usageCreditCumulativeChartData = useMemo(
    () => buildCumulativeData(usageCreditChartData),
    [usageCreditChartData]
  );

  const usageUniqueUsersChartData: MiniBarDatum[] = useMemo(() => {
    if (!data?.dailyUsage) return [];
    return data.dailyUsage.map((row) => ({
      label: formatShortDate(row.date),
      value: row.unique_users,
    }));
  }, [data?.dailyUsage]);

  const usageUniqueUsersCumulativeChartData = useMemo(
    () => buildCumulativeData(usageUniqueUsersChartData),
    [usageUniqueUsersChartData]
  );

  const totalUsageCredits = useMemo(
    () => usageCreditChartData.reduce((s, d) => s + d.value, 0),
    [usageCreditChartData]
  );

  const totalUsageUniqueUsers = useMemo(
    () => usageUniqueUsersChartData.reduce((s, d) => s + d.value, 0),
    [usageUniqueUsersChartData]
  );

  const referralRows = useMemo(() => {
    if (!data?.referralStats) return [];
    const rows = [...data.referralStats];
    rows.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const getVal = (row: ReferralRow, key: SortKey) => {
        switch (key) {
          case "referal_code":
            return (row.referal_code || "").toLowerCase();
          case "partner_name":
            return (row.partner_name || "").toLowerCase();
          case "buying_users":
            return row.buying_users;
          case "registered_users":
            return row.registered_users;
          case "expired_app_users":
            return row.expired_app_users;
          case "all_active_app_users":
            return row.all_active_app_users;
          case "transaction_count":
            return row.transaction_count;
        }
      };
      const va = getVal(a, sortKey);
      const vb = getVal(b, sortKey);
      if (typeof va === "string" && typeof vb === "string") {
        return va.localeCompare(vb) * dir;
      }
      return ((va as number) - (vb as number)) * dir;
    });
    return rows;
  }, [data, sortDir, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ active }: { active: boolean }) => (
    <span className="ml-1 inline-block align-middle text-[10px]">
      {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );

  const handleExportReferral = () => {
    if (!referralRows.length) return;
    setExporting(true);
    try {
      const rows = referralRows.map((row, idx) => ({
        "No": idx + 1,
        "Referral Code": row.referal_code || "",
        "Partner": row.partner_name || "",
        "User Membeli": row.buying_users,
        "User Terdaftar": row.registered_users,
        "Punya App Expired": row.expired_app_users,
        "Semua App Aktif": row.all_active_app_users,
        "Jumlah Transaksi": row.transaction_count,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Referral Stats");
      const timestamp = new Date().toISOString().replace(/[:.-]/g, "").slice(0, 15);
      XLSX.writeFile(wb, `referral-stats-${timestamp}.xlsx`);
    } catch (err) {
      console.error("Export referral stats failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportSales = async () => {
    setExportingSales(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "99999",
        search: "",
        status: "finished",
        start_date: "",
        end_date: "",
        customer_guid: "",
        currency: "IDR",
        referral: "",
      });

      const res = await fetch(`/api/transactions?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const payload: any = await res.json();
      if (!payload.transactions) throw new Error(payload.error || "Payload kosong");

      const exportData = (payload.transactions as any[]).map((transaction) => ({
        Invoice: transaction.invoice_number || "",
        Customer: transaction.customer_full_name || transaction.customer_username || "N/A",
        Referral: transaction.referral_name || "N/A",
        Email: transaction.customer_email || "",
        Product:
          transaction.transaction_details && transaction.transaction_details.length > 0
            ? transaction.transaction_details.length === 1
              ? transaction.transaction_details[0].product_name
              : `${transaction.transaction_details[0].product_name} (+${transaction.transaction_details.length - 1} more items)`
            : "-",
        Payment: transaction.payment_channel_name || "",
        Amount: `${transaction.valuta_code || "USD"} ${transaction.grand_total?.toLocaleString("id-ID", {
          minimumFractionDigits: 2,
        }) || "0.00"}`,
        Quantity: transaction.qty || 0,
        Status: transaction.status || "Unknown",
        Date: formatDate(transaction.created_at),
        Transaction_GUID: transaction.guid,
        Customer_GUID: transaction.customer_guid,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 20 },
        { wch: 25 },
        { wch: 20 },
        { wch: 30 },
        { wch: 35 },
        { wch: 20 },
        { wch: 15 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 40 },
        { wch: 40 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "MWX Transactions");

      const now = new Date();
      const filename = `mwx_transactions_${now.getFullYear()}${(now.getMonth() + 1)
        .toString()
        .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Export sales failed:", err);
      alert("Export failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setExportingSales(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
                Partnership Growth
              </p>
              <h1 className="text-3xl font-bold text-[#0f172a]">
                Dashboard
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-zinc-600">
                Monitoring aktivitas partnership dan pencapaiannya per channel utama.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/activityTarget"
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-[#1f3c88] shadow-sm transition hover:border-[#1f3c88]"
              >
                Activity Targets
              </Link>
              <Link
                href="/sales"
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-[#0f5132] shadow-sm transition hover:border-[#0f5132]"
              >
                Sales
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm text-center py-12">
              <p>Loading dashboard...</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-zinc-500">Jumlah user yang membeli aplikasi</p>
                  <p className="mt-2 text-4xl font-bold text-[#0f172a]">
                    {formatNumber(data?.usersPurchasedIdrFinished)}
                  </p>
                  
                  <br></br>
                  <p className="text-xs font-semibold uppercase text-zinc-500">Jumlah user</p>
                  <p className="mt-2 text-4xl font-bold text-[#0f172a]">
                    {formatNumber(data?.customerStats?.total_customers)}
                  </p>
                  <p className="text-sm text-zinc-600 mt-1">
                    Last update: {formatDateTime(data?.customerStats?.last_updated)}
                  </p>
                </div>
                
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-zinc-500">Jumlah transaksi</p>
                  <p className="mt-2 text-4xl font-bold text-[#0f172a]">
                    {formatNumber(data?.transactionsPurchasedIdrFinished)}
                  </p>
                  <p className="text-sm text-zinc-600 mt-1">Transaksi IDR berstatus finished, non-demo.</p>
                  <button
                    onClick={handleExportSales}
                    disabled={exportingSales}
                    className={`mt-4 inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      exportingSales
                        ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                        : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700"
                    }`}
                  >
                    {exportingSales ? "Exporting..." : "Export to XLS"}
                  </button>
                </div>
                <div className="rounded-xl border border-[#e7d6ff] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-[#5b21b6]">Expired &lt; 7 Hari</p>
                  <p className="mt-2 text-3xl font-bold text-[#5b21b6]">
                    {formatNumber(data?.expiringSoonUsers)}
                  </p>
                  <p className="text-sm text-zinc-600 mt-1">User yang masa berlaku aplikasinya akan habis dalam 7 hari ke depan.</p>
                  <div className="mt-4">
                    <Link
                      href="/customers?statusFilter=expiring_soon"
                      className="inline-flex items-center gap-2 rounded-lg border border-[#5b21b6] px-3 py-2 text-sm font-semibold text-[#5b21b6] transition hover:bg-[#f3e8ff]"
                    >
                      Lihat daftar user
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
                <div className="rounded-xl border border-dashed border-[#1f3c88] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-[#1f3c88]">Shortcut</p>
                  <div className="mt-3 flex flex-col gap-2 text-sm">
                    <Link href="/sales" className="text-[#1f3c88] hover:underline font-semibold">Lihat transaksi</Link>
                    <Link href="/customers" className="text-[#0f5132] hover:underline font-semibold">Lihat customers</Link>
                  </div>
                  <div className="mt-4 border-t border-dashed border-[#e5e7eb] pt-4">
                    <p className="text-xs font-semibold uppercase text-[#1f3c88] mb-3">Sync Cepat</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleSyncUsers}
                        disabled={syncUserState.status === "loading"}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition border ${
                          syncUserState.status === "loading"
                            ? "border-zinc-200 bg-zinc-100 text-zinc-500 cursor-not-allowed"
                            : "border-[#1f3c88] text-[#1f3c88] hover:bg-[#f0f4ff]"
                        }`}
                      >
                        {syncUserState.status === "loading" ? "Sync User..." : "Sync User"}
                      </button>
                      <button
                        onClick={handleSyncTransactions}
                        disabled={syncTransactionState.status === "loading"}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition border ${
                          syncTransactionState.status === "loading"
                            ? "border-zinc-200 bg-zinc-100 text-zinc-500 cursor-not-allowed"
                            : "border-[#0f5132] text-[#0f5132] hover:bg-[#e7f5ec]"
                        }`}
                      >
                        {syncTransactionState.status === "loading" ? "Sync Transaksi..." : "Sync Transaksi"}
                      </button>
                      <button
                        onClick={handleSyncUsage}
                        disabled={syncUsageState.status === "loading"}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition border ${
                          syncUsageState.status === "loading"
                            ? "border-zinc-200 bg-zinc-100 text-zinc-500 cursor-not-allowed"
                            : "border-[#d97706] text-[#d97706] hover:bg-[#fff7ed]"
                        }`}
                      >
                        {syncUsageState.status === "loading" ? "Sync Usage..." : "Sync Usage"}
                      </button>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-zinc-600">
                      {syncUserState.message && (
                        <div className={syncUserState.status === "error" ? "text-red-600" : "text-[#1f3c88]"}>
                          User: {syncUserState.message}
                        </div>
                      )}
                      {syncTransactionState.message && (
                        <div className={syncTransactionState.status === "error" ? "text-red-600" : "text-[#0f5132]"}>
                          Transaksi: {syncTransactionState.message}
                        </div>
                      )}
                      {syncUsageState.message && (
                        <div className={syncUsageState.status === "error" ? "text-red-600" : "text-[#d97706]"}>
                          Usage: {syncUsageState.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Link
                  href="/customers?churnFilter=aktif"
                  className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm hover:border-emerald-400 transition"
                >
                  <p className="text-xs font-semibold uppercase text-emerald-700">User Aktif</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-900">
                    {formatNumber(data?.churnStats?.active_users)}
                  </p>
                  <p className="text-sm text-zinc-600 mt-1">Penggunaan ≤ 7 hari terakhir.</p>
                  <div className="mt-3 text-sm font-semibold text-emerald-700">Lihat Customers →</div>
                </Link>
                <Link
                  href="/customers?churnFilter=idle"
                  className="rounded-xl border border-amber-200 bg-white p-6 shadow-sm hover:border-amber-400 transition"
                >
                  <p className="text-xs font-semibold uppercase text-amber-700">User Idle</p>
                  <p className="mt-2 text-3xl font-bold text-amber-900">
                    {formatNumber(data?.churnStats?.idle_users)}
                  </p>
                  <p className="text-sm text-zinc-600 mt-1">Penggunaan 7–30 hari lalu.</p>
                  <div className="mt-3 text-sm font-semibold text-amber-700">Lihat Customers →</div>
                </Link>
                <Link
                  href="/customers?churnFilter=pasif"
                  className="rounded-xl border border-red-200 bg-white p-6 shadow-sm hover:border-red-400 transition"
                >
                  <p className="text-xs font-semibold uppercase text-red-700">User Pasif</p>
                  <p className="mt-2 text-3xl font-bold text-red-900">
                    {formatNumber(data?.churnStats?.passive_users)}
                  </p>
                  <p className="text-sm text-zinc-600 mt-1">Penggunaan &gt; 30 hari lalu / belum pernah.</p>
                  <div className="mt-3 text-sm font-semibold text-red-700">Lihat Customers →</div>
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">Pembelian Harian</p>
                      <h2 className="text-lg font-semibold text-[#0f172a]">Pertumbuhan Pembelian</h2>
                      <p className="text-sm text-zinc-600">14 hari terakhir</p>
                    </div>
                    <div className="flex items-center gap-3">
                      
                      <ModeToggle mode={purchaseMode} onChange={setPurchaseMode} />
                    </div>
                  </div>
                  {purchaseChartData.length === 0 ? (
                    <p className="py-6 text-center text-sm text-zinc-500">Belum ada data transaksi 14 hari terakhir.</p>
                    ) : (
                    <MiniBarChart
                      data={purchaseMode === "daily" ? purchaseOnlyChartData : purchaseCumulativeChartData}
                      color="#1f3c88"
                      title="Transaksi"
                      valueLabel="Transaksi"
                    />
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#0f5132]">Penggunaan Aplikasi</p>
                      <h2 className="text-lg font-semibold text-[#0f172a]">Debit / Usage per Hari</h2>
                      <p className="text-sm text-zinc-600">14 hari terakhir</p>
                    </div>
                    <div className="flex items-center gap-3">
                      
                      <ModeToggle mode={usageCreditMode} onChange={setUsageCreditMode} />
                    </div>
                  </div>
                  {usageCreditChartData.length === 0 ? (
                    <p className="py-6 text-center text-sm text-zinc-500">Belum ada data penggunaan 14 hari terakhir.</p>
                  ) : (
                    <MiniBarChart
                      data={usageCreditMode === "daily" ? usageCreditChartData : usageCreditCumulativeChartData}
                      color="#0f5132"
                      title="Usage (Credit)"
                      valueLabel="Total Credit"
                    />
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#d97706]">User Unik</p>
                      <h2 className="text-lg font-semibold text-[#0f172a]">Pengguna Unik per Hari</h2>
                      <p className="text-sm text-zinc-600">14 hari terakhir.</p>
                    </div>
                    <div className="flex items-center gap-3">                      
                      <ModeToggle mode={usageUserMode} onChange={setUsageUserMode} />
                    </div>
                  </div>
                  {usageUniqueUsersChartData.length === 0 ? (
                    <p className="py-6 text-center text-sm text-zinc-500">Belum ada data user unik 14 hari terakhir.</p>
                  ) : (
                    <MiniBarChart
                      data={
                        usageUserMode === "daily"
                          ? usageUniqueUsersChartData
                          : usageUniqueUsersCumulativeChartData
                      }
                      color="#f97316"
                      title="User Unik"
                      valueLabel="User Unik"
                    />
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-1 border-b border-zinc-200 pb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">Referral Performance</p>
                  <h2 className="text-lg font-semibold text-[#0f172a]">Pembelian & Status Aplikasi per Referral</h2>
                  <p className="text-sm text-zinc-600">Ringkasan jumlah user beli.</p>
                </div>
                <div className="mt-4 flex flex-wrap justify-end">
                  <button
                    onClick={handleExportReferral}
                    disabled={exporting || referralRows.length === 0}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      exporting || referralRows.length === 0
                        ? "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed"
                        : "border-[#1f3c88] bg-white text-[#1f3c88] hover:bg-[#f0f4ff]"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v12H4z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16v4h8v-4" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 12l2 2 2-2" />
                    </svg>
                    {exporting ? "Mengekspor..." : "Export to Excel"}
                  </button>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-[#f7f8fb] text-left">
                        <th
                          className="py-3 px-2 font-semibold text-zinc-700 cursor-pointer select-none"
                          onClick={() => toggleSort("referal_code")}
                        >
                          Referral Code <SortIcon active={sortKey === "referal_code"} />
                        </th>
                        <th
                          className="py-3 px-2 font-semibold text-zinc-700 cursor-pointer select-none"
                          onClick={() => toggleSort("partner_name")}
                        >
                          Partner <SortIcon active={sortKey === "partner_name"} />
                        </th>
                        <th
                          className="py-3 px-2 font-semibold text-zinc-700 cursor-pointer select-none"
                          onClick={() => toggleSort("buying_users")}
                        >
                          User Membeli <SortIcon active={sortKey === "buying_users"} />
                        </th>
                        <th
                          className="py-3 px-2 font-semibold text-zinc-700 cursor-pointer select-none"
                          onClick={() => toggleSort("registered_users")}
                        >
                          User Terdaftar <SortIcon active={sortKey === "registered_users"} />
                        </th>
                        <th
                          className="py-3 px-2 font-semibold text-zinc-700 cursor-pointer select-none"
                          onClick={() => toggleSort("expired_app_users")}
                        >
                          User dengan App Expired <SortIcon active={sortKey === "expired_app_users"} />
                        </th>
                        <th
                          className="py-3 px-2 font-semibold text-zinc-700 cursor-pointer select-none"
                          onClick={() => toggleSort("all_active_app_users")}
                        >
                          User dengan App Aktif <SortIcon active={sortKey === "all_active_app_users"} />
                        </th>
                        <th
                          className="py-3 px-2 font-semibold text-zinc-700 cursor-pointer select-none"
                          onClick={() => toggleSort("transaction_count")}
                        >
                          Jumlah Transaksi <SortIcon active={sortKey === "transaction_count"} />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {referralRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-zinc-500">Tidak ada data referral.</td>
                        </tr>
                      ) : (
                        referralRows.map((row) => (
                          <tr key={row.referal_code || "(unknown)"} className="border-b border-zinc-100 hover:bg-[#f9fafb] transition-colors">
                            <td className="py-3 px-2 font-semibold text-[#1f3c88]">{row.referal_code || "(unknown)"}</td>
                            <td className="py-3 px-2 text-zinc-800">{row.partner_name || "-"}</td>
                            <td className="py-3 px-2 text-zinc-800">{formatNumber(row.buying_users)}</td>
                            <td className="py-3 px-2 text-zinc-800">{formatNumber(row.registered_users)}</td>
                            <td className="py-3 px-2 text-orange-600 font-semibold">{formatNumber(row.expired_app_users)}</td>
                            <td className="py-3 px-2 text-[#0f5132] font-semibold">{formatNumber(row.all_active_app_users)}</td>
                            <td className="py-3 px-2 text-[#1f3c88] font-semibold">{formatNumber(row.transaction_count)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </header>

        <div className="flex flex-col gap-8">
          {/* Quick Links or Charts can be added here */}
        </div>
      </div>
    </main>
  );
}
