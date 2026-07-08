"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Campaign = {
  id: number;
  name: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  status: string;
  total_recipients: number;
  scheduled_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  error_message: string | null;
};

type Template = {
  id: number;
  name: string;
  subject: string;
  variables: string[];
  created_at: string;
};

type RecipientUser = {
  guid: string;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  partner: string | null;
  created_at: string;
};

type RecipientData = {
  total: number;
  totalAvailable: number;
  users: RecipientUser[];
  partnerStats: { partner: string; count: number }[];
  page: { limit: number; offset: number };
  filters: Record<string, string>;
};

type RecipientFilters = {
  partner: string;
  date_from: string;
  date_to: string;
  status: string;
  event_id: string;
  recent_days: string;
  search: string;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280",
  scheduled: "#eab308",
  sending: "#3b82f6",
  sent: "#22c55e",
  failed: "#ef4444",
  cancelled: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  has_transaction: "Pernah Transaksi (via Credit Manager)",
  no_transaction: "Belum Pernah Transaksi",
  subscribed: "Sedang Subscribe (Active)",
  unsubscribed: "Tidak Subscribe",
};

export default function EmailCampaignsPage() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("id");

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formSenderName, setFormSenderName] = useState("MWX Market");
  const [formSenderEmail, setFormSenderEmail] = useState("noreply@mwxmarket.ai");
  const [formTemplate, setFormTemplate] = useState("");
  const [formHtml, setFormHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");
  const [sending, setSending] = useState(false);

  // Recipient filters
  const [filters, setFilters] = useState<RecipientFilters>({
    partner: "",
    date_from: "",
    date_to: "",
    status: "",
    event_id: "",
    recent_days: "",
    search: "",
  });
  const [recipientData, setRecipientData] = useState<RecipientData | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Available events for event filter
  const [events, setEvents] = useState<{ id: number; name: string }[]>(([]));

  // Detail view
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
  const [detailRecipients, setDetailRecipients] = useState<any[]>([]);
  const [detailStats, setDetailStats] = useState<any[]>([]);

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
    fetchEvents();
  }, []);

  useEffect(() => {
    if (campaignId) {
      fetchCampaignDetail(parseInt(campaignId));
      setShowCreateForm(false);
    } else {
      setDetailCampaign(null);
    }
  }, [campaignId]);

  // Track current offset for pagination
  const [currentOffset, setCurrentOffset] = useState(0);

  // Fetch recipients whenever filters change
  const fetchRecipients = useCallback(async (resetOffset = true) => {
    setLoadingRecipients(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      const offset = resetOffset ? 0 : currentOffset;
      if (offset > 0) params.set("offset", String(offset));
      if (filters.partner) params.set("partner", filters.partner);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);
      if (filters.status) params.set("status", filters.status);
      if (filters.event_id) params.set("event_id", filters.event_id);
      if (filters.recent_days) params.set("recent_days", filters.recent_days);
      if (filters.search) params.set("search", filters.search);

      const res = await fetch(`/api/email/recipients?${params}`);
      const json = await res.json();
      setRecipientData(json);
      if (json.page) setCurrentOffset(json.page.offset);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRecipients(false);
    }
  }, [filters]);

  async function fetchCampaigns() {
    try {
      const res = await fetch("/api/email/campaigns");
      const json = await res.json();
      setCampaigns(json.campaigns || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/email/templates");
      const json = await res.json();
      setTemplates(json.templates || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchEvents() {
    try {
      const res = await fetch("/api/events");
      const json = await res.json();
      if (json.events) {
        setEvents(json.events.map((e: any) => ({ id: e.id, name: e.nama || e.name })));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchCampaignDetail(id: number) {
    try {
      const res = await fetch(`/api/email/campaigns?id=${id}`);
      const json = await res.json();
      setDetailCampaign(json.campaign);
      setDetailRecipients(json.recipients || []);
      setDetailStats(json.recipientStats || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleTemplateSelect(templateId: string) {
    setFormTemplate(templateId);
    if (!templateId) return;
    try {
      const res = await fetch(`/api/email/templates?id=${templateId}`);
      const json = await res.json();
      if (json.template) {
        setFormSubject(json.template.subject);
        setFormHtml(json.template.html_content);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function updateFilter(key: keyof RecipientFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({
      partner: "",
      date_from: "",
      date_to: "",
      status: "",
      event_id: "",
      recent_days: "",
      search: "",
    });
    setRecipientData(null);
  }

  function hasActiveFilters(): boolean {
    return Object.values(filters).some((v) => v !== "");
  }

  function getFilterDescription(): string {
    const parts: string[] = [];
    if (filters.partner) parts.push(`Partner: ${filters.partner}`);
    if (filters.status) parts.push(STATUS_LABELS[filters.status] || filters.status);
    if (filters.recent_days) parts.push(`${filters.recent_days} hari terakhir`);
    if (filters.date_from) parts.push(`Dari ${filters.date_from}`);
    if (filters.date_to) parts.push(`Sampai ${filters.date_to}`);
    if (filters.event_id) {
      const ev = events.find((e) => String(e.id) === filters.event_id);
      if (ev) parts.push(`Event: ${ev.name}`);
    }
    if (filters.search) parts.push(`Cari: "${filters.search}"`);
    return parts.length > 0 ? parts.join(", ") : "Semua customer (dengan email)";
  }

  async function handleCreateCampaign() {
    if (!formName || !formSubject || !formHtml) {
      setResult("Name, Subject, dan HTML Body harus diisi.");
      return;
    }
    if (!recipientData || recipientData.total === 0) {
      setResult("Tidak ada recipient yang dipilih. Set filter dan klik 'Hitung & Preview'.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/email/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          subject: formSubject,
          sender_name: formSenderName,
          sender_email: formSenderEmail,
          template_id: formTemplate ? parseInt(formTemplate) : null,
          html_body: formHtml,
          recipient_filter: { ...filters },
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setResult(`✅ Campaign "${json.campaign.name}" created! ID: ${json.campaign.id}. Sekarang bisa dikirim.`);
        fetchCampaigns();
        // Reset form
        setFormName("");
        setFormSubject("");
        setFormHtml("");
        setRecipientData(null);
        clearFilters();
      } else {
        setResult(`❌ ${JSON.stringify(json)}`);
      }
    } catch (err: any) {
      setResult(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendCampaign(id: number) {
    const total = detailCampaign?.total_recipients || 0;
    if (!confirm(`Yakin ingin mengirim campaign ini ke ${total.toLocaleString()} recipient?`)) return;
    setSending(true);
    try {
      const res = await fetch(`/api/email/campaigns/${id}?action=send`, { method: "POST" });
      const json = await res.json();
      setResult(JSON.stringify(json, null, 2));
      fetchCampaigns();
      if (campaignId) fetchCampaignDetail(id);
    } catch (err: any) {
      setResult(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteCampaign(id: number) {
    if (!confirm("Hapus campaign ini?")) return;
    try {
      await fetch(`/api/email/campaigns?id=${id}`, { method: "DELETE" });
      fetchCampaigns();
      setDetailCampaign(null);
    } catch (err) {
      console.error(err);
    }
  }

  // ====== RENDER: Campaign Detail View ======
  if (detailCampaign) {
    const statMap: Record<string, number> = {};
    detailStats.forEach((s: any) => {
      statMap[s.send_status] = parseInt(s.count);
    });

    return (
      <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
        <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
          <header className="flex flex-col gap-2 border-b border-zinc-200 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/email/campaigns" onClick={() => setDetailCampaign(null)} className="text-xs font-medium text-[#1f3c88] hover:underline">&larr; Back to Campaigns</Link>
                <h1 className="mt-1 text-2xl font-bold text-[#0f172a]">{detailCampaign.name}</h1>
                <p className="text-sm text-zinc-600">{detailCampaign.subject}</p>
              </div>
              <div className="flex gap-2">
                {detailCampaign.status === "draft" && (
                  <button
                    onClick={() => handleSendCampaign(detailCampaign.id)}
                    disabled={sending}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {sending ? "Sending..." : "🚀 Send Now"}
                  </button>
                )}
                {detailCampaign.status !== "sent" && (
                  <button
                    onClick={() => handleDeleteCampaign(detailCampaign.id)}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Campaign Info Cards */}
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Status</p>
              <p className="mt-1 text-lg font-bold" style={{ color: STATUS_COLORS[detailCampaign.status] }}>{detailCampaign.status}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Total Recipients</p>
              <p className="mt-1 text-lg font-bold text-[#0f172a]">{(detailCampaign.total_recipients || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Sender</p>
              <p className="mt-1 text-sm font-medium text-[#0f172a]">{detailCampaign.sender_name}</p>
              <p className="text-xs text-zinc-500">{detailCampaign.sender_email}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Created</p>
              <p className="mt-1 text-sm font-medium text-[#0f172a]">
                {new Date(detailCampaign.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </section>

          {/* Delivery Stats */}
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-zinc-700">Delivery Stats</h2>
            <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
              {["pending", "sent", "delivered", "opened", "clicked", "failed"].map((status) => (
                <div key={status} className="rounded-lg bg-zinc-50 p-3 text-center">
                  <p className="text-xs font-medium capitalize text-zinc-500">{status}</p>
                  <p className="mt-1 text-xl font-bold text-[#0f172a]">{statMap[status] || 0}</p>
                </div>
              ))}
            </div>
          </section>

          {detailCampaign.error_message && (
            <section className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase text-red-600">Error</p>
              <p className="mt-1 text-sm text-red-700">{detailCampaign.error_message}</p>
            </section>
          )}

          {/* Recipients List */}
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-zinc-700">Recipients (last 500)</h2>
            {detailRecipients.length === 0 ? (
              <p className="text-sm text-zinc-400">Belum ada recipient</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="py-2 pr-3 text-left font-semibold text-zinc-700">Email</th>
                      <th className="py-2 pr-3 text-left font-semibold text-zinc-700">Name</th>
                      <th className="py-2 pr-3 text-left font-semibold text-zinc-700">Status</th>
                      <th className="py-2 pr-3 text-left font-semibold text-zinc-700">Sent At</th>
                      <th className="py-2 pr-3 text-left font-semibold text-zinc-700">Opened</th>
                      <th className="py-2 text-left font-semibold text-zinc-700">Clicked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRecipients.map((r: any) => (
                      <tr key={r.id} className="border-b border-zinc-100">
                        <td className="py-2 pr-3 text-zinc-800">{r.email}</td>
                        <td className="py-2 pr-3 text-zinc-600">{r.full_name || "-"}</td>
                        <td className="py-2 pr-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.send_status === "sent" || r.send_status === "delivered" ? "bg-green-100 text-green-700" :
                            r.send_status === "opened" ? "bg-blue-100 text-blue-700" :
                            r.send_status === "clicked" ? "bg-purple-100 text-purple-700" :
                            r.send_status === "failed" || r.send_status === "bounced" ? "bg-red-100 text-red-700" :
                            "bg-zinc-100 text-zinc-700"
                          }`}>
                            {r.send_status}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-xs text-zinc-500">{r.sent_at ? new Date(r.sent_at).toLocaleString("id-ID") : "-"}</td>
                        <td className="py-2 pr-3 text-xs text-zinc-500">{r.opened_at ? "✅" : "-"}</td>
                        <td className="py-2 text-xs text-zinc-500">{r.clicked_at ? "✅" : "-"}</td>
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

  // ====== RENDER: Campaign List + Create Form ======
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-2 border-b border-zinc-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">Email Marketing</p>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#0f172a]">Email Campaigns</h1>
              <p className="max-w-3xl text-sm text-zinc-600">Buat campaign, pilih penerima dengan filter, lalu kirim email blast.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/email" className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Dashboard</Link>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="rounded-lg bg-[#1f3c88] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f3c88]/90"
              >
                {showCreateForm ? "Cancel" : "+ New Campaign"}
              </button>
            </div>
          </div>
        </header>

        {/* ====== CREATE FORM ====== */}
        {showCreateForm && (
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-lg font-bold text-[#0f172a]">📧 Buat Campaign Baru</h2>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* LEFT: Content */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-zinc-700 border-b border-zinc-100 pb-2">1. Konten Email</h3>

                {/* Template Select */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Pilih Template (Opsional)</label>
                  <select
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                    value={formTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                  >
                    <option value="">-- Buat dari Awal --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} - {t.subject}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Nama Campaign *</label>
                    <input
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Promo Juli 2026"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Subject Email *</label>
                    <input
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      placeholder="e.g. Promo Spesial Bulan Ini, {{nama}}!"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Sender Name</label>
                    <input
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                      value={formSenderName}
                      onChange={(e) => setFormSenderName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Sender Email</label>
                    <input
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                      value={formSenderEmail}
                      onChange={(e) => setFormSenderEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    HTML Body *
                    <span className="ml-2 text-xs text-zinc-400">
                      ({'{{nama}}'}, {'{{email}}'}, {'{{phone}}'})
                    </span>
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono focus:border-[#1f3c88] focus:outline-none"
                    rows={14}
                    value={formHtml}
                    onChange={(e) => setFormHtml(e.target.value)}
                    placeholder={`<h1>Halo {{nama}}!</h1>\n<p>Ini adalah email blast dari MWX Market.</p>`}
                  />
                </div>
              </div>

              {/* RIGHT: Recipient Selection */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-zinc-700 border-b border-zinc-100 pb-2">2. Pilih Penerima</h3>

                {/* Partner Filter */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Berdasarkan Partner</label>
                  <select
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                    value={filters.partner}
                    onChange={(e) => updateFilter("partner", e.target.value)}
                  >
                    <option value="">Semua Partner</option>
                    {recipientData?.partnerStats?.map((p) => (
                      <option key={p.partner} value={p.partner}>
                        {p.partner} ({p.count.toLocaleString()} users)
                      </option>
                    ))}
                    {/* Fallback static list */}
                    {!recipientData?.partnerStats && ["MV", "DSA", "MB", "AV", "SK"].map((p) => (
                      <option key={p} value={p}>Partner {p}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Berdasarkan Status</label>
                  <select
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                    value={filters.status}
                    onChange={(e) => updateFilter("status", e.target.value)}
                  >
                    <option value="">Semua Status</option>
                    <option value="has_transaction">✅ Pernah Transaksi (Credit Manager)</option>
                    <option value="no_transaction">⏳ Belum Pernah Transaksi</option>
                    <option value="subscribed">⭐ Sedang Subscribe</option>
                    <option value="unsubscribed">🚫 Tidak Subscribe</option>
                  </select>
                </div>

                {/* Recent Days */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Berdasarkan Waktu Registrasi</label>
                  <div className="flex gap-2">
                    {["7", "30", "90"].map((days) => (
                      <button
                        key={days}
                        onClick={() => updateFilter("recent_days", filters.recent_days === days ? "" : days)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition flex-1 ${
                          filters.recent_days === days
                            ? "border-[#1f3c88] bg-[#eef2ff] text-[#1f3c88]"
                            : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        }`}
                      >
                        {days} hari
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Dari Tanggal</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                      value={filters.date_from}
                      onChange={(e) => updateFilter("date_from", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Sampai Tanggal</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                      value={filters.date_to}
                      onChange={(e) => updateFilter("date_to", e.target.value)}
                    />
                  </div>
                </div>

                {/* Event Filter */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Berdasarkan Event</label>
                  <select
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                    value={filters.event_id}
                    onChange={(e) => updateFilter("event_id", e.target.value)}
                  >
                    <option value="">Semua (tanpa filter event)</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.name}</option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Cari Spesifik (Nama/Email)</label>
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                    value={filters.search}
                    onChange={(e) => updateFilter("search", e.target.value)}
                    placeholder="Ketik nama atau email..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => fetchRecipients()}
                    disabled={loadingRecipients}
                    className="flex-1 rounded-lg bg-[#1f3c88] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1f3c88]/90 disabled:opacity-50"
                  >
                    {loadingRecipients ? "Loading..." : "🔍 Hitung & Preview"}
                  </button>
                  {hasActiveFilters() && (
                    <button
                      onClick={clearFilters}
                      className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Result Summary */}
                {recipientData && (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-sm font-semibold text-emerald-800">
                      📊 {recipientData.total.toLocaleString()} penerima
                    </p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Dari {recipientData.totalAvailable.toLocaleString()} total customer dengan email
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Filter: {getFilterDescription()}
                    </p>

                    {/* Sample users */}
                    {recipientData.users.length > 0 && (
                      <div className="mt-3 border-t border-emerald-200 pt-3">
                        <p className="text-xs font-medium text-zinc-600 mb-2">Sample penerima:</p>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {recipientData.users.slice(0, 15).map((u) => (
                            <div key={u.guid || u.email} className="flex items-center gap-2 text-xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                              <span className="text-zinc-700">{u.full_name || "—"}</span>
                              <span className="text-zinc-400">{u.email}</span>
                              {u.partner && (
                                <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px]">{u.partner}</span>
                              )}
                            </div>
                          ))}
                          {recipientData.total > 15 && (
                            <p className="text-xs text-zinc-400 pt-1">...dan {recipientData.total - 15} lainnya</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {recipientData && recipientData.total > recipientData.page.limit && (
                  <div className="flex items-center justify-between text-xs text-zinc-600">
                    <button
                      onClick={() => fetchRecipients()}
                      disabled={loadingRecipients}
                      className="font-medium text-[#1f3c88] hover:underline disabled:opacity-50"
                    >
                      ↻ Refresh
                    </button>
                    <span>
                      Menampilkan {recipientData.users.length} dari {recipientData.total.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button & Result */}
            <div className="mt-6 flex flex-col gap-3 border-t border-zinc-200 pt-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCreateCampaign}
                  disabled={saving || !recipientData || recipientData.total === 0}
                  className="rounded-lg bg-[#1f3c88] px-8 py-2.5 text-sm font-semibold text-white hover:bg-[#1f3c88]/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "💾 Simpan Campaign (Draft)"}
                </button>
                {(!recipientData || recipientData.total === 0) && (
                  <span className="text-xs text-amber-600">⚠️ Klik "Hitung & Preview" dulu untuk memilih penerima</span>
                )}
              </div>
              {result && (
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3">
                  <pre className="whitespace-pre-wrap text-xs text-zinc-700">{result}</pre>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ====== CAMPAIGN LIST ====== */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-700">All Campaigns</h2>

          {campaigns.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-zinc-400">
              Belum ada campaign. Buat campaign baru untuk memulai.
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
                    <th className="py-3 pr-4 text-left font-semibold text-zinc-700">Sent</th>
                    <th className="py-3 text-left font-semibold text-zinc-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="py-3 pr-4 font-medium text-zinc-900">{c.name}</td>
                      <td className="py-3 pr-4 max-w-[200px] truncate text-zinc-600">{c.subject}</td>
                      <td className="py-3 pr-4 text-zinc-700">{(c.total_recipients || 0).toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                          style={{ backgroundColor: `${STATUS_COLORS[c.status] || "#6b7280"}20`, color: STATUS_COLORS[c.status] || "#6b7280" }}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-zinc-500">
                        {new Date(c.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </td>
                      <td className="py-3 pr-4 text-xs text-zinc-500">
                        {c.sent_at ? new Date(c.sent_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "-"}
                      </td>
                      <td className="py-3">
                        <Link href={`/email/campaigns?id=${c.id}`} className="mr-2 text-xs font-medium text-[#1f3c88] hover:underline">Detail</Link>
                        {c.status === "draft" && (
                          <button onClick={() => handleSendCampaign(c.id)} className="text-xs font-medium text-emerald-600 hover:underline">Send</button>
                        )}
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
