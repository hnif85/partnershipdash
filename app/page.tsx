"use client";

import Link from "next/link";
import {
  activities,
  computeProgress,
  formatNumber,
} from "./activity/data";
import { useEffect, useState } from "react";

type DailySummary = {
  daily_new_users: Array<{ date: string; count: number; cumulative: number }>;
  daily_purchases: Array<{ date: string; count: number; cumulative: number }>;
  total_new_users_month: number;
  total_purchases_month: number;
};

export default function Home() {
  const [dailySummary, setDailySummary] = useState<DailySummary>({
    daily_new_users: [],
    daily_purchases: [],
    total_new_users_month: 0,
    total_purchases_month: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    const fetchDailySummary = async () => {
      try {
        const response = await fetch('/api/dashboard/daily');
        if (response.ok) {
          const data = await response.json();
          setDailySummary(data);
        }
      } catch (error) {
        console.error('Failed to fetch daily summary:', error);
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchDailySummary();
  }, []);

  const totalTarget = activities.reduce((sum, item) => sum + item.target, 0);
  const totalAchieved = activities.reduce((sum, item) => sum + item.achieved, 0);
  const totalProgress = computeProgress(totalAchieved, totalTarget);
  const today = new Date();
  const formattedDate = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const getLatestDailyUsers = () => {
    if (dailySummary.daily_new_users.length === 0) return 0;
    return dailySummary.daily_new_users[dailySummary.daily_new_users.length - 1].count;
  };

  const getLatestDailyPurchases = () => {
    if (dailySummary.daily_purchases.length === 0) return 0;
    return dailySummary.daily_purchases[dailySummary.daily_purchases.length - 1].count;
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
                Strategic Planning 2026
              </p>
              <h1 className="text-3xl font-bold text-[#0f172a]">
                Activity &rarr; Target Transaksi per Bulan
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-zinc-600">
                Monitoring aktivitas partnership dan pencapaiannya per channel utama.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/weekly"
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-[#1f3c88] shadow-sm transition hover:border-[#1f3c88]"
              >
                Lihat Weekly Funnel
              </Link>
              <Link
                href="/customers"
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-[#0f5132] shadow-sm transition hover:border-[#0f5132]"
              >
                Lihat Customers
              </Link>
            </div>
          </div>

          {/* Daily Summary Section */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0f172a] mb-4">Resume Data Bulanan</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {/* New Users Summary */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-700">User Baru Per Hari</p>
                  <p className="text-sm font-bold text-[#1f3c88]">{summaryLoading ? '...' : getLatestDailyUsers()}</p>
                </div>
                <div className="text-xs text-zinc-500">
                  Akumulasi bulan ini: <span className="font-semibold text-zinc-700">{summaryLoading ? '...' : dailySummary.total_new_users_month} users</span>
                </div>
                {!summaryLoading && dailySummary.daily_new_users.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dailySummary.daily_new_users.slice(-7).map((item, index) => (
                      <div key={item.date} className="text-xs bg-zinc-100 px-2 py-1 rounded">
                        <span className="text-zinc-600">
                          {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="ml-1 font-medium text-zinc-900">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Purchases Summary */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-700">Pembelian Per Hari</p>
                  <p className="text-sm font-bold text-[#0f5132]">{summaryLoading ? '...' : getLatestDailyPurchases()}</p>
                </div>
                <div className="text-xs text-zinc-500">
                  Akumulasi bulan ini: <span className="font-semibold text-zinc-700">{summaryLoading ? '...' : dailySummary.total_purchases_month} trx</span>
                </div>
                {!summaryLoading && dailySummary.daily_purchases.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dailySummary.daily_purchases.slice(-7).map((item, index) => (
                      <div key={item.date} className="text-xs bg-zinc-100 px-2 py-1 rounded">
                        <span className="text-zinc-600">
                          {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="ml-1 font-medium text-zinc-900">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Target bulanan</p>
              <p className="mt-2 text-3xl font-bold text-[#0f172a]">
                100.000 <span className="text-base font-semibold text-zinc-500">trx</span>
              </p>
              <p className="text-sm text-zinc-600">Akumulasi seluruh aktivitas.</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Pencapaian</p>
              <p className="mt-2 text-3xl font-bold text-[#0f5132]">
                {formatNumber(totalAchieved)} <span className="text-base font-semibold text-zinc-500">trx</span>
              </p>
              <p className="text-sm text-zinc-600">Terkini dari laporan per {formattedDate}.</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Progress</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="relative h-2 flex-1 rounded-full bg-zinc-200">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[#1f3c88]"
                    style={{ width: `${Math.min(totalProgress, 100)}%` }}
                  />
                </div>
                <span className="text-lg font-semibold text-[#1f3c88]">{totalProgress}%</span>
              </div>
              <p className="text-sm text-zinc-600">Persentase pencapaian bulan berjalan.</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {activities.map((activity) => {
            const progress = computeProgress(activity.achieved, activity.target);
            return (
              <Link
                key={activity.title}
                href={`/activity/${activity.slug}`}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  activity.highlight
                    ? "border-[#1f3c88] shadow-[0_0_0_2px_rgba(31,60,136,0.12)]"
                    : "border-zinc-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="text-lg font-semibold text-[#0f172a]">{activity.title}</div>
                    <p className="text-sm text-zinc-600">{activity.description}</p>
                  </div>
                  <div className="text-right text-xs font-medium text-zinc-500">{activity.meta}</div>
                </div>

                <div className="mt-6 flex items-end justify-between">
                  <div className="space-y-1 text-right">
                    <p className="text-3xl font-bold text-[#0f172a] leading-none">
                      {formatNumber(activity.target)}
                    </p>
                    <p className="text-xs font-semibold uppercase text-zinc-500 tracking-wide">trx target</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-sm font-semibold text-[#0f5132]">Pencapaian</p>
                    <p className="text-base font-semibold text-[#0f172a]">
                      {formatNumber(activity.achieved)} trx{" "}
                      <span className="text-xs font-medium text-zinc-500">({progress}%)</span>
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="relative h-2 w-full rounded-full bg-zinc-200">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#1f3c88]"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 text-sm text-zinc-600 md:flex-row md:items-center md:justify-between">
          <p>
            Catatan: angka disusun konservatif dan dapat ditingkatkan melalui scaling ImpactPlus.
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
            Strategic Planning 2026
          </p>
        </div>
      </div>
    </main>
  );
}
