"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Conversation = {
  id: number;
  phone_number: string;
  customer_name: string;
  provider: string;
  status: string;
  lead_score: number;
  lead_category: string;
  last_intent: string;
  unread_count: number;
  last_message_at: string;
  bot_enabled: boolean;
  created_at: string;
};

type Message = {
  id: number;
  direction: string;
  sender_type: string;
  text_body: string;
  intent_detected: string;
  created_at: string;
};

type LeadStats = {
  hot: number;
  warm: number;
  medium: number;
  cold: number;
  total: number;
  unread: number;
};

export default function HelpdeskV2() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [leadFilter, setLeadFilter] = useState<string>("all");
  const [unreadFilter, setUnreadFilter] = useState<boolean>(false);
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [stats, setStats] = useState<LeadStats>({ hot: 0, warm: 0, medium: 0, cold: 0, total: 0, unread: 0 });
  const [providerStats, setProviderStats] = useState<{ watzap: number; damcorp: number; total: number }>({ watzap: 0, damcorp: 0, total: 0 });
  const unreadFilterRef = useRef(unreadFilter);
  unreadFilterRef.current = unreadFilter;

  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (unreadFilterRef.current) {
        params.append("filter", "unread");
      }
      const queryString = params.toString();
      const res = await fetch(`/api/helpdesk/v2/conversations${queryString ? `?${queryString}` : ""}`);
      const data = await res.json();
      setConversations(data.conversations || []);
      setStats(data.stats || { hot: 0, warm: 0, medium: 0, cold: 0, total: 0, unread: 0 });
      
      const convs = data.conversations || [];
      const watzap = convs.filter((c: Conversation) => c.provider === "watzap").length;
      const damcorp = convs.filter((c: Conversation) => c.provider === "damcorp").length;
      setProviderStats({ watzap, damcorp, total: convs.length });
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (convId: number) => {
    try {
      const res = await fetch(`/api/helpdesk/v2/messages?conversation_id=${convId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 20000);
    return () => clearInterval(interval);
  }, []);

  // Trigger fetch when filter changes
  useEffect(() => {
    fetchConversations();
  }, [unreadFilter]);

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.id);
      const interval = setInterval(() => {
        fetchMessages(selectedConv.id);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedConv, fetchMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/helpdesk/v2/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selectedConv.id,
          message: newMessage,
          sender_type: "agent",
        }),
      });

      if (res.ok) {
        setNewMessage("");
        fetchMessages(selectedConv.id);
        fetchConversations();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const toggleBot = async (conv: Conversation) => {
    try {
      await fetch("/api/helpdesk/v2/toggle-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conv.id,
          enabled: !conv.bot_enabled,
        }),
      });
      fetchConversations();
    } catch (error) {
      console.error("Failed to toggle bot:", error);
    }
  };

  const resolveConversation = async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/helpdesk/v2/conversations?id=${conv.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: conv.status === "resolved" ? "open" : "resolved" })
      });
      fetchConversations();
    } catch (error) {
      console.error("Failed to resolve conversation:", error);
    }
  };

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
      default: return "⚪ Unknown";
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (leadFilter !== "all" && c.lead_category !== leadFilter) return false;
    if (providerFilter !== "all" && c.provider !== providerFilter) return false;
    return true;
  });

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

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Conversation List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800 mb-4">AI Helpdesk v2</h1>

          {/* Lead Category Filter */}
          <div className="flex gap-1 mb-3 overflow-x-auto">
            <button
              onClick={() => { setLeadFilter("all"); setUnreadFilter(false); }}
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap font-medium ${leadFilter === "all" && !unreadFilter ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 border border-gray-300"}`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => { setLeadFilter("hot"); setUnreadFilter(false); }}
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap font-medium ${leadFilter === "hot" ? "bg-red-600 text-white" : "bg-red-200 text-red-800 border border-red-300"}`}
            >
              🔥 Hot ({stats.hot})
            </button>
            <button
              onClick={() => { setLeadFilter("warm"); setUnreadFilter(false); }}
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap font-medium ${leadFilter === "warm" ? "bg-yellow-500 text-white" : "bg-yellow-200 text-yellow-800 border border-yellow-300"}`}
            >
              🟡 Warm ({stats.warm})
            </button>
            <button
              onClick={() => { setLeadFilter("medium"); setUnreadFilter(false); }}
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap font-medium ${leadFilter === "medium" ? "bg-orange-500 text-white" : "bg-orange-200 text-orange-800 border border-orange-300"}`}
            >
              🟠 Medium ({stats.medium})
            </button>
            <button
              onClick={() => { setLeadFilter("cold"); setUnreadFilter(false); }}
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap font-medium ${leadFilter === "cold" ? "bg-gray-600 text-white" : "bg-gray-200 text-gray-700 border border-gray-300"}`}
            >
              ⚪ Cold ({stats.cold})
            </button>
            <button
              onClick={() => { setLeadFilter("all"); setUnreadFilter(true); }}
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap font-medium ${unreadFilter ? "bg-red-600 text-white" : "bg-red-200 text-red-800 border border-red-300"}`}
            >
              🔴 Unread ({stats.unread})
            </button>
          </div>

          {/* Provider Filter */}
          <div className="flex gap-1 mt-2">
            <button
              onClick={() => setProviderFilter("all")}
              className={`px-3 py-1 rounded text-xs font-medium ${providerFilter === "all" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 border border-gray-300"}`}
            >
              All ({providerStats.total})
            </button>
            <button
              onClick={() => setProviderFilter("watzap")}
              className={`px-3 py-1 rounded text-xs font-medium ${providerFilter === "watzap" ? "bg-green-600 text-white" : "bg-green-200 text-green-800 border border-green-300"}`}
            >
              📱 WatZap ({providerStats.watzap})
            </button>
            <button
              onClick={() => setProviderFilter("damcorp")}
              className={`px-3 py-1 rounded text-xs font-medium ${providerFilter === "damcorp" ? "bg-purple-600 text-white" : "bg-purple-200 text-purple-800 border border-purple-300"}`}
            >
              💬 DamCorp ({providerStats.damcorp})
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No conversations found</div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedConv?.id === conv.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {conv.customer_name || conv.phone_number}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(conv.last_message_at)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded ${getLeadColor(conv.lead_category)} text-white`}>
                    {getLeadLabel(conv.lead_category)}
                  </span>
                  <span className="text-xs text-gray-500">Score: {conv.lead_score}</span>
                  {conv.status === "resolved" ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">Resolved</span>
                  ) : (
                    <button
                      onClick={(e) => resolveConversation(conv, e)}
                      className="text-xs px-2 py-0.5 rounded bg-green-500 text-white hover:bg-green-600"
                    >
                      Resolve
                    </button>
                  )}
                </div>
                {conv.last_intent && (
                  <div className="text-xs text-gray-400 mt-1">Intent: {conv.last_intent}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main - Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-gray-800">
                  {selectedConv.customer_name || selectedConv.phone_number}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{selectedConv.phone_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${getLeadColor(selectedConv.lead_category)} text-white`}>
                    {getLeadLabel(selectedConv.lead_category)}
                  </span>
                  <span className="text-xs text-gray-500">Score: {selectedConv.lead_score}</span>
                  {selectedConv.last_intent && (
                    <span className="text-xs text-gray-400">| Intent: {selectedConv.last_intent}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleBot(selectedConv)}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedConv.bot_enabled
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  🤖 {selectedConv.bot_enabled ? "AI On" : "AI Off"}
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === "inbound" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.direction === "inbound"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    <div className="text-sm">{msg.text_body}</div>
                    <div className={`text-xs mt-1 ${msg.direction === "inbound" ? "text-gray-400" : "text-blue-100"}`}>
                      {formatTime(msg.created_at)}
                      {msg.sender_type === "ai" && " • AI"}
                      {msg.sender_type === "agent" && " • You"}
                      {msg.intent_detected && ` • ${msg.intent_detected}`}
                    </div>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center text-gray-400 mt-10">No messages yet</div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ketik pesan..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                disabled={sending}
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "Sending..." : "Kirim"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              <div>Pilih percakapan untuk memulai</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}