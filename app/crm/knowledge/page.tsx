"use client";

import { useEffect, useState } from "react";
import { PRODUCT_KNOWLEDGE } from "@/lib/knowledge/productData";

type Persona = {
  id: number;
  name: string;
  tone: string;
  greeting: string;
  closing: string;
  signature_phrases: string[];
  response_templates_json: Record<string, string>;
  is_active: boolean;
};

type Intent = {
  id: number;
  intent_name: string;
  keywords: string[];
  priority: number;
  response_templates: string[];
  next_context: string | null;
  requires_param: string[];
  is_active: boolean;
};

type ProductKnowledge = {
  id?: number;
  name: string;
  content: string;
};

type Tab = "personas" | "intents" | "products" | "ai";

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<Tab>("personas");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [productKnowledge, setProductKnowledge] = useState<ProductKnowledge>({
    name: "MWX Product Knowledge",
    content: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [personaForm, setPersonaForm] = useState({
    name: "",
    tone: "friendly",
    greeting: "",
    closing: "",
    signature_phrases: [] as string[],
    is_active: true,
  });

  const [selectedIntent, setSelectedIntent] = useState<Intent | null>(null);
  const [intentForm, setIntentForm] = useState({
    intent_name: "",
    keywords: "",
    priority: 100,
    response_templates: "",
    next_context: "",
    is_active: true,
  });

  const [newPhrase, setNewPhrase] = useState("");

  useEffect(() => {
    loadPersonas();
    loadIntents();
    loadProductKnowledge();
  }, []);

  const loadPersonas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/helpdesk/knowledge/personas");
      const data = await res.json();
      setPersonas(data.personas || []);
    } catch (error) {
      console.error("Failed to load personas:", error);
    }
    setLoading(false);
  };

  const loadIntents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/helpdesk/knowledge/intents");
      const data = await res.json();
      setIntents(data.intents || []);
    } catch (error) {
      console.error("Failed to load intents:", error);
    }
    setLoading(false);
  };

  const loadProductKnowledge = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/helpdesk/knowledge/products");
      const data = await res.json();
      if (data.content) {
        setProductKnowledge({
          name: data.product?.name || "MWX Product Knowledge",
          content: data.content,
        });
      } else {
        setProductKnowledge({
          name: "MWX Product Knowledge",
          content: PRODUCT_KNOWLEDGE,
        });
      }
    } catch (error) {
      console.error("Failed to load product knowledge:", error);
      setProductKnowledge({
        name: "MWX Product Knowledge",
        content: PRODUCT_KNOWLEDGE,
      });
    }
    setLoading(false);
  };

  const saveProductKnowledge = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/helpdesk/knowledge/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productKnowledge),
      });
      if (res.ok) {
        alert("Product knowledge saved!");
      }
    } catch (error) {
      console.error("Failed to save product knowledge:", error);
    }
    setSaving(false);
  };

  // Persona functions
  const openNewPersona = () => {
    setSelectedPersona(null);
    setPersonaForm({
      name: "",
      tone: "friendly",
      greeting: "",
      closing: "",
      signature_phrases: [],
      is_active: true,
    });
  };

  const openEditPersona = (persona: Persona) => {
    setSelectedPersona(persona);
    setPersonaForm({
      name: persona.name,
      tone: persona.tone,
      greeting: persona.greeting || "",
      closing: persona.closing || "",
      signature_phrases: persona.signature_phrases || [],
      is_active: persona.is_active,
    });
  };

  const savePersona = async () => {
    setSaving(true);
    try {
      const method = selectedPersona ? "PUT" : "POST";
      const body = selectedPersona
        ? { ...personaForm, id: selectedPersona.id }
        : personaForm;

      const res = await fetch("/api/helpdesk/knowledge/personas", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await loadPersonas();
        setSelectedPersona(null);
      }
    } catch (error) {
      console.error("Failed to save persona:", error);
    }
    setSaving(false);
  };

  const deletePersona = async (id: number) => {
    if (!confirm("Yakin hapus persona ini?")) return;
    try {
      await fetch("/api/helpdesk/knowledge/personas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await loadPersonas();
    } catch (error) {
      console.error("Failed to delete persona:", error);
    }
  };

  const addSignaturePhrase = () => {
    if (newPhrase.trim()) {
      setPersonaForm({
        ...personaForm,
        signature_phrases: [...personaForm.signature_phrases, newPhrase.trim()],
      });
      setNewPhrase("");
    }
  };

  const removeSignaturePhrase = (index: number) => {
    setPersonaForm({
      ...personaForm,
      signature_phrases: personaForm.signature_phrases.filter((_, i) => i !== index),
    });
  };

  // Intent functions
  const openNewIntent = () => {
    setSelectedIntent(null);
    setIntentForm({
      intent_name: "",
      keywords: "",
      priority: 100,
      response_templates: "",
      next_context: "",
      is_active: true,
    });
  };

  const openEditIntent = (intent: Intent) => {
    setSelectedIntent(intent);
    setIntentForm({
      intent_name: intent.intent_name,
      keywords: intent.keywords.join(", "),
      priority: intent.priority,
      response_templates: intent.response_templates.join("\n"),
      next_context: intent.next_context || "",
      is_active: intent.is_active,
    });
  };

  const saveIntent = async () => {
    setSaving(true);
    try {
      const method = selectedIntent ? "PUT" : "POST";
      const keywordsArray = intentForm.keywords.split(",").map((k) => k.trim()).filter((k) => k);
      const responsesArray = intentForm.response_templates.split("\n").map((r) => r.trim()).filter((r) => r);

      const body = selectedIntent
        ? {
            ...intentForm,
            id: selectedIntent.id,
            keywords: keywordsArray,
            response_templates: responsesArray,
            requires_param: [],
          }
        : {
            ...intentForm,
            keywords: keywordsArray,
            response_templates: responsesArray,
            requires_param: [],
          };

      const res = await fetch("/api/helpdesk/knowledge/intents", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await loadIntents();
        setSelectedIntent(null);
      }
    } catch (error) {
      console.error("Failed to save intent:", error);
    }
    setSaving(false);
  };

  const deleteIntent = async (id: number) => {
    if (!confirm("Yakin hapus intent ini?")) return;
    try {
      await fetch("/api/helpdesk/knowledge/intents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await loadIntents();
    } catch (error) {
      console.error("Failed to delete intent:", error);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "personas", label: "Personas" },
    { id: "intents", label: "Intents" },
    { id: "products", label: "Products" },
    { id: "ai", label: "AI Config" },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-2 border-b border-zinc-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">CRM</p>
          <h1 className="text-3xl font-bold text-[#0f172a]">Knowledge Base Settings</h1>
          <p className="max-w-3xl text-sm text-zinc-600">
            Konfigurasi persona, intent detection, dan AI settings untuk helpdesk automation.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
                activeTab === tab.id
                  ? "border-[#1f3c88] text-[#1f3c88]"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          {activeTab === "personas" && (
            <div>
              <div className="mb-4 flex justify-between">
                <h2 className="text-lg font-semibold">Personas</h2>
                <button
                  onClick={openNewPersona}
                  className="rounded-lg bg-[#1f3c88] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f3c88]/90"
                >
                  + Add Persona
                </button>
              </div>

              {selectedPersona || personaForm.name ? (
                <div className="rounded-lg border border-zinc-200 p-4">
                  <h3 className="mb-4 text-sm font-semibold">
                    {selectedPersona ? "Edit Persona" : "New Persona"}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600">Nama Persona</label>
                      <input
                        type="text"
                        value={personaForm.name}
                        onChange={(e) => setPersonaForm({ ...personaForm, name: e.target.value })}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        placeholder="Contoh: Asisten Pelanggan"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600">Tone</label>
                      <select
                        value={personaForm.tone}
                        onChange={(e) => setPersonaForm({ ...personaForm, tone: e.target.value })}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      >
                        <option value="formal">Formal</option>
                        <option value="casual">Casual</option>
                        <option value="friendly">Friendly</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-zinc-600">Greeting</label>
                      <textarea
                        value={personaForm.greeting}
                        onChange={(e) => setPersonaForm({ ...personaForm, greeting: e.target.value })}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        rows={2}
                        placeholder="Pesan awal saat customer chat..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-zinc-600">Closing</label>
                      <textarea
                        value={personaForm.closing}
                        onChange={(e) => setPersonaForm({ ...personaForm, closing: e.target.value })}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        rows={2}
                        placeholder="Pesan penutup..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-zinc-600">Signature Phrases</label>
                      <div className="mb-2 flex gap-2">
                        <input
                          type="text"
                          value={newPhrase}
                          onChange={(e) => setNewPhrase(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && addSignaturePhrase()}
                          className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                          placeholder="Ketik phrase lalu enter..."
                        />
                        <button
                          onClick={addSignaturePhrase}
                          className="rounded-lg bg-zinc-100 px-3 py-2 text-sm hover:bg-zinc-200"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {personaForm.signature_phrases.map((phrase, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700"
                          >
                            {phrase}
                            <button onClick={() => removeSignaturePhrase(i)} className="text-blue-400 hover:text-blue-600">
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={personaForm.is_active}
                          onChange={(e) => setPersonaForm({ ...personaForm, is_active: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm text-zinc-600">Active</span>
                      </label>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={savePersona}
                      disabled={saving}
                      className="rounded-lg bg-[#1f3c88] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f3c88]/90 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => { setSelectedPersona(null); setPersonaForm({ name: "", tone: "friendly", greeting: "", closing: "", signature_phrases: [], is_active: true }); }}
                      className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Personas List */}
              <div className="mt-4 space-y-2">
                {loading ? (
                  <div className="py-4 text-center text-zinc-400">Loading...</div>
                ) : personas.length === 0 ? (
                  <div className="py-4 text-center text-zinc-400">Belum ada persona. Klik &quot;Add Persona&quot; untuk membuat.</div>
                ) : (
                  personas.map((persona) => (
                    <div
                      key={persona.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 p-3"
                    >
                      <div>
                        <div className="font-medium">{persona.name}</div>
                        <div className="text-xs text-zinc-500">
                          Tone: {persona.tone} | Active: {persona.is_active ? "✓" : "✗"}
                        </div>
                        {persona.greeting && (
                          <div className="mt-1 text-xs text-zinc-400 truncate max-w-md">
                            &quot;{persona.greeting}&quot;
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditPersona(persona)}
                          className="rounded bg-zinc-100 px-2 py-1 text-xs hover:bg-zinc-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deletePersona(persona.id)}
                          className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "intents" && (
            <div>
              <div className="mb-4 flex justify-between">
                <h2 className="text-lg font-semibold">Intents</h2>
                <button
                  onClick={openNewIntent}
                  className="rounded-lg bg-[#1f3c88] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f3c88]/90"
                >
                  + Add Intent
                </button>
              </div>

              {selectedIntent || intentForm.intent_name ? (
                <div className="rounded-lg border border-zinc-200 p-4">
                  <h3 className="mb-4 text-sm font-semibold">
                    {selectedIntent ? "Edit Intent" : "New Intent"}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600">Intent Name</label>
                      <input
                        type="text"
                        value={intentForm.intent_name}
                        onChange={(e) => setIntentForm({ ...intentForm, intent_name: e.target.value })}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        placeholder="Contoh: tanya_harga"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600">Priority</label>
                      <input
                        type="number"
                        value={intentForm.priority}
                        onChange={(e) => setIntentForm({ ...intentForm, priority: parseInt(e.target.value) })}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        min={1}
                        max={100}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-zinc-600">Keywords (comma separated)</label>
                      <input
                        type="text"
                        value={intentForm.keywords}
                        onChange={(e) => setIntentForm({ ...intentForm, keywords: e.target.value })}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        placeholder="harga, biaya, uang, berapa"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-zinc-600">Response Templates (one per line)</label>
                      <textarea
                        value={intentForm.response_templates}
                        onChange={(e) => setIntentForm({ ...intentForm, response_templates: e.target.value })}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        rows={4}
                        placeholder="Untuk informasi harga, bisa cerita dulu produk/layanan apa yang Anda minati?"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600">Next Context (opsional)</label>
                      <input
                        type="text"
                        value={intentForm.next_context}
                        onChange={(e) => setIntentForm({ ...intentForm, next_context: e.target.value })}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        placeholder="harga_inquiry"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 pt-5">
                        <input
                          type="checkbox"
                          checked={intentForm.is_active}
                          onChange={(e) => setIntentForm({ ...intentForm, is_active: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm text-zinc-600">Active</span>
                      </label>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={saveIntent}
                      disabled={saving}
                      className="rounded-lg bg-[#1f3c88] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f3c88]/90 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => { setSelectedIntent(null); setIntentForm({ intent_name: "", keywords: "", priority: 100, response_templates: "", next_context: "", is_active: true }); }}
                      className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Intents List */}
              <div className="mt-4 space-y-2">
                {loading ? (
                  <div className="py-4 text-center text-zinc-400">Loading...</div>
                ) : intents.length === 0 ? (
                  <div className="py-4 text-center text-zinc-400">Belum ada intent. Klik &quot;Add Intent&quot; untuk membuat.</div>
                ) : (
                  intents.map((intent) => (
                    <div
                      key={intent.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{intent.intent_name}</span>
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">Priority: {intent.priority}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {intent.keywords.slice(0, 5).map((kw, i) => (
                            <span key={i} className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                              {kw}
                            </span>
                          ))}
                          {intent.keywords.length > 5 && (
                            <span className="text-xs text-zinc-400">+{intent.keywords.length - 5} more</span>
                          )}
                        </div>
                        {intent.next_context && (
                          <div className="mt-1 text-xs text-zinc-400">Next: {intent.next_context}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditIntent(intent)}
                          className="rounded bg-zinc-100 px-2 py-1 text-xs hover:bg-zinc-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteIntent(intent.id)}
                          className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Product Knowledge</h2>
                  <p className="text-sm text-zinc-500">Knowledge base untuk menjawab pertanyaan tentang produk MWX</p>
                </div>
                <button
                  onClick={saveProductKnowledge}
                  disabled={saving}
                  className="rounded-lg bg-[#1f3c88] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f3c88]/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>

              <div className="rounded-lg border border-zinc-200 p-4">
                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Knowledge Name</label>
                  <input
                    type="text"
                    value={productKnowledge.name}
                    onChange={(e) => setProductKnowledge({ ...productKnowledge, name: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    placeholder="MWX Product Knowledge"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">
                    Product Knowledge Content
                    <span className="ml-1 font-normal text-zinc-400">(gunakan markdown format)</span>
                  </label>
                  <textarea
                    value={productKnowledge.content}
                    onChange={(e) => setProductKnowledge({ ...productKnowledge, content: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono"
                    rows={20}
                    placeholder={`# MWX Market — PRODUCT KNOWLEDGE BASE

## TENTANG MWX MARKET
MWX Market adalah pasar AI terdesentralisasi pertama di dunia...

## DAFTAR PRODUK

### 1. CreateWhiz (Konten & Kreatif)
...`}
                  />
                </div>
                <div className="mt-2 text-xs text-zinc-400">
                  💡 Tips: Gunakan format Markdown untuk struktur yang jelas.Include detail produk, harga, dan fitur.
                </div>
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div>
              <h2 className="mb-4 text-lg font-semibold">AI Configuration</h2>
              <div className="rounded-lg border border-zinc-200 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">AI Model</label>
                    <select className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                      <option>gemini-2.5-flash</option>
                      <option>gemini-2.0-flash</option>
                      <option>gpt-4</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">Temperature</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      defaultValue={0.7}
                      className="w-full"
                    />
                    <div className="text-xs text-zinc-500">0.7 (default)</div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-zinc-600">System Prompt</label>
                    <textarea
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      rows={4}
                      defaultValue="Anda adalah customer service yang ramah dan helpful. Gunakan bahasa Indonesia yang natural."
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button className="rounded-lg bg-[#1f3c88] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f3c88]/90">
                    Save Configuration
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}