"use client";

import { useEffect, useState } from "react";

type Rule = {
  id: number;
  name: string;
  trigger_type: string;
  trigger_config_json: any;
  reply_payload_json: any;
  is_active: boolean;
  priority: number;
};

export default function AutoRepliesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [name, setName] = useState("Outside Hours");
  const [triggerType, setTriggerType] = useState("outside_hours");
  const [keywords, setKeywords] = useState("harga,demo");
  const [replyText, setReplyText] = useState("Terima kasih. Tim kami akan membalas pada jam kerja.");

  async function loadRules() {
    const res = await fetch("/api/helpdesk/auto-replies", { cache: "no-store" });
    const data = await res.json();
    setRules(data.rules || []);
  }

  async function createRule() {
    const trigger_config_json = triggerType === "keyword"
      ? { keywords: keywords.split(",").map((x) => x.trim()).filter(Boolean) }
      : {};

    await fetch("/api/helpdesk/auto-replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        trigger_type: triggerType,
        trigger_config_json,
        reply_type: "text",
        reply_payload_json: { text_body: replyText },
        priority: triggerType === "outside_hours" ? 1 : 20,
      }),
    });

    await loadRules();
  }

  useEffect(() => {
    loadRules();
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-2 border-b border-zinc-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">CRM Automation</p>
          <h1 className="text-3xl font-bold text-[#0f172a]">Auto Reply Rules</h1>
          <p className="max-w-3xl text-sm text-zinc-600">Atur rule balasan otomatis untuk keyword dan luar jam kerja.</p>
        </header>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Rule Name</label>
                <input className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Trigger Type</label>
                <select className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]" value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
                  <option value="outside_hours">Outside Hours</option>
                  <option value="keyword">Keyword</option>
                </select>
              </div>
            </div>

            {triggerType === "keyword" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Keywords (comma separated)</label>
                <input className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="keyword1,keyword2" />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Reply Text</label>
              <textarea className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]" rows={4} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply text" />
            </div>

            <div>
              <button className="rounded-lg bg-[#1f3c88] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f3c88]/90" onClick={createRule}>Create Rule</button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">Existing Rules</p>
          <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">{JSON.stringify(rules, null, 2)}</pre>
        </section>
      </div>
    </main>
  );
}
