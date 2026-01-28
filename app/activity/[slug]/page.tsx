import Link from "next/link";
import { notFound } from "next/navigation";
import { getPartnerActivationMatrix, getPartnerCRMData, type PartnerActivationRow, type PartnerCRMRow } from "@/lib/partnerActivations";
import { getGovNonGovStats } from "@/lib/activityStats";
import { activities, computeProgress, formatNumber } from "../data";
import PartnerTable from "./partner-table";

export const revalidate = 0;

function PartnerMetricCard({ row }: { row: PartnerActivationRow }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-[#f9fafb] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
            {row.isGov ? "Government" : "Non-Government"}
          </p>
          <h3 className="text-lg font-bold text-[#0f172a]">{row.partner}</h3>
          <p className="text-xs text-zinc-600">Total pelatihan: {formatNumber(row.totalTrainings)}</p>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-600 border border-zinc-200">
          {formatNumber(row.totalParticipants)} peserta
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white border border-zinc-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">User unik</p>
          <p className="text-xl font-bold text-[#0f172a]">{formatNumber(row.uniqueUsers)}</p>
        </div>
        <div className="rounded-lg bg-white border border-zinc-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">User terdaftar</p>
          <p className="text-xl font-bold text-[#0f172a]">{formatNumber(row.registeredUsers)}</p>
        </div>
        <div className="rounded-lg bg-white border border-zinc-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">User pakai aplikasi</p>
          <p className="text-xl font-bold text-[#0f172a]">{formatNumber(row.appUsers)}</p>
        </div>
      </div>
    </div>
  );
}



type Params = { slug: string };

const breadcrumbs = [
  { label: "Home", href: "/" },
  { label: "Activity Targets", href: "/" },
];

