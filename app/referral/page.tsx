"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ReferralData = {
  referral_code: string;
  partner_name: string;
  user_count: number;
  referral_type: string;
  total_purchase_amount: number;
  finished_transactions_count: number;
  total_credit_used: number;
  total_credit_added: number;
  net_credit: number;
};

type ApiResponse = {
  referrals?: ReferralData[];
  total_count?: number;
  error?: string;
};

const formatCurrency = (value: number, currency: string = "IDR") => {
  // Validate currency code
  const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'IDR', 'SGD', 'MYR', 'THB', 'VND', 'PHP', 'KRW', 'CNY', 'HKD', 'TWD'];

  if (!currency || !validCurrencies.includes(currency.toUpperCase()) || !/^[A-Z]{3}$/.test(currency.toUpperCase())) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
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
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
    }).format(value);
  }
};

export default function ReferralPage() {
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("user_count");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statsSummary, setStatsSummary] = useState({
    total_codes: 0,
    total_users: 0,
    total_purchase_amount: 0,
    total_finished_transactions: 0,
    total_credit_used: 0,
    total_credit_added: 0,
    total_net_credit: 0
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;

    return sortOrder === "asc" ? (
      <svg className="inline-block ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="inline-block ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const sortOptions = [
    { value: "user_count", label: "Users" },
    { value: "partner_name", label: "Partner" },
    { value: "finished_transactions_count", label: "Transactions" },
    { value: "total_purchase_amount", label: "Purchase Amount" },
    { value: "referral_code", label: "Referral Code" }
  ];

  useEffect(() => {
    loadReferrals();
  }, [sortBy, sortOrder]);

  useEffect(() => {
    // Calculate summary stats whenever referrals change
    const summary = referrals.reduce((acc, ref) => ({
      total_codes: acc.total_codes + 1,
      total_users: acc.total_users + ref.user_count,
      total_purchase_amount: acc.total_purchase_amount + ref.total_purchase_amount,
      total_finished_transactions: acc.total_finished_transactions + ref.finished_transactions_count,
      total_credit_used: acc.total_credit_used + ref.total_credit_used,
      total_credit_added: acc.total_credit_added + ref.total_credit_added,
      total_net_credit: acc.total_net_credit + ref.net_credit
    }), {
      total_codes: 0,
      total_users: 0,
      total_purchase_amount: 0,
      total_finished_transactions: 0,
      total_credit_used: 0,
      total_credit_added: 0,
      total_net_credit: 0
    });
    setStatsSummary(summary);
  }, [referrals]);

  const loadReferrals = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        sort_by: sortBy,
        sort_order: sortOrder
      });
      const res = await fetch(`/api/referral?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = (await res.json()) as ApiResponse;
      if (!data.referrals) throw new Error(data.error || "Payload kosong");
      setReferrals(data.referrals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const filteredReferrals = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return referrals;

    return referrals.filter((ref) =>
      ref.referral_code.toLowerCase().includes(term) ||
      ref.partner_name?.toLowerCase().includes(term) ||
      ref.referral_type.toLowerCase().includes(term)
    );
  }, [referrals, search]);

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-[#0f172a]">Referral Dashboard</h1>
            <p className="text-sm text-zinc-600">
              Statistik referral code, pengguna, dan performa pembelian.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-600">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm shadow-sm transition hover:bg-zinc-50 focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
              >
                {sortOrder === "asc" ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8l4-4m0 4l4 4m-6 4v12m12-12V4m0 4l4 4m-4-4l-4-4" />
                  </svg>
                )}
              </button>
            </div>
            <Link
              href="/referral/manage"
              className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 hover:border-blue-700"
            >
              Manage Partners
            </Link>
            <button
              onClick={loadReferrals}
              disabled={loading}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                loading
                  ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                  : "border-purple-600 bg-purple-600 text-white hover:bg-purple-700 hover:border-purple-700"
              }`}
              type="button"
            >
              {loading ? "Loading..." : "Refresh Data"}
            </button>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode referral..."
              className="w-full min-w-[240px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88] md:w-auto"
            />
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Total Referral Codes</p>
            <p className="mt-2 text-2xl font-semibold text-[#0f172a]">
              {statsSummary.total_codes.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Total Users</p>
            <p className="mt-2 text-2xl font-semibold text-[#0f172a]">
              {statsSummary.total_users.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-orange-600">Total Transactions</p>
            <p className="mt-2 text-2xl font-semibold text-orange-700">
              {statsSummary.total_finished_transactions.toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-orange-600">Finished transactions</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-green-600">Total Purchase Amount</p>
            <p className="mt-2 text-2xl font-semibold text-green-700">
              {formatCurrency(statsSummary.total_purchase_amount)}
            </p>
            <p className="text-xs text-green-600">IDR currency</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-blue-600">Net Credit</p>
            <p className="mt-2 text-2xl font-semibold text-blue-700">
              {formatCurrency(Math.abs(statsSummary.total_net_credit), "IDR")}
            </p>
            <p className={`text-xs ${statsSummary.total_net_credit >= 0 ? "text-green-600" : "text-red-600"}`}>
              Added: {formatCurrency(statsSummary.total_credit_added, "IDR")} | Used: {formatCurrency(statsSummary.total_credit_used, "IDR")}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-500">Referral Codes</p>
              <h2 className="text-lg font-semibold text-[#0f172a]">Referral Statistics</h2>
            </div>
            <div className="text-sm text-zinc-500">
              Total {filteredReferrals.length} codes
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-6 text-sm text-zinc-600">Memuat data referral...</div>
          ) : error ? (
            <div className="px-5 py-6 text-sm text-red-600">Gagal memuat: {error}</div>
          ) : !filteredReferrals.length ? (
            <div className="px-5 py-6 text-sm text-zinc-600">Tidak ada data referral.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full table-fixed divide-y divide-zinc-200">
                <colgroup>
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[10%]" />
                  <col className="w-[15%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[15%]" />
                </colgroup>
                <thead className="bg-[#f9fafb]">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 cursor-pointer hover:bg-zinc-100"
                      onClick={() => handleSort("referral_code")}
                    >
                      Referral Code
                      {getSortIcon("referral_code")}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 cursor-pointer hover:bg-zinc-100"
                      onClick={() => handleSort("partner_name")}
                    >
                      Partner
                      {getSortIcon("partner_name")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Type
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 cursor-pointer hover:bg-zinc-100"
                      onClick={() => handleSort("user_count")}
                    >
                      Users
                      {getSortIcon("user_count")}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 cursor-pointer hover:bg-zinc-100"
                      onClick={() => handleSort("total_purchase_amount")}
                    >
                      Purchase Amount
                      {getSortIcon("total_purchase_amount")}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 cursor-pointer hover:bg-zinc-100"
                      onClick={() => handleSort("finished_transactions_count")}
                    >
                      Transactions
                      {getSortIcon("finished_transactions_count")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Credit Used
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Net Credit
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {filteredReferrals.map((referral) => (
                    <tr key={referral.referral_code} className="hover:bg-[#f7f8fb]">
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <div className="font-semibold text-[#1f3c88]">{referral.referral_code}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <div className="font-semibold">{referral.partner_name || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          referral.referral_type === 'Customer Referral'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {referral.referral_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <div className="font-semibold">{referral.user_count.toLocaleString("id-ID")}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <div className="font-semibold">{formatCurrency(referral.total_purchase_amount)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <div className="font-semibold">{referral.finished_transactions_count.toLocaleString("id-ID")}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <span className="text-red-600">{referral.total_credit_used.toLocaleString("id-ID")}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <span className={`font-semibold ${
                          referral.net_credit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {referral.net_credit.toLocaleString("id-ID")}
                          {referral.net_credit < 0 && " (debit)"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}