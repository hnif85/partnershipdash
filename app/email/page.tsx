"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

type EmailStats = {
  totalCampaigns: number;
  sentCampaigns: number;
  totalRecipients: number;
  totalSent: number;
  totalFailed: number;
  totalOpened: number;
  totalClicked: number;
  openRate: string;
  clickRate: string;
  totalCustomers: number;
  smtpConfigured: boolean;
};

type Campaign = {
  id: number;
  name: string;
  subject: string;
  status: string;
  total_recipients: number;
  created_at: string;
  sent_at: string | null;
  completed_at: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280",
  scheduled: "#eab308",
  sending: "#3b82f6",
  sent: "#22c55e",
  failed: "#ef4444",
  cancelled: "#6b7280",
};

const PIE_COLORS = ["#22c55e", "#ef4444", "#eab308", "#6b7280", "#3b82f6"];

export default function EmailDashboardPage() {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/email");
      const json = await res.json();
      setStats(json.stats);
      setCampaigns(json.recentCampaigns || []);
    } catch (err) {
      console.error("Failed to fetch email stats:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1f3c88] border-t-transparent"></div>
        </div>
      </main>
    );
  }

  const statusData = [
    { name: "Sent", value: stats?.totalSent || 0 },
    { name: "Failed", value: stats?.totalFailed || 0 },
    { name: "Opened", value: stats?.totalOpened || 0 },
    { name: "Clicked", value: stats?.totalClicked || 0 },
  ];

  const campaignStatusData = Object.entries(
    campaigns.reduce((acc: Record<string, number>, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        {/* Header */}
        <header className="flex flex-col gap-2 border-b border-zinc-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">Email Marketing</p>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#0f172a]">Email Blast Dashboard</h1>
              <p className="mt-1 max-w-3xl text-sm text-zinc-600">
                Kirim email blast ke customer, pantau performa campaign, dan kelola template email.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/email/templates"
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Template
              </Link>
              <Link
                href="/email/settings"
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                SMTP Settings
              </Link>
              <Link
                href="/email/campaigns"
                className="rounded-lg bg-[#1f3c88] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f3c88]/90"
              >
                + New Campaign
              </Link>
            </div>
          </div>

          {/* SMTP Warning */}
          {!stats?.smtpConfigured && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <svg className="h-5 w-5 flex-shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">SMTP Belum Dikonfigurasi</p>
                <p className="text-xs text-amber-700">Konfigurasi SMTP settings sebelum mengirim email blast.</p>
              </div>
              <Link
                href="/email/settings"
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Configure Now
              </Link>
            </div>
          )}
        </header>

        {/* Stats Cards */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Total Campaigns</p>
            <p className="mt-2 text-3xl font-bold text-[#0f172a]">{stats?.totalCampaigns || 0}</p>
            <p className="mt-1 text-sm text-zinc-500">
              {stats?.sentCampaigns || 0} sent
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Total Recipients</p>
            <p className="mt-2 text-3xl font-bold text-[#0f172a]">{(stats?.totalRecipients || 0).toLocaleString()}</p>
            <p className="mt-1 text-sm text-zinc-500">
              {(stats?.totalCustomers || 0).toLocaleString()} available
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Open Rate</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{stats?.openRate || "0"}%</p>
            <p className="mt-1 text-sm text-zinc-500">
              {stats?.totalOpened || 0} opened of {stats?.totalSent || 0} sent
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Click Rate</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{stats?.clickRate || "0"}%</p>
            <p className="mt-1 text-sm text-zinc-500">
              {stats?.totalClicked || 0} clicked
            </p>
          </div>
        </section>

        {/* Charts */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Campaign Status Distribution */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-zinc-700">Campaign Status Distribution</h2>
            {campaignStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={campaignStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {campaignStatusData.map((entry, index) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-zinc-400">
                Belum ada campaign
              </div>
            )}
          </div>

          {/* Email Performance */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-zinc-700">Delivery Performance</h2>
            {statusData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1f3c88" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-zinc-400">
                Belum ada data pengiriman
              </div>
            )}
          </div>
        </section>

        {/* Recent Campaigns */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">Recent Campaigns</h2>
            <Link
              href="/email/campaigns"
              className="text-xs font-medium text-[#1f3c88] hover:underline"
            >
              View All
            </Link>
          </div>

          {campaigns.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-zinc-400">
              <div className="text-center">
                <p>Belum ada campaign</p>
                <Link
                  href="/email/campaigns"
                  className="mt-2 inline-block text-sm font-medium text-[#1f3c88] hover:underline"
                >
                  Buat campaign pertama
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="py-3 pr-4 text-left font-semibold text-zinc-700">Name</th>
                    <th className="py-3 pr-4 text-left font-semibold text-zinc-700">Subject</th>
                    <th className="py-3 pr-4 text-left font-semibold text-zinc-700">Recipients</th>
                    <th className="py-3 pr-4 text-left font-semibold text-zinc-700">Status</th>
                    <th className="py-3 pr-4 text-left font-semibold text-zinc-700">Created</th>
                    <th className="py-3 text-left font-semibold text-zinc-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="py-3 pr-4 font-medium text-zinc-900">{c.name}</td>
                      <td className="py-3 pr-4 text-zinc-600 max-w-[200px] truncate">{c.subject}</td>
                      <td className="py-3 pr-4 text-zinc-700">{c.total_recipients || 0}</td>
                      <td className="py-3 pr-4">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                          style={{
                            backgroundColor: `${STATUS_COLORS[c.status] || "#6b7280"}20`,
                            color: STATUS_COLORS[c.status] || "#6b7280",
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-zinc-500 text-xs">
                        {new Date(c.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/email/campaigns?id=${c.id}`}
                          className="text-xs font-medium text-[#1f3c88] hover:underline"
                        >
                          Detail
                        </Link>
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