export default async function ActivityDetail({ params }: { params: Promise<Params> }) {
  const resolvedParams = await params;
  const activity = activities.find((item) => item.slug === resolvedParams.slug);
  if (!activity) return notFound();

  const showPartnerMatrix = activity.slug === "gov-non-gov-offline-activation";
  const liveStats = showPartnerMatrix ? await getGovNonGovStats() : null;
  const target = liveStats?.target ?? activity.target;
  const achieved = liveStats?.achieved ?? activity.achieved;

  const partnerMatrix = showPartnerMatrix ? await getPartnerActivationMatrix() : [];
  const partnerCRMData = showPartnerMatrix ? await getPartnerCRMData() : [];
  const govPartners = partnerMatrix.filter((item) => item.isGov);
  const nonGovPartners = partnerMatrix.filter((item) => !item.isGov);
  const progress = computeProgress(achieved, target);
  const remaining = Math.max(target - achieved, 0);

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          {breadcrumbs.map((crumb, idx) => (
            <div key={crumb.label} className="flex items-center gap-2">
              <Link href={crumb.href} className="font-semibold text-[#1f3c88] hover:underline">
                {crumb.label}
              </Link>
              {idx < breadcrumbs.length - 1 && <span>/</span>}
            </div>
          ))}
          <span className="font-semibold text-zinc-700">/ {activity.title}</span>
        </div>

        <header className="flex flex-col gap-3 border-b border-zinc-200 pb-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
                Activity Target Detail
              </p>
              <h1 className="text-3xl font-bold text-[#0f172a]">{activity.title}</h1>
              <p className="max-w-3xl text-sm text-zinc-600">{activity.description}</p>
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
          <p className="text-sm text-zinc-500">{activity.meta}</p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Trx Target</p>
            <p className="mt-2 text-3xl font-bold text-[#0f172a]">
              {formatNumber(target)} <span className="text-base font-semibold text-zinc-500">trx</span>
            </p>
            <p className="text-sm text-zinc-600">Rencana bulanan untuk channel ini.</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Pencapaian</p>
            <p className="mt-2 text-3xl font-bold text-[#0f5132]">
              {formatNumber(achieved)} <span className="text-base font-semibold text-zinc-500">trx</span>
            </p>
            <p className="text-sm text-zinc-600">Update terakhir progress channel.</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Sisa Target</p>
            <p className="mt-2 text-3xl font-bold text-[#d97706]">
              {formatNumber(remaining)} <span className="text-base font-semibold text-zinc-500">trx</span>
            </p>
            <p className="text-sm text-zinc-600">Harus dicapai untuk tembus target.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-[#0f5132]">Progress</p>
              <div className="flex items-center gap-3">
                <div className="relative h-2 flex-1 rounded-full bg-zinc-200">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[#1f3c88]"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <span className="text-base font-semibold text-[#1f3c88]">{progress}%</span>
              </div>
              <p className="text-sm text-zinc-600">
                {formatNumber(achieved)} trx dari {formatNumber(target)} trx target.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-[#f7f8fb] px-4 py-3 text-sm text-zinc-700">
                <p className="text-xs font-semibold uppercase text-zinc-500">Rumus target</p>
                <p className="mt-1 text-zinc-800">{activity.meta}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-[#f7f8fb] px-4 py-3 text-sm text-zinc-700">
                <p className="text-xs font-semibold uppercase text-zinc-500">Catatan eksekusi</p>
                <p className="mt-1 text-zinc-800">
                  Tambahkan milestone mingguan, channel owner, dan kebutuhan dukungan di sini.
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* CRM Partner Table */}
        {showPartnerMatrix && partnerCRMData.length > 0 && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1 border-b border-zinc-200 pb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
                Partner CRM Dashboard
              </p>
              <h2 className="text-lg font-semibold text-[#0f172a]">Daftar Partner Lengkap</h2>
              <p className="text-sm text-zinc-600">
                Monitor progres dan status semua partner channel activation.
              </p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="text-left py-3 px-2 font-semibold text-zinc-700">No</th>
                    <th className="text-left py-3 px-2 font-semibold text-zinc-700">Partner</th>
                    <th className="text-left py-3 px-2 font-semibold text-zinc-700">Tipe</th>
                    <th className="text-left py-3 px-2 font-semibold text-zinc-700">Kontak</th>
                    <th className="text-left py-3 px-2 font-semibold text-zinc-700">PIC MW</th>
                    <th className="text-left py-3 px-2 font-semibold text-zinc-700">Status</th>
                    <th className="text-left py-3 px-2 font-semibold text-zinc-700">Next to Do</th>
                    <th className="text-center py-3 px-2 font-semibold text-zinc-700">Actions</th>
                  </tr>
                </thead>
                <PartnerTable partnerCRMData={partnerCRMData} />
              </table>
            </div>
          </section>
        )}

        {showPartnerMatrix && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1 border-b border-zinc-200 pb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
                Gov & Non-Gov Offline Activation
              </p>
              <h2 className="text-lg font-semibold text-[#0f172a]">Matriks Partner</h2>
              <p className="text-sm text-zinc-600">
                Jumlah user unik, user terdaftar, dan user yang sudah memakai aplikasi per partner.
              </p>
            </div>
            <div className="mt-4 grid gap-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#0f172a]">Government</h3>
                  <span className="text-xs text-zinc-500">
                    {govPartners.length ? `${govPartners.length} partner` : "Tidak ada data"}
                  </span>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {govPartners.length === 0 ? (
                    <p className="text-sm text-zinc-600">Belum ada data untuk kategori ini.</p>
                  ) : (
                    govPartners.map((row) => <PartnerMetricCard key={`gov-${row.partner}`} row={row} />)
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#0f172a]">Non-Government</h3>
                  <span className="text-xs text-zinc-500">
                    {nonGovPartners.length ? `${nonGovPartners.length} partner` : "Tidak ada data"}
                  </span>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {nonGovPartners.length === 0 ? (
                    <p className="text-sm text-zinc-600">Belum ada data untuk kategori ini.</p>
                  ) : (
                    nonGovPartners.map((row) => (
                      <PartnerMetricCard key={`non-gov-${row.partner}`} row={row} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        

        <div className="flex flex-wrap gap-3 text-sm text-zinc-600">
          <Link
            href="/"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 font-semibold text-[#1f3c88] shadow-sm transition hover:border-[#1f3c88]"
          >
            Kembali ke daftar aktivitas
          </Link>
          <Link
            href="/weekly"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 font-semibold text-[#0f5132] shadow-sm transition hover:border-[#0f5132]"
          >
            Lihat funnel mingguan
          </Link>
        </div>
      </div>
    </main>
  );
}
