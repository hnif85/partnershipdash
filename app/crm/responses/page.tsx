"use client";

import { useEffect, useRef, useState } from "react";

type Conversation = {
  id: number;
  phone_number: string;
  provider: string;
  status: string;
  lead_score: number;
  lead_category: string;
  last_intent: string;
  assigned_to?: string | null;
  bot_enabled: boolean;
  last_message_at: string;
};
type Message = {
  id: number;
  direction: string;
  sender_type: string;
  text_body?: string | null;
  intent_detected?: string | null;
  created_at: string;
};

export default function CrmResponsesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterProvider, setFilterProvider] = useState("all");
  const selectedRef = useRef<Conversation | null>(null);

  const getLeadColor = (category: string) => {
    switch (category) {
      case "hot": return "bg-red-500";
      case "medium": return "bg-orange-500";
      case "warm": return "bg-yellow-500";
      case "cold": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getLeadLabel = (category: string) => {
    switch (category) {
      case "hot": return "🔥 Hot";
      case "medium": return "🟠 Medium";
      case "warm": return "🟡 Warm";
      case "cold": return "⚪ Cold";
      default: return "⚪ -";
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Hari ini";
    if (days === 1) return "Kemarin";
    if (days < 7) return `${days} hari lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  async function loadConversations() {
    const ts = Date.now();
    const res = await fetch(`/api/helpdesk/v2/conversations?_=${ts}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    const data = await res.json();
    setConversations(data.conversations || []);
  }

  async function loadMessages(conversationId: number) {
    const ts = Date.now();
    const res = await fetch(`/api/helpdesk/v2/messages?conversation_id=${conversationId}&_=${ts}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    const data = await res.json();
    setMessages(data.messages || []);
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    await fetch("/api/helpdesk/v2/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: selected.id, message: reply, sender_type: "agent" }),
    });
    setReply("");
    await loadMessages(selected.id);
    await loadConversations();
  }

  async function toggleBot(enabled: boolean) {
    if (!selected) return;
    await fetch("/api/helpdesk/v2/toggle-bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: selected.id, enabled }),
    });
    await loadConversations();
  }

  const filteredConversations = conversations.filter((c) => {
    if (filterCategory !== "all" && c.lead_category !== filterCategory) return false;
    if (filterProvider !== "all" && c.provider !== filterProvider) return false;
    return true;
  });

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    loadConversations();
    const interval = window.setInterval(async () => {
      await loadConversations();
      if (selectedRef.current?.id) {
        await loadMessages(selectedRef.current.id);
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-2 border-b border-zinc-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">CRM Helpdesk</p>
          <h1 className="text-3xl font-bold text-[#0f172a]">WhatsApp Inbox</h1>
          <p className="max-w-3xl text-sm text-zinc-600">Kelola percakapan masuk, balas manual, dan kontrol bot auto-reply per conversation.</p>
        </header>

        <section className="grid min-h-[65vh] grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm lg:col-span-4 overflow-auto">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Conversations</h2>
            
            {/* Filters */}
            <div className="mb-3 flex gap-1 flex-wrap">
              <button onClick={() => setFilterCategory("all")} className={`px-2 py-1 rounded text-xs ${filterCategory === "all" ? "bg-blue-500 text-white" : "bg-zinc-100"}`}>All</button>
              <button onClick={() => setFilterCategory("hot")} className={`px-2 py-1 rounded text-xs ${filterCategory === "hot" ? "bg-red-500 text-white" : "bg-red-100"}`}>🔥 Hot</button>
              <button onClick={() => setFilterCategory("warm")} className={`px-2 py-1 rounded text-xs ${filterCategory === "warm" ? "bg-yellow-500 text-white" : "bg-yellow-100"}`}>🟡</button>
              <button onClick={() => setFilterCategory("medium")} className={`px-2 py-1 rounded text-xs ${filterCategory === "medium" ? "bg-orange-500 text-white" : "bg-orange-100"}`}>🟠</button>
              <button onClick={() => setFilterCategory("cold")} className={`px-2 py-1 rounded text-xs ${filterCategory === "cold" ? "bg-gray-500 text-white" : "bg-gray-100"}`}>⚪</button>
            </div>
            <div className="mb-3 flex gap-1">
              <button onClick={() => setFilterProvider("all")} className={`px-2 py-1 rounded text-xs ${filterProvider === "all" ? "bg-blue-500 text-white" : "bg-zinc-100"}`}>All</button>
              <button onClick={() => setFilterProvider("watzap")} className={`px-2 py-1 rounded text-xs ${filterProvider === "watzap" ? "bg-green-500 text-white" : "bg-green-100"}`}>📱</button>
              <button onClick={() => setFilterProvider("damcorp")} className={`px-2 py-1 rounded text-xs ${filterProvider === "damcorp" ? "bg-purple-500 text-white" : "bg-purple-100"}`}>💬</button>
            </div>
            
            <div className="space-y-2">
              {filteredConversations.map((c) => {
                const active = selected?.id === c.id;
                return (
                  <button
                    key={c.id}
                    className={`w-full rounded-lg border p-3 text-left transition ${active ? "border-[#1f3c88] bg-[#eef2ff]" : "border-zinc-200 hover:bg-zinc-50"}`}
                    onClick={() => {
                      setSelected(c);
                      loadMessages(c.id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-[#0f172a]">{c.phone_number}</div>
                      <span className="text-xs text-zinc-400">{formatDate(c.last_message_at)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.provider === 'damcorp' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                        {c.provider}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getLeadColor(c.lead_category)} text-white`}>
                        {getLeadLabel(c.lead_category)}
                      </span>
                      <span className="text-[10px] text-zinc-400">Score: {c.lead_score}</span>
                    </div>
                    {c.last_intent && <div className="mt-1 text-[10px] text-zinc-400">Intent: {c.last_intent}</div>}
                  </button>
                );
              })}
              {filteredConversations.length === 0 && <div className="text-center text-sm text-zinc-400 py-4">No conversations</div>}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-8 flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Thread</h2>
                {selected && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${selected.provider === 'damcorp' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                      {selected.provider}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${getLeadColor(selected.lead_category)} text-white`}>
                      {getLeadLabel(selected.lead_category)}
                    </span>
                    <span className="text-xs text-zinc-500">Score: {selected.lead_score}</span>
                    {selected.last_intent && <span className="text-xs text-zinc-400">| Intent: {selected.last_intent}</span>}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${selected?.bot_enabled ? 'bg-green-100 text-green-700 border-green-300' : 'bg-zinc-100 text-zinc-700 border-zinc-200'} hover:bg-zinc-200`} onClick={() => toggleBot(!selected?.bot_enabled)}>
                  🤖 {selected?.bot_enabled ? "AI On" : "AI Off"}
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-auto rounded-lg bg-zinc-50 p-3">
              {messages.map((m) => {
                const isCustomer = m.sender_type === "customer";
                const rowClass = isCustomer ? "justify-start" : "justify-end";
                const bubbleClass = isCustomer
                  ? "border-zinc-200 bg-white text-zinc-800"
                  : "border-[#1f3c88]/20 bg-[#e8ecf8] text-[#0f172a]";

                return (
                  <div key={m.id} className={`flex ${rowClass}`}>
                    <div className={`max-w-[85%] rounded-lg border p-3 ${bubbleClass}`}>
                      <div className="text-xs text-zinc-500">
                        {m.sender_type} {m.sender_type === 'ai' && '🤖'} {m.sender_type === 'agent' && '👤'} • {formatTime(m.created_at)}
                        {m.intent_detected && <span className="ml-1 text-blue-600">| {m.intent_detected}</span>}
                      </div>
                      <div className="mt-1 text-sm">{m.text_body}</div>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && <p className="text-sm text-zinc-500">Pilih conversation untuk melihat thread.</p>}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Tulis balasan..."
              />
              <button className="rounded-lg bg-[#1f3c88] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f3c88]/90" onClick={sendReply}>Send</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
