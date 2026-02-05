"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type ReferralRow = {
  referal_code?: string | null;
  partner_name?: string | null;
  registered_users: number;
  buying_users: number;
  expired_app_users: number;
  all_active_app_users: number;
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
  referralStats: ReferralRow[];
  dailyPurchases: DailyPurchase[];
  dailyUsage: DailyUsage[];
  expiringSoonUsers: number;
  timestamp: string;
};

const formatNumber = (n: number | undefined) =>
  typeof n === "number" ? n.toLocaleString("id-ID") : "-";

type SortKey =
  | "referal_code"
  | "partner_name"
  | "buying_users"
  | "registered_users"
  | "expired_app_users"
  | "all_active_app_users";

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });

type MiniBarDatum = { label: string; value: number; secondary?: number; total?: number };

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

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("registered_users");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("Failed to fetch dashboard");
        const json = (await res.json()) as DashboardData;
        setData(json);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const usageUniqueUsersChartData: MiniBarDatum[] = useMemo(() => {
    if (!data?.dailyUsage) return [];
    return data.dailyUsage.map((row) => ({
      label: formatShortDate(row.date),
      value: row.unique_users,
    }));
  }, [data?.dailyUsage]);

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
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:col-span-2">
                  <p className="text-xs font-semibold uppercase text-zinc-500">Jumlah user yang membeli Aplikasi</p>
                  <p className="mt-2 text-4xl font-bold text-[#0f172a]">
                    {formatNumber(data?.usersPurchasedIdrFinished)}
                  </p>
                  <p className="text-sm text-zinc-600 mt-1">User yang membeli aplikasi</p>
                </div>
                <div className="rounded-xl border border-dashed border-[#1f3c88] bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-[#1f3c88]">Shortcut</p>
                  <div className="mt-3 flex flex-col gap-2 text-sm">
                    <Link href="/sales" className="text-[#1f3c88] hover:underline font-semibold">Lihat transaksi</Link>
                    <Link href="/customers" className="text-[#0f5132] hover:underline font-semibold">Lihat customers</Link>
                  </div>
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
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">Pembelian Harian</p>
                      <h2 className="text-lg font-semibold text-[#0f172a]">Pertumbuhan Pembelian</h2>
                      <p className="text-sm text-zinc-600">14 hari terakhir, transaksi IDR berstatus finished.</p>
                    </div>
                    <div className="text-right text-sm text-zinc-500">
                      <div>Total transaksi: {formatNumber(totalTransactions)}</div>
                      <div>Total buyer unik: {formatNumber(totalUniqueBuyers)}</div>
                    </div>
                  </div>
                  {purchaseChartData.length === 0 ? (
                    <p className="py-6 text-center text-sm text-zinc-500">Belum ada data transaksi 14 hari terakhir.</p>
                    ) : (
                    <MiniBarChart
                      data={purchaseOnlyChartData}
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
                      <p className="text-sm text-zinc-600">14 hari terakhir, berdasarkan transaksi debit Credit Manager.</p>
                    </div>
                    <div className="text-right text-sm text-zinc-500">
                      <div>Total usage (credit): {formatNumber(totalUsageCredits)}</div>
                    </div>
                  </div>
                  {usageCreditChartData.length === 0 ? (
                    <p className="py-6 text-center text-sm text-zinc-500">Belum ada data penggunaan 14 hari terakhir.</p>
                  ) : (
                    <MiniBarChart
                      data={usageCreditChartData}
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
                      <p className="text-sm text-zinc-600">14 hari terakhir, jumlah user unik yang memakai aplikasi.</p>
                    </div>
                    <div className="text-right text-sm text-zinc-500">
                      <div>User unik: {formatNumber(totalUsageUniqueUsers)}</div>
                    </div>
                  </div>
                  {usageUniqueUsersChartData.length === 0 ? (
                    <p className="py-6 text-center text-sm text-zinc-500">Belum ada data user unik 14 hari terakhir.</p>
                  ) : (
                    <MiniBarChart
                      data={usageUniqueUsersChartData}
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
                  <p className="text-sm text-zinc-600">Ringkasan jumlah user beli, daftar, serta status expired aplikasi.</p>
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
                      </tr>
                    </thead>
                    <tbody>
                      {referralRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-zinc-500">Tidak ada data referral.</td>
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
