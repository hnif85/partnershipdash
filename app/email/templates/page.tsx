"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Template = {
  id: number;
  name: string;
  subject: string;
  html_content: string;
  plain_text: string | null;
  variables: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #1f3c88; }
    .header h1 { color: #1f3c88; margin: 0; font-size: 24px; }
    .content { padding: 30px 0; line-height: 1.6; color: #333333; }
    .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e0e0e0; font-size: 12px; color: #888888; }
    .button { display: inline-block; padding: 12px 30px; background-color: #1f3c88; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MWX Market</h1>
    </div>
    <div class="content">
      <h2>Halo {{nama}}!</h2>
      <p>Terima kasih telah menjadi bagian dari MWX Market.</p>
      <p>Ini adalah email otomatis dari sistem kami.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a class="button" href="https://mwxmarket.ai">Kunjungi MWX Market</a>
      </p>
      <p>Salam hangat,<br>Tim MWX Market</p>
    </div>
    <div class="footer">
      <p>MWX Market &copy; 2026. All rights reserved.</p>
      <p>Email ini dikirim secara otomatis, mohon tidak membalas email ini.</p>
    </div>
  </div>
</body>
</html>`;

const DEFAULT_PLAIN = `Halo {{nama}},

Terima kasih telah menjadi bagian dari MWX Market.

Ini adalah email otomatis dari sistem kami.

Kunjungi MWX Market: https://mwxmarket.ai

Salam hangat,
Tim MWX Market`;

const AI_PROMPT_SUGGESTIONS = [
  "Buat email promosi untuk promo akhir tahun dengan diskon 50% untuk semua produk UMKM",
  "Buat email sambutan untuk user baru yang baru mendaftar di MWX Market",
  "Buat email re-engagement untuk user yang sudah 30 hari tidak login",
  "Buat email newsletter bulanan berisi tips bisnis UMKM dan update fitur terbaru",
  "Buat email pemberitahuan bahwa poin reward user akan segera kedaluwarsa",
  "Buat email undangan webinar gratis tentang strategi pemasaran digital untuk UMKM",
  "Buat email konfirmasi setelah user melakukan pembelian di MWX Market",
  "Buat email pengingat untuk menyelesaikan pendaftaran (cart abandonment)",
  "Buat email testimonial yang menampilkan kisah sukses UMKM binaan MWX",
  "Buat email ucapan ulang tahun untuk member dengan voucher spesial",
];

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual");

  // Form
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formHtml, setFormHtml] = useState(DEFAULT_HTML);
  const [formPlain, setFormPlain] = useState(DEFAULT_PLAIN);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");

  // AI Generator
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("professional");
  const [aiCompany, setAiCompany] = useState("MWX Market");
  const [aiIncludeUnsubscribe, setAiIncludeUnsubscribe] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/email/templates");
      const json = await res.json();
      setTemplates(json.templates || []);
    } catch (err) {
      console.error(err);
    }
  }

  function startEdit(t: Template) {
    setEditId(t.id);
    setFormName(t.name);
    setFormSubject(t.subject);
    setFormHtml(t.html_content);
    setFormPlain(t.plain_text || "");
    setShowCreate(true);
    setActiveTab("manual");
    setPreviewHtml(t.html_content.replace(/\{\{(\w+)\}\}/g, (_, key) => `[${key}]`));
  }

  function startNew() {
    setEditId(null);
    setFormName("");
    setFormSubject("");
    setFormHtml(DEFAULT_HTML);
    setFormPlain(DEFAULT_PLAIN);
    setShowCreate(true);
    setActiveTab("manual");
    setPreviewHtml("");
    setAiPrompt("");
    setAiError("");
  }

  function previewCurrentHtml() {
    const preview = formHtml.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const sampleValues: Record<string, string> = {
        nama: "Budi Santoso",
        email: "budi@email.com",
        phone: "08123456789",
        partner: "MV",
        guid: "abc-123-def",
        created_at: "1 Juli 2026",
        unsubscribe_url: "https://mwxmarket.ai/unsubscribe?token=xxx",
      };
      return sampleValues[key] || `[${key}]`;
    });
    setPreviewHtml(preview);
  }

  async function handleSave() {
    if (!formName || !formSubject || !formHtml) {
      setResult("Name, Subject, dan HTML content harus diisi.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          subject: formSubject,
          html_content: formHtml,
          plain_text: formPlain || null,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setResult(`Template "${json.template.name}" saved!`);
        fetchTemplates();
        setShowCreate(false);
        setEditId(null);
      } else {
        setResult(JSON.stringify(json));
      }
    } catch (err: any) {
      setResult(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus template ini?")) return;
    try {
      await fetch(`/api/email/templates?id=${id}`, { method: "DELETE" });
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) {
      setAiError("Masukkan deskripsi email yang ingin dibuat.");
      return;
    }

    setAiGenerating(true);
    setAiError("");

    try {
      const res = await fetch("/api/email/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          tone: aiTone,
          company_name: aiCompany,
          include_unsubscribe: aiIncludeUnsubscribe,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setAiError(json.error || "Gagal generate template. Coba lagi.");
        return;
      }

      // Auto-fill form with generated content
      if (json.html) {
        setFormHtml(json.html);
      }
      if (json.plain_text) {
        setFormPlain(json.plain_text);
      }
      if (json.subject_line) {
        setFormSubject(json.subject_line);
      }
      // Auto-generate template name from prompt
      const nameFromPrompt = aiPrompt
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(" ")
        .slice(0, 6)
        .join("_");
      setFormName(`ai_${nameFromPrompt}_${Date.now().toString(36)}`);

      // Preview the generated HTML
      const preview = json.html.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
        const sampleValues: Record<string, string> = {
          nama: "Budi Santoso",
          email: "budi@email.com",
          phone: "08123456789",
          partner: "MV",
          guid: "abc-123-def",
          created_at: "1 Juli 2026",
          unsubscribe_url: "https://mwxmarket.ai/unsubscribe?token=xxx",
        };
        return sampleValues[key] || `[${key}]`;
      });
      setPreviewHtml(preview);

      setResult("✅ Template berhasil di-generate oleh AI! Silakan review, edit jika perlu, lalu simpan.");
    } catch (err: any) {
      setAiError(err.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setAiGenerating(false);
    }
  }

  function applySuggestion(suggestion: string) {
    setAiPrompt(suggestion);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-2 border-b border-zinc-200 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">Email Marketing</p>
              <h1 className="text-3xl font-bold text-[#0f172a]">Email Templates</h1>
              <p className="max-w-3xl text-sm text-zinc-600">Buat template email dengan AI atau manual untuk campaign blast.</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/email"
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Dashboard
              </Link>
              <button
                onClick={startNew}
                className="rounded-lg bg-[#1f3c88] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f3c88]/90"
              >
                + New Template
              </button>
            </div>
          </div>
        </header>

        {/* Create/Edit Form */}
        {showCreate && (
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-[#0f172a]">
              {editId ? "Edit Template" : "Buat Template Baru"}
            </h2>

            {/* Tabs: AI Generate vs Manual */}
            {!editId && (
              <div className="mb-6 flex gap-2 border-b border-zinc-200">
                <button
                  onClick={() => setActiveTab("ai")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "ai"
                      ? "border-[#1f3c88] text-[#1f3c88]"
                      : "border-transparent text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  🤖 Generate dengan AI
                </button>
                <button
                  onClick={() => setActiveTab("manual")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "manual"
                      ? "border-[#1f3c88] text-[#1f3c88]"
                      : "border-transparent text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  ✏️ Manual
                </button>
              </div>
            )}

            {/* AI Generator Panel */}
            {!editId && activeTab === "ai" && (
              <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-[#1f3c88]">
                  Generate Template dengan AI
                </h3>
                <p className="mb-4 text-xs text-zinc-600">
                  Deskripsikan email yang kamu inginkan, dan AI akan membuatkan template HTML-nya secara otomatis.
                </p>

                {/* Suggestion chips */}
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium text-zinc-500">Contoh prompt:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {AI_PROMPT_SUGGESTIONS.slice(0, 5).map((s) => (
                      <button
                        key={s}
                        onClick={() => applySuggestion(s)}
                        className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs text-zinc-600 hover:bg-blue-100 hover:text-[#1f3c88] transition"
                      >
                        {s.length > 50 ? s.slice(0, 50) + "..." : s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  {/* Prompt */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">
                      Deskripsi Email *
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                      rows={3}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Contoh: Buat email promosi spesial Hari Kemerdekaan dengan diskon 17% untuk semua produk UMKM, tampilkan 3 produk unggulan, dan ajakan untuk belanja sekarang."
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Tone */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700">Tone/Style</label>
                      <select
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                        value={aiTone}
                        onChange={(e) => setAiTone(e.target.value)}
                      >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="casual">Casual</option>
                        <option value="luxury">Mewah / Luxury</option>
                        <option value="urgent">Urgent / FOMO</option>
                        <option value="festive">Festive (hari raya)</option>
                      </select>
                    </div>

                    {/* Company */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700">Nama Perusahaan</label>
                      <input
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                        value={aiCompany}
                        onChange={(e) => setAiCompany(e.target.value)}
                      />
                    </div>

                    {/* Include Unsubscribe */}
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={aiIncludeUnsubscribe}
                          onChange={(e) => setAiIncludeUnsubscribe(e.target.checked)}
                          className="rounded border-zinc-300 text-[#1f3c88] focus:ring-[#1f3c88]"
                        />
                        <span className="text-sm text-zinc-700">Include unsubscribe link</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleAiGenerate}
                      disabled={aiGenerating || !aiPrompt.trim()}
                      className="rounded-lg bg-gradient-to-r from-[#1f3c88] to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-[#1f3c88]/90 hover:to-blue-600/90 disabled:opacity-50 transition flex items-center gap-2"
                    >
                      {aiGenerating ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Generate dengan AI
                        </>
                      )}
                    </button>
                    {aiGenerating && (
                      <span className="text-xs text-zinc-500">
                        Memproses... biasaya 5-15 detik
                      </span>
                    )}
                  </div>

                  {aiError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                      <p className="text-sm text-red-700">{aiError}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Manual / Edit Form */}
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Template Name *</label>
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. welcome_email"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Subject Line *</label>
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="e.g. Selamat Datang {{nama}}!"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  HTML Content *
                  <span className="ml-2 text-xs text-zinc-400">
                    (Gunakan {'{{nama}}'}, {'{{email}}'}, {'{{phone}}'}, {'{{partner}}'} untuk personalisasi)
                  </span>
                </label>
                <textarea
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono focus:border-[#1f3c88] focus:outline-none"
                  rows={16}
                  value={formHtml}
                  onChange={(e) => setFormHtml(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Plain Text Version (Opsional)
                </label>
                <textarea
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono focus:border-[#1f3c88] focus:outline-none"
                  rows={6}
                  value={formPlain}
                  onChange={(e) => setFormPlain(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-[#1f3c88] px-6 py-2 text-sm font-semibold text-white hover:bg-[#1f3c88]/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editId ? "Update Template" : "Simpan Template"}
                </button>
                <button
                  onClick={previewCurrentHtml}
                  className="rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-200"
                >
                  Preview
                </button>
                {/* Regenerate with AI button for existing templates */}
                {editId && (
                  <button
                    onClick={async () => {
                      setAiPrompt("Perbaiki dan polish template email ini agar lebih profesional dan menarik");
                      setActiveTab("ai");
                    }}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100"
                  >
                    🤖 Polish dengan AI
                  </button>
                )}
              </div>

              {/* Preview */}
              {previewHtml && (
                <div className="rounded-lg border border-zinc-200 overflow-hidden">
                  <div className="flex items-center justify-between bg-zinc-50 px-4 py-2 border-b border-zinc-200">
                    <p className="text-xs font-semibold text-zinc-500">PREVIEW</p>
                    <span className="text-xs text-zinc-400">Desktop & Mobile</span>
                  </div>
                  <iframe
                    className="w-full"
                    srcDoc={previewHtml}
                    style={{ height: "450px", border: "none" }}
                    title="Email Preview"
                  />
                </div>
              )}

              {result && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <pre className="whitespace-pre-wrap text-xs text-zinc-700">{result}</pre>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Additional suggestion chips when not showing create form */}
        {!showCreate && (
          <section className="rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#1f3c88]">🤖 Generate Template dengan AI</h3>
                <p className="mt-1 text-xs text-zinc-600">
                  Deskripsikan email yang kamu mau, AI akan buatkan template HTML-nya.
                </p>
              </div>
              <button
                onClick={startNew}
                className="rounded-lg bg-[#1f3c88] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f3c88]/90"
              >
                Coba Sekarang
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {AI_PROMPT_SUGGESTIONS.slice(0, 4).map((s) => (
                <button
                  key={s}
                  onClick={() => { startNew(); setTimeout(() => setAiPrompt(s), 100); }}
                  className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs text-zinc-600 hover:bg-blue-100 hover:text-[#1f3c88] transition"
                >
                  {s.length > 40 ? s.slice(0, 40) + "..." : s}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Template List */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-700">All Templates</h2>

          {templates.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-zinc-400">
              Belum ada template.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="py-3 pr-4 text-left font-semibold text-zinc-700">Name</th>
                    <th className="py-3 pr-4 text-left font-semibold text-zinc-700">Subject</th>
                    <th className="py-3 pr-4 text-left font-semibold text-zinc-700">Variables</th>
                    <th className="py-3 pr-4 text-left font-semibold text-zinc-700">Updated</th>
                    <th className="py-3 text-left font-semibold text-zinc-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="py-3 pr-4 font-medium text-zinc-900">
                        {t.name.startsWith("ai_") ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-xs">🤖</span>
                            {t.name}
                          </span>
                        ) : t.name}
                      </td>
                      <td className="py-3 pr-4 max-w-[250px] truncate text-zinc-600">{t.subject}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {(t.variables || []).map((v) => (
                            <span key={v} className="rounded-md bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                              {'{{'}{v}{'}}'}
                            </span>
                          ))}
                          {(!t.variables || t.variables.length === 0) && (
                            <span className="text-xs text-zinc-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-zinc-500">
                        {new Date(t.updated_at).toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => startEdit(t)}
                          className="mr-2 text-xs font-medium text-[#1f3c88] hover:underline"
                        >
                          Edit
                        </button>
                        {t.name.startsWith("ai_") && (
                          <span className="mr-2 text-xs text-zinc-300">|</span>
                        )}
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </button>
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
