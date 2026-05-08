"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

type AnalyticsData = {
  overview: {
    total: number;
    open: number;
    resolved: number;
    pending: number;
    escalated: number;
    unread: number;
  };
  leadDistribution: Record<string, number>;
  topIntents: { intent: string; count: number }[];
  dailyTrends: { date: string; conversations: number; resolved: number; messages: number }[];
  aiPerformance: {
    handledByAI: number;
    successRate: number;
    totalMessages: number;
    aiMessages: number;
    agentMessages: number;
  };
  dateRange: { start: string; end: string };
};

type Conversation = {
  id: string;
  phone_number: string;
  customer_name: string | null;
  status: string;
  last_intent: string | null;
  last_message_at: string;
  lead_category: string;
};

type Message = {
  id: string;
  direction: string;
  sender_type: string;
  text_body: string;
  created_at: string;
  intent_detected: string | null;
};

const COLORS = ["#ef4444", "#f97316", "#eab308", "#6b7280"];
const LEAD_COLORS = { hot: "#ef4444", warm: "#f97316", medium: "#eab308", cold: "#6b7280" };

export default function CrmPage() {
  const [activeTab, setActiveTab] = useState<"analytics" | "conversations">("analytics");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [searchIntent, setSearchIntent] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      start: thirtyDaysAgo.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0]
    };
  });

  useEffect(() => {
    if (!dateRange.start || !dateRange.end) return;
    fetchAnalytics();
    fetchConversations();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end
      });
      const res = await fetch(`/api/helpdesk/analytics?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    }
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/helpdesk/v2/conversations");
      const json = await res.json();
      setConversations(json.conversations || []);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/helpdesk/v2/messages?conversation_id=${conversationId}`);
      const json = await res.json();
      setMessages(json.messages || []);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleDetailClick = (conv: Conversation) => {
    setSelectedConversation(conv);
    fetchMessages(conv.id);
  };

  const closeModal = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  const resolveConversation = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/helpdesk/v2/conversations?id=${conversationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" })
      });
      if (res.ok) {
        setConversations(convs =>
          convs.map(c => c.id === conversationId ? { ...c, status: "resolved" } : c)
        );
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation({ ...selectedConversation, status: "resolved" });
        }
      }
    } catch (err) {
      console.error("Failed to resolve conversation:", err);
    }
  };

  const cards = [
    { href: "/crm/campaigns", title: "Campaigns", desc: "Kirim broadcast segmented (send now) dan monitor hasil pengiriman.", tag: "Outbound" },
    { href: "/helpdesk/v2", title: "Helpdesk Inbox", desc: "Kelola percakapan WhatsApp, takeover manual, dan status bot.", tag: "Support" },
    { href: "/crm/auto-replies", title: "Auto Replies", desc: "Atur rule keyword dan outside office hours untuk auto response.", tag: "Automation" },
  ];

  const leadPieData = data ? Object.entries(data.leadDistribution).map(([name, value]) => ({ name, value })) : [];
  const intentData = data?.topIntents.map(i => ({ name: i.intent.length > 15 ? i.intent.slice(0, 15) + "..." : i.intent, count: i.count })) || [];
  const trendData = data?.dailyTrends.map(d => ({
    date: new Date(d.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
    messages: d.messages,
    conversations: d.conversations
  })) || [];

  const filteredConversations = conversations.filter(conv => {
    const nameMatch = searchName === "" || 
      (conv.customer_name && conv.customer_name.toLowerCase().includes(searchName.toLowerCase())) ||
      conv.phone_number.toLowerCase().includes(searchName.toLowerCase());
    const intentMatch = searchIntent === "" || 
      (conv.last_intent && conv.last_intent.toLowerCase().includes(searchIntent.toLowerCase()));
    const statusMatch = searchStatus === "" || conv.status === searchStatus;
    return nameMatch && intentMatch && statusMatch;
  });

  const getLeadBadge = (category: string) => {
    const colors = {
      hot: "bg-red-100 text-red-800",
      warm: "bg-orange-100 text-orange-800",
      medium: "bg-yellow-100 text-yellow-800",
      cold: "bg-gray-100 text-gray-800"
    };
    return colors[category as keyof typeof colors] || colors.cold;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      open: "bg-blue-100 text-blue-800",
      pending: "bg-yellow-100 text-yellow-800",
      resolved: "bg-green-100 text-green-800",
      escalated: "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || colors.open;
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-2 border-b border-zinc-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">Customer Relationship</p>
          <h1 className="text-3xl font-bold text-[#0f172a]">CRM Workspace</h1>
          <p className="max-w-3xl text-sm text-zinc-600">Satu workspace untuk campaign WhatsApp, helpdesk, dan automasi balasan.</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-200">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "analytics"
                ? "border-[#1f3c88] text-[#1f3c88]"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("conversations")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "conversations"
                ? "border-[#1f3c88] text-[#1f3c88]"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Conversations
          </button>
        </div>

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0f172a]">AI Helpdesk Analytics</h2>
                <p className="text-sm text-zinc-500">Performa chatbot dan percakapan</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-600">Dari:</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                />
                <label className="text-sm text-zinc-600">Sampai:</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <p className="text-zinc-500">Memuat data...</p>
              </div>
            ) : (
              <>
                {/* Overview Cards */}
                <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-6">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-xs font-medium uppercase text-blue-600">Total</p>
                    <p className="mt-1 text-2xl font-bold text-blue-700">{data?.overview.total || 0}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-4">
                    <p className="text-xs font-medium uppercase text-amber-600">Open</p>
                    <p className="mt-1 text-2xl font-bold text-amber-700">{data?.overview.open || 0}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4">
                    <p className="text-xs font-medium uppercase text-green-600">Resolved</p>
                    <p className="mt-1 text-2xl font-bold text-green-700">{data?.overview.resolved || 0}</p>
                  </div>
                  <div className="rounded-lg bg-orange-50 p-4">
                    <p className="text-xs font-medium uppercase text-orange-600">Pending</p>
                    <p className="mt-1 text-2xl font-bold text-orange-700">{data?.overview.pending || 0}</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-4">
                    <p className="text-xs font-medium uppercase text-purple-600">Unread</p>
                    <p className="mt-1 text-2xl font-bold text-purple-700">{data?.overview.unread || 0}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-xs font-medium uppercase text-red-600">Escalated</p>
                    <p className="mt-1 text-2xl font-bold text-red-700">{data?.overview.escalated || 0}</p>
                  </div>
                </div>

                {/* Charts Row 1 */}
                <div className="mb-6 grid gap-6 md:grid-cols-2">
                  {/* Lead Distribution */}
                  <div className="rounded-lg border border-zinc-100 p-4">
                    <h3 className="mb-4 text-sm font-semibold text-zinc-700">Lead Distribution</h3>
                    {leadPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={leadPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {leadPieData.map((entry, index) => (
                              <Cell key={entry.name} fill={LEAD_COLORS[entry.name as keyof typeof LEAD_COLORS] || "#ccc"} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[200px] items-center justify-center text-zinc-400">Belum ada data</div>
                    )}
                  </div>

                  {/* Top Intents */}
                  <div className="rounded-lg border border-zinc-100 p-4">
                    <h3 className="mb-4 text-sm font-semibold text-zinc-700">Top Intents</h3>
                    {intentData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={intentData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={100} style={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#1f3c88" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[200px] items-center justify-center text-zinc-400">Belum ada data</div>
                    )}
                  </div>
                </div>

                {/* Daily Trends */}
                <div className="mb-6 rounded-lg border border-zinc-100 p-4">
                  <h3 className="mb-4 text-sm font-semibold text-zinc-700">Daily Trends</h3>
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" style={{ fontSize: 11 }} />
                        <YAxis style={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="messages" stroke="#1f3c88" strokeWidth={2} name="Messages" />
                        <Line type="monotone" dataKey="conversations" stroke="#22c55e" strokeWidth={2} name="Conversations" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[250px] items-center justify-center text-zinc-400">Belum ada data</div>
                  )}
                </div>

                {/* AI Performance */}
                <div className="rounded-lg bg-slate-50 p-4">
                  <h3 className="mb-4 text-sm font-semibold text-zinc-700">AI Performance</h3>
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-xs text-zinc-500">Handled by AI</p>
                      <p className="text-2xl font-bold text-[#1f3c88]">{data?.aiPerformance.handledByAI || 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Success Rate</p>
                      <p className="text-2xl font-bold text-green-600">{data?.aiPerformance.successRate || 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Total Messages</p>
                      <p className="text-2xl font-bold text-zinc-700">{data?.aiPerformance.totalMessages || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">AI Messages</p>
                      <p className="text-2xl font-bold text-blue-600">{data?.aiPerformance.aiMessages || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Agent Messages</p>
                      <p className="text-2xl font-bold text-amber-600">{data?.aiPerformance.agentMessages || 0}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* Conversations Tab */}
        {activeTab === "conversations" && (
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-[#0f172a]">Conversations List</h2>
            <p className="mb-4 text-sm text-zinc-500">Daftar percakapan dengan customer</p>

            {/* Search Filters */}
            <div className="mb-4 flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Cari nama..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm w-40"
              />
              <input
                type="text"
                placeholder="Cari intent..."
                value={searchIntent}
                onChange={(e) => setSearchIntent(e.target.value)}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm w-40"
              />
              <select
                value={searchStatus}
                onChange={(e) => setSearchStatus(e.target.value)}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">Semua Status</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="escalated">Escalated</option>
              </select>
              {(searchName || searchIntent || searchStatus) && (
                <button
                  onClick={() => { setSearchName(""); setSearchIntent(""); setSearchStatus(""); }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <p className="text-zinc-500">Memuat data...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-zinc-400">
                {conversations.length === 0 ? "Belum ada percakapan" : "Tidak ada hasil pencarian"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left py-3 px-4 font-semibold text-zinc-700">Nama</th>
                      <th className="text-left py-3 px-4 font-semibold text-zinc-700">Nomor Telepon</th>
                      <th className="text-left py-3 px-4 font-semibold text-zinc-700">Last Intent</th>
                      <th className="text-left py-3 px-4 font-semibold text-zinc-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-zinc-700">Lead</th>
                      <th className="text-left py-3 px-4 font-semibold text-zinc-700">Last Message</th>
                      <th className="text-center py-3 px-4 font-semibold text-zinc-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConversations.map((conv) => (
                      <tr key={conv.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                        <td className="py-3 px-4 font-medium text-zinc-900">
                          {conv.customer_name || "-"}
                        </td>
                        <td className="py-3 px-4 text-zinc-700">
                          {conv.phone_number}
                        </td>
                        <td className="py-3 px-4 text-zinc-600">
                          {conv.last_intent || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(conv.status)}`}>
                            {conv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLeadBadge(conv.lead_category)}`}>
                            {conv.lead_category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-500 text-xs">
                          {conv.last_message_at ? new Date(conv.last_message_at).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : "-"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDetailClick(conv)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-[#1f3c88] rounded-md hover:bg-[#1f3c88]/90"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Existing Cards */}
        <section className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-[#1f3c88]/30 hover:shadow"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{card.tag}</p>
              <h2 className="mt-2 text-lg font-semibold text-[#0f172a]">{card.title}</h2>
              <p className="mt-2 text-sm text-zinc-600">{card.desc}</p>
            </Link>
          ))}
        </section>

        {/* Chat Modal */}
        {selectedConversation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl max-h-[80vh] rounded-xl bg-white shadow-xl overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
                <div>
                  <h3 className="text-lg font-bold text-[#0f172a]">
                    {selectedConversation.customer_name || selectedConversation.phone_number}
                  </h3>
                  <p className="text-sm text-zinc-500">{selectedConversation.phone_number}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConversation.status !== "resolved" && (
                    <button
                      onClick={() => resolveConversation(selectedConversation.id)}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      Resolve
                    </button>
                  )}
                  {selectedConversation.status === "resolved" && (
                    <span className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-md">
                      Resolved
                    </span>
                  )}
                  <button
                    onClick={closeModal}
                    className="text-zinc-400 hover:text-zinc-600 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-zinc-500">Memuat percakapan...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-zinc-400">
                    Tidak ada pesan
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === "inbound" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-4 py-2 ${
                          msg.direction === "inbound"
                            ? "bg-zinc-100 text-zinc-900"
                            : "bg-[#1f3c88] text-white"
                        }`}
                      >
                        <p className="text-sm">{msg.text_body || "-"}</p>
                        <div className={`text-xs mt-1 ${msg.direction === "inbound" ? "text-zinc-400" : "text-blue-200"}`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                          {msg.sender_type && (
                            <span className="ml-2">• {msg.sender_type}</span>
                          )}
                          {msg.intent_detected && (
                            <span className="ml-2">• {msg.intent_detected}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}