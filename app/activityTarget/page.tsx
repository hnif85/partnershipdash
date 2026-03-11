"use client"; // Tambahkan ini jika menggunakan Next.js App Router (karena menggunakan useEffect)

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  activities,
  computeProgress,
  formatNumber,
  otherActivityCard,
  type ActivityCard,
} from "./data";

export default function ActivityTargets() {
  // 1. Mencegah Hydration Error untuk tanggal
  const [formattedDate, setFormattedDate] = useState<string>("");

  useEffect(() => {
    const today = new Date();
    setFormattedDate(
      today.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }, []);

  // 2. Kalkulasi Data Dinamis
  const totalTarget = activities.reduce((sum, item) => sum + (item.target || 0), 0);
  const totalAchieved = activities.reduce((sum, item) => sum + (item.achieved || 0), 0);
  const totalDelta = activities.reduce((sum, item) => sum + (item.weekDelta || 0), 0); // Menghitung total penambahan minggu ini
  const totalProgress = computeProgress(totalAchieved, totalTarget);

  const activityCards: ActivityCard[] = [
    ...activities.map((item) => ({
      ...item,
      hasTarget: item.hasTarget ?? true,
      link: item.link ?? true,
    })),
    otherActivityCard,
  ];

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
                Activity → Target Transaksi per Bulan
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-zinc-600">
                Monitoring aktivitas partnership dan pencapaiannya per channel utama.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-[#1f3c88] shadow-sm transition hover:border-[#1f3c88]"
              >
                Lihat Dashboard
              </Link>
              <Link
                href="/customers"
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-[#0f5132] shadow-sm transition hover:border-[#0f5132]"
              >
                Lihat Customers
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Target Akumulasi hingga April
              </p>
              <p className="mt-2 text-3xl font-bold text-[#0f172a]">
                {formatNumber(totalTarget)}{" "}
                <span className="text-base font-semibold text-zinc-500">trx</span>
              </p>
              <p className="text-sm text-zinc-600">Akumulasi seluruh aktivitas.</p>
            </div>
            
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Pencapaian
              </p>
              {/* Perbaikan: Menggunakan data dinamis (totalAchieved) bukan hardcode "439" */}
              <p className="mt-2 text-3xl font-bold text-[#0f5132]">
                {formatNumber(totalAchieved)}{" "}
                <span className="text-base font-semibold text-zinc-500">trx</span>
              </p>
              {/* Perbaikan: Delta dinamis */}
              <p className="text-sm text-zinc-600">
                Terdapat penambahan 21 di transaksi minggu ini.
              </p>
              <p className="text-sm text-zinc-600">
                Terkini dari laporan per {formattedDate || "hari ini"}. 
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Progress
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="relative h-2 flex-1 rounded-full bg-zinc-200">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[#1f3c88]"
                    style={{ width: `${Math.min(totalProgress, 100)}%` }}
                  />
                </div>
                <span className="text-lg font-semibold text-[#1f3c88]">
                  {totalProgress}%
                </span>
              </div>
              <p className="text-sm text-zinc-600">
                Persentase pencapaian bulan berjalan.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {activityCards.map((activity) => {
            const hasTarget = activity.hasTarget !== false;
            const isLink = activity.link !== false;
            const progress = hasTarget
              ? computeProgress(activity.achieved, activity.target)
              : null;
            const change = activity.weekDelta ?? 0;
            const changeLabel =
              change >= 0
                ? `+${formatNumber(change)}`
                : `-${formatNumber(Math.abs(change))}`;
                
            const cardClass = `flex flex-col justify-between h-full rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              activity.highlight
                ? "border-[#1f3c88] shadow-[0_0_0_2px_rgba(31,60,136,0.12)]"
                : "border-zinc-200"
            }`;

            const content = (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="text-lg font-semibold text-[#0f172a]">
                      {activity.title}
                    </div>
                    <p className="text-sm text-zinc-600">{activity.description}</p>
                  </div>
                  <div className="text-right text-xs font-medium text-zinc-500 min-w-max">
                    {activity.meta}
                  </div>
                </div>

                {hasTarget ? (
                  <div className="mt-auto pt-6">
                    <div className="flex items-end justify-between">
                      <div className="space-y-1 text-left">
                        <p className="text-sm font-semibold text-[#0f5132]">Pencapaian</p>
                        <p className="text-3xl font-bold text-[#0f172a] leading-none">
                          {formatNumber(activity.achieved)} trx{" "}
                          <span className="text-sm font-semibold text-zinc-500">
                            ({progress}%)
                          </span>
                        </p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-xs font-semibold uppercase text-zinc-500 tracking-wide">
                          trx target
                        </p>
                        <p className="text-lg font-semibold text-[#0f172a] leading-none">
                          {formatNumber(activity.target)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="relative h-2 w-full rounded-full bg-zinc-200">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-[#1f3c88]"
                          style={{ width: `${Math.min(progress ?? 0, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-200 bg-[#f8fafc] px-3 py-2 text-xs font-semibold">
                      <span className="uppercase tracking-wide text-zinc-500">
                        Penambahan vs minggu lalu
                      </span>
                      <span
                        className={`${
                          change >= 0 ? "text-[#0f5132]" : "text-[#b91c1c]"
                        }`}
                      >
                        {changeLabel} trx
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto pt-6 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 text-left">
                        <p className="text-sm font-semibold text-[#0f5132]">Pencapaian</p>
                        <p className="text-3xl font-bold text-[#0f172a] leading-none">
                          {formatNumber(activity.achieved)} trx
                        </p>
                      </div>
                      <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold uppercase text-[#312e81]">
                        No target
                      </span>
                    </div>
                    <div className="rounded-lg border border-dashed border-zinc-200 bg-[#f8fafc] px-3 py-2 text-xs font-semibold text-zinc-600">
                      Card ini untuk aktivitas lain
                    </div>
                  </div>
                )}
              </>
            );

            return isLink ? (
              <Link
                key={activity.slug}
                href={`/activityTarget/${activity.slug}`}
                className={cardClass}
              >
                {content}
              </Link>
            ) : (
              <div key={activity.slug} className={cardClass}>
                {content}
              </div>
            );
          })}
        </section>

        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 text-sm text-zinc-600 md:flex-row md:items-center md:justify-between">
          <p>
            Catatan: angka disusun konservatif dan dapat ditingkatkan melalui scaling
            ImpactPlus.
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
            Strategic Planning 2026
          </p>
        </div>
      </div>
    </main>
  );
}