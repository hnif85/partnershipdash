"use client";

import { useEffect, useState } from "react";

type CampaignFlow = "new_user" | "idle_login" | "near_expired";
type PreviewUser = {
  guid?: string;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  partner?: string | null;
};
type SavedTemplate = { id: number; flow_type: string; template_name: string; template_text: string };

const flowMeta: Record<CampaignFlow, { title: string; desc: string; badge: string }> = {
  new_user: {
    title: "New User Campaign",
    desc: "Target user baru 7 hari terakhir yang belum pernah menerima template ini.",
    badge: "Onboarding",
  },
  idle_login: {
    title: "Idle Login Campaign",
    desc: "Target user dengan aktivitas login menurun/tidak aktif untuk re-engagement.",
    badge: "Retention",
  },
  near_expired: {
    title: "Near Expired Campaign",
    desc: "Target user dengan langganan yang akan segera berakhir.",
    badge: "Renewal",
  },
};

export default function CrmCampaignsPage() {
  const [flow, setFlow] = useState<CampaignFlow>("new_user");
  const [templateName, setTemplateName] = useState("new_user_welcome_v1");
  const [templateText, setTemplateText] = useState("Halo {{nama}}, selamat datang di MWX Market! Ada yang bisa kami bantu?");
  const [newUserTotal, setNewUserTotal] = useState<number | null>(null);
  const [previewUsers, setPreviewUsers] = useState<PreviewUser[]>([]);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [result, setResult] = useState<string>("");

  async function loadTemplates(activeFlow: CampaignFlow) {
    const res = await fetch(`/api/crm/templates?flow=${activeFlow}`, { cache: "no-store" });
    const data = await res.json();
    const list = (data.templates || []) as SavedTemplate[];
    setTemplates(list);
  }

  async function saveTemplate() {
    const res = await fetch("/api/crm/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flow_type: flow, template_name: templateName, template_text: templateText }),
    });
    const data = await res.json();
    if (!res.ok) {
      setResult(JSON.stringify(data, null, 2));
      return;
    }
    await loadTemplates(flow);
    setResult("Template saved successfully.");
  }

  async function previewNewUsers() {
    const res = await fetch(`/api/crm/campaigns?mode=new_user_preview&template_name=${encodeURIComponent(templateName)}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setPreviewUsers([]);
      setResult(JSON.stringify(data, null, 2));
      return;
    }
    setNewUserTotal(data.total || 0);
    setPreviewUsers(data.users || []);
    setResult("Preview berhasil dimuat.");
  }

  async function sendNewUserTemplate() {
    const res = await fetch("/api/crm/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send_new_user_template",
        template_name: templateName,
        template_text: templateText,
      }),
    });
    const data = await res.json();
    setResult(JSON.stringify(data, null, 2));
  }

  function applySelectedTemplate(value: string) {
    setSelectedTemplate(value);
    const found = templates.find((t) => t.template_name === value);
    if (!found) return;
    setTemplateName(found.template_name);
    setTemplateText(found.template_text);
  }

  useEffect(() => {
    loadTemplates(flow);
    setSelectedTemplate("");
  }, [flow]);

  function renderFlowForm() {
    if (flow !== "new_user") {
      return (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-600">
            Alur <span className="font-semibold text-[#0f172a]">{flowMeta[flow].title}</span> sudah disiapkan di UI.
            Backend rule spesifiknya akan mengikuti pola yang sama seperti New User flow.
          </p>
        </section>
      );
    }

    return (
      <>
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Pilih Template Tersimpan</label>
              <select
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                value={selectedTemplate}
                onChange={(e) => applySelectedTemplate(e.target.value)}
              >
                <option value="">-- Pilih template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.template_name}>{t.template_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Template Name</label>
              <input
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Template Message Text</label>
              <textarea
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                rows={4}
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
              />
              <p className="mt-1 text-xs text-zinc-500">Gunakan variabel <code>{'{nama}'}</code> untuk personalisasi nama user.</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button className="rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200" onClick={saveTemplate}>Simpan Template</button>
              <button className="rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200" onClick={previewNewUsers}>Preview Eligible New Users</button>
              <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800" onClick={sendNewUserTemplate}>Send Template to Eligible Users</button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-zinc-500">Eligible New Users</p>
          <p className="mt-2 text-3xl font-bold text-[#0f172a]">{newUserTotal ?? "-"}</p>
        </section>
      </>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-2 border-b border-zinc-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">CRM Campaign</p>
          <h1 className="text-3xl font-bold text-[#0f172a]">Campaign Flow Builder</h1>
          <p className="max-w-3xl text-sm text-zinc-600">Pilih jenis campaign, lalu lanjutkan ke konfigurasi dan pengiriman.</p>
        </header>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase text-zinc-500">Choose Campaign Flow</p>
          <div className="grid gap-3 md:grid-cols-3">
            {(Object.keys(flowMeta) as CampaignFlow[]).map((key) => {
              const active = flow === key;
              const meta = flowMeta[key];
              return (
                <button
                  key={key}
                  onClick={() => setFlow(key)}
                  className={`rounded-lg border p-4 text-left transition ${active ? "border-[#1f3c88] bg-[#eef2ff]" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{meta.badge}</p>
                  <p className="mt-1 text-base font-semibold text-[#0f172a]">{meta.title}</p>
                  <p className="mt-1 text-sm text-zinc-600">{meta.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-zinc-500">Selected Flow</p>
          <p className="mt-2 text-2xl font-bold text-[#0f172a]">{flowMeta[flow].title}</p>
          <p className="mt-1 text-sm text-zinc-600">{flowMeta[flow].desc}</p>
        </section>

        {renderFlowForm()}

        {flow === "new_user" && previewUsers.length > 0 && (
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase text-zinc-500">Preview User List</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-zinc-600">Nama</th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-600">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-600">No Telepon</th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-600">Partner</th>
                  </tr>
                </thead>
                <tbody>
                  {previewUsers.map((u) => (
                    <tr key={`${u.guid || u.email || u.phone_number}`} className="border-t border-zinc-100">
                      <td className="px-3 py-2 text-zinc-800">{u.full_name || "-"}</td>
                      <td className="px-3 py-2 text-zinc-700">{u.email || "-"}</td>
                      <td className="px-3 py-2 text-zinc-700">{u.phone_number || "-"}</td>
                      <td className="px-3 py-2 text-zinc-700">{u.partner || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">Result</p>
          <pre className="max-h-80 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">{result || "Belum ada hasil."}</pre>
        </section>
      </div>
    </main>
  );
}
