"use client";

import { useState, useEffect } from "react";

type FunnelRow = {
  channel: string;
  registered: number;
  trialUsers: number;
  paidUsers: number;
  activeUsers: number;
  repeatUsers: number;
};

type ChannelPerf = {
  channel: string;
  transactions: number;
  uniqueBuyers: number;
  revenueIdr: number;
};

type TrendPoint = {
  date: string;
  transactionCount: number;
  uniqueBuyers: number;
  revenueIdr: number;
};

type UsagePoint = {
  date: string;
  usageEvents: number;
  uniqueUsers: number;
  totalAmount: number;
};

type PartnerRow = {
  partnerName: string;
  referalCode: string;
  registeredUsers: number;
  buyingUsers: number;
  revenueIdr: number;
};

type DataHealth = {
  excludedEmailCount: number;
  cleanCustomerCount: number;
  totalTransactionsRaw: number;
  cleanTransactionCount: number;
};

type ExecutiveData = {
  funnel: FunnelRow[];
  channelPerformance: ChannelPerf[];
  revenueTrend: TrendPoint[];
  usageTrend: UsagePoint[];
  partnerLeaderboard: PartnerRow[];
  dataHealth: DataHealth;
  timestamp: string;
};

const fmt = (n: number | undefined | null) =>
  n != null ? n.toLocaleString("id-ID") : "-";

const fmtShortDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
};

const channelColors: Record<string, string> = {
  "impact-plus": "#1f3c88",
  "digital-activation": "#0891b2",
  "gov-non-gov-offline-activation": "#059669",
  "on-ground-activation": "#d97706",
  "mwx-academy": "#7c3aed",
  "webinar-berbayar": "#db2777",
  other: "#78716c",
};

const channelLabel: Record<string, string> = {
  "impact-plus": "Impact Plus",
  "digital-activation": "Digital Activation",
  "gov-non-gov-offline-activation": "Gov & Non-Gov",
  "on-ground-activation": "On Ground",
  "mwx-academy": "MWX Academy",
  "webinar-berbayar": "Webinar Berbayar",
  other: "Lainnya",
};

function MiniBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 truncate text-right text-zinc-600">{label}</span>
      <div className="h-3 flex-1 rounded-full bg-zinc-100">
        <div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-20 text-right font-medium text-zinc-800">{fmt(value)}</span>
    </div>
  );
}

function SimpleLine({ data, color }: { data: { date: string; value: number }[]; color: string; label?: string }) {
  if (data.length === 0) return <p className="py-6 text-center text-xs text-zinc-500">Belum ada data.</p>;
  const maxV = Math.max(...data.map((d) => d.value), 1);
  const pts = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * 100;
    const y = 100 - ((d.value / maxV) * 85 + 5);
    return `${x},${y}`;
  });
  return (
    <div className="h-48 w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <polyline fill="none" stroke={color} strokeWidth={2} points={pts.join(" ")} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((pt, i) => (
          <circle key={data[i].date} cx={pt.split(",")[0]} cy={pt.split(",")[1]} r={1.2} fill={color} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
        <span>{data.length > 0 ? fmtShortDate(data[0].date) : ""}</span>
        <span>{data.length > 0 ? fmtShortDate(data[data.length - 1].date) : ""}</span>
      </div>
    </div>
  );
}

export default function ExecutiveDeck() {
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/executive-deck");
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb]">
        <p className="text-sm text-zinc-500">Memuat data...</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb]">
        <p className="text-sm text-zinc-500">Gagal memuat data.</p>
      </main>
    );
  }

  const totalRegistered = data.funnel.reduce((s, r) => s + r.registered, 0);
  const totalPaid = data.funnel.reduce((s, r) => s + r.paidUsers, 0);
  const totalTrial = data.funnel.reduce((s, r) => s + r.trialUsers, 0);
  const totalActive = data.funnel.reduce((s, r) => s + r.activeUsers, 0);
  const totalRepeat = data.funnel.reduce((s, r) => s + r.repeatUsers, 0);
  const totalRevenue = data.channelPerformance.reduce((s, r) => s + r.revenueIdr, 0);
  const funnelConversion = totalRegistered > 0 ? ((totalPaid / totalRegistered) * 100).toFixed(1) : "0.0";

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1f3c88]">Executive Deck</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Data bersih (excluded email &bull; sinkronasi{" "}
              {data.timestamp
                ? new Date(data.timestamp).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
                : "-"}
              )
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Conversion Rate: {funnelConversion}%
          </span>
        </header>

        {/* Row 1 — KPI Cards */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            { label: "Total User", value: totalRegistered, color: "#1f3c88" },
            { label: "Free Trial", value: totalTrial, color: "#7c3aed" },
            { label: "Pernah Bayar", value: totalPaid, color: "#0891b2" },
            { label: "User Aktif (30h)", value: totalActive, color: "#059669" },
            { label: "Repeat Buyer", value: totalRepeat, color: "#d97706" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{k.label}</p>
              <p className="mt-2 text-3xl font-bold" style={{ color: k.color }}>{fmt(k.value)}</p>
            </div>
          ))}
        </section>

        {/* Row 2 — Revenue KPI */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total Revenue (IDR)</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">Rp {fmt(totalRevenue)}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total Transaksi</p>
            <p className="mt-2 text-3xl font-bold text-[#1f3c88]">
              {fmt(data.revenueTrend.reduce((s, r) => s + r.transactionCount, 0))}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Data Health</p>
            <p className="mt-2 text-3xl font-bold text-zinc-800">{fmt(data.dataHealth.cleanCustomerCount)}</p>
            <p className="mt-1 text-[11px] text-zinc-500">
              {fmt(data.dataHealth.excludedEmailCount)} email ter-exclude
            </p>
          </div>
        </section>

        {/* Row 3 — User Funnel */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-600">User Funnel per Channel</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="pb-2 font-medium">Channel</th>
                  <th className="pb-2 font-medium">Registered</th>
                  <th className="pb-2 font-medium">Free Trial</th>
                  <th className="pb-2 font-medium">Pernah Bayar</th>
                  <th className="pb-2 font-medium">Aktif (30h)</th>
                  <th className="pb-2 font-medium">Repeat</th>
                  <th className="pb-2 font-medium">Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.funnel.map((r) => {
                  const conv = r.registered > 0 ? ((r.paidUsers / r.registered) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={r.channel} className="border-b border-zinc-100">
                      <td className="py-3 font-medium text-zinc-800">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: channelColors[r.channel] || "#78716c" }} />
                        <span className="ml-2">{channelLabel[r.channel] || r.channel}</span>
                      </td>
                      <td className="py-3">{fmt(r.registered)}</td>
                      <td className="py-3">{fmt(r.trialUsers)}</td>
                      <td className="py-3">{fmt(r.paidUsers)}</td>
                      <td className="py-3">{fmt(r.activeUsers)}</td>
                      <td className="py-3">{fmt(r.repeatUsers)}</td>
                      <td className="py-3 font-semibold">{conv}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Row 4 — Channel Performance */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-600">
              Channel Performance &mdash; Revenue
            </h2>
            <div className="flex flex-col gap-2">
              {data.channelPerformance.map((c) => (
                <MiniBar
                  key={c.channel}
                  label={channelLabel[c.channel] || c.channel}
                  value={c.revenueIdr}
                  max={data.channelPerformance[0]?.revenueIdr || 1}
                  color={channelColors[c.channel] || "#78716c"}
                />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-600">
              Channel &mdash; Transaksi &amp; Pembeli
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="pb-2 font-medium">Channel</th>
                    <th className="pb-2 font-medium">Trx</th>
                    <th className="pb-2 font-medium">Pembeli</th>
                    <th className="pb-2 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.channelPerformance.map((c) => (
                    <tr key={c.channel} className="border-b border-zinc-100">
                      <td className="py-2 font-medium text-zinc-800">{channelLabel[c.channel] || c.channel}</td>
                      <td className="py-2">{fmt(c.transactions)}</td>
                      <td className="py-2">{fmt(c.uniqueBuyers)}</td>
                      <td className="py-2 font-semibold">Rp {fmt(c.revenueIdr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Row 5 — Trends */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-600">Revenue Trends (120 hari)</h2>
            <SimpleLine
              data={data.revenueTrend.map((r) => ({ date: r.date, value: r.revenueIdr }))}
              color="#059669"
              label="Revenue IDR"
            />
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-600">Usage Trends (120 hari)</h2>
            <SimpleLine
              data={data.usageTrend.map((r) => ({ date: r.date, value: r.uniqueUsers }))}
              color="#0891b2"
              label="Unique Users"
            />
          </div>
        </section>

        {/* Row 6 — Partner Leaderboard */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-600">
            Partner Leaderboard &mdash; Top 20
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Partner</th>
                  <th className="pb-2 font-medium">Kode</th>
                  <th className="pb-2 font-medium">Registered</th>
                  <th className="pb-2 font-medium">Buying</th>
                  <th className="pb-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.partnerLeaderboard.map((p, i) => (
                  <tr key={p.referalCode} className="border-b border-zinc-100">
                    <td className="py-2 text-zinc-400">{i + 1}</td>
                    <td className="py-2 font-medium text-zinc-800">{p.partnerName}</td>
                    <td className="py-2 text-zinc-500">{p.referalCode}</td>
                    <td className="py-2">{fmt(p.registeredUsers)}</td>
                    <td className="py-2">{fmt(p.buyingUsers)}</td>
                    <td className="py-2 font-semibold">Rp {fmt(p.revenueIdr)}</td>
                  </tr>
                ))}
                {data.partnerLeaderboard.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-zinc-500">Belum ada data partner.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
