"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SmtpProfile = {
  id: number;
  profile_name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  sender_name: string;
  sender_email: string;
  daily_limit: number;
  is_active: boolean;
  password_exists: boolean;
  created_at: string;
  updated_at: string;
};

const GMAIL_PRESET = {
  label: "Gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  description: "Port 587 (TLS) — recommended. Gunakan App Password, bukan password biasa.",
};

const PROVIDER_PRESETS = [
  { label: "Gmail (TLS)", host: "smtp.gmail.com", port: 587, secure: false, desc: "App Password required" },
  { label: "Gmail (SSL)", host: "smtp.gmail.com", port: 465, secure: true, desc: "Alternatif port SSL" },
  { label: "Outlook/Hotmail", host: "smtp-mail.outlook.com", port: 587, secure: false, desc: "Microsoft 365" },
  { label: "Yahoo Mail", host: "smtp.mail.yahoo.com", port: 465, secure: true, desc: "Port SSL" },
  { label: "SendGrid", host: "smtp.sendgrid.net", port: 587, secure: false, desc: "API Key sebagai username" },
  { label: "Mailgun", host: "smtp.mailgun.org", port: 587, secure: false, desc: "Default SMTP" },
  { label: "Mailtrap (Test)", host: "sandbox.smtp.mailtrap.io", port: 2525, secure: false, desc: "Testing SMTP" },
];

export default function EmailSettingsPage() {
  const [profiles, setProfiles] = useState<SmtpProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<SmtpProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form
  const [formProfileName, setFormProfileName] = useState("");
  const [host, setHost] = useState(GMAIL_PRESET.host);
  const [port, setPort] = useState(String(GMAIL_PRESET.port));
  const [secure, setSecure] = useState(GMAIL_PRESET.secure);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [senderName, setSenderName] = useState("MWX Market");
  const [senderEmail, setSenderEmail] = useState("");
  const [dailyLimit, setDailyLimit] = useState("500");
  const [setActive, setSetActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [result, setResult] = useState("");
  const [resultType, setResultType] = useState<"success" | "error" | "info">("info");

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    try {
      const res = await fetch("/api/email/settings");
      const json = await res.json();
      setProfiles(json.profiles || []);
      setActiveProfile(json.activeProfile || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function startNew() {
    setEditingId(null);
    setFormProfileName("");
    setHost(GMAIL_PRESET.host);
    setPort(String(GMAIL_PRESET.port));
    setSecure(GMAIL_PRESET.secure);
    setUsername("");
    setPassword("");
    setSenderName("MWX Market");
    setSenderEmail("");
    setDailyLimit("500");
    setSetActive(true);
    setResult("");
  }

  function startEdit(profile: SmtpProfile) {
    setEditingId(profile.id);
    setFormProfileName(profile.profile_name);
    setHost(profile.host);
    setPort(String(profile.port));
    setSecure(profile.secure);
    setUsername(profile.username);
    setPassword(""); // Password tidak diisi (tersimpan)
    setSenderName(profile.sender_name);
    setSenderEmail(profile.sender_email);
    setDailyLimit(String(profile.daily_limit));
    setSetActive(false);
    setResult("");
  }

  function applyPreset(preset: (typeof PROVIDER_PRESETS)[number]) {
    setHost(preset.host);
    setPort(String(preset.port));
    setSecure(preset.secure);
    setResult(`Preset "${preset.label}" diterapkan (${preset.desc})`);
    setResultType("info");
  }

  async function handleSave() {
    if (!formProfileName.trim()) {
      setResult("Nama profile harus diisi.");
      setResultType("error");
      return;
    }
    if (!username.trim() || !senderEmail.trim()) {
      setResult("Username dan Sender Email harus diisi.");
      setResultType("error");
      return;
    }
    if (!editingId && !password.trim()) {
      setResult("Password harus diisi untuk profile baru.");
      setResultType("error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/email/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          profile_name: formProfileName.trim(),
          host,
          port: parseInt(port),
          secure,
          username: username.trim(),
          password: password.trim() || "********",
          sender_name: senderName.trim(),
          sender_email: senderEmail.trim(),
          daily_limit: parseInt(dailyLimit),
          set_active: setActive,
          force_new: !editingId,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setResult(`✅ Profile "${json.settings.profile_name}" saved!`);
        setResultType("success");
        fetchProfiles();
        startNew();
      } else {
        setResult(`❌ ${json.error || "Gagal menyimpan"}`);
        setResultType("error");
      }
    } catch (err: any) {
      setResult(`❌ ${err.message}`);
      setResultType("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetActive(profileId: number) {
    try {
      await fetch("/api/email/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_active", profile_id: profileId }),
      });
      fetchProfiles();
      setResult(`✅ Active profile changed`);
      setResultType("success");
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(profileId: number) {
    if (!confirm("Hapus profile SMTP ini?")) return;
    try {
      await fetch("/api/email/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", profile_id: profileId }),
      });
      fetchProfiles();
      setResult(`Profile deleted`);
      setResultType("info");
    } catch (err) {
      console.error(err);
    }
  }

  function handleEditProfile(profile: SmtpProfile) {
    startEdit(profile);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        {/* Header */}
        <header className="flex flex-col gap-2 border-b border-zinc-200 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">Email Marketing</p>
              <h1 className="text-3xl font-bold text-[#0f172a]">SMTP Profiles</h1>
              <p className="max-w-3xl text-sm text-zinc-600">
                Kelola multiple SMTP profile (Gmail, Outlook, SendGrid, dll). 
                Profile active akan digunakan untuk mengirim email blast.
              </p>
            </div>
            <Link
              href="/email"
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Dashboard
            </Link>
          </div>
        </header>

        {/* Profile Cards */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
              <p className="text-zinc-400">Belum ada SMTP profile. Buat profile baru untuk mulai mengirim email.</p>
            </div>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.id}
                className={`rounded-xl border p-5 shadow-sm transition ${
                  profile.is_active
                    ? "border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                {/* Active badge */}
                {profile.is_active && (
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    ACTIVE
                  </div>
                )}

                {/* Profile icon + name */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-[#0f172a]">{profile.profile_name}</h3>
                    <p className="mt-0.5 text-xs text-zinc-500">{profile.username}</p>
                  </div>
                  <div className="flex gap-1">
                    {!profile.is_active && (
                      <button
                        onClick={() => handleSetActive(profile.id)}
                        className="rounded-md border border-transparent px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
                        title="Set as active"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => handleEditProfile(profile)}
                      className="rounded-md border border-transparent px-2 py-1 text-xs font-medium text-[#1f3c88] hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(profile.id)}
                      className="rounded-md border border-transparent px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Del
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-3 space-y-1 text-xs text-zinc-600">
                  <p><span className="font-medium text-zinc-500">Host:</span> {profile.host}:{profile.port}</p>
                  <p><span className="font-medium text-zinc-500">Sender:</span> {profile.sender_name} &lt;{profile.sender_email}&gt;</p>
                  <p><span className="font-medium text-zinc-500">Limit:</span> {profile.daily_limit}/day</p>
                  <p><span className="font-medium text-zinc-500">Security:</span> {profile.secure ? "SSL (465)" : "TLS (587)"}</p>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Add New / Edit Form */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0f172a]">
              {editingId ? `Edit Profile: ${formProfileName}` : "Buat SMTP Profile Baru"}
            </h2>
            {editingId && (
              <button
                onClick={startNew}
                className="text-sm text-[#1f3c88] hover:underline"
              >
                + New Profile
              </button>
            )}
          </div>

          {/* Profile Name */}
          <div className="mb-5">
            <label className="mb-1 block text-sm font-medium text-zinc-700">Nama Profile *</label>
            <input
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
              value={formProfileName}
              onChange={(e) => setFormProfileName(e.target.value)}
              placeholder="e.g. Gmail Utama, Gmail Marketing, SendGrid API"
            />
            <p className="mt-1 text-xs text-zinc-400">
              Nama profile untuk membedakan multiple SMTP config. Contoh: "Gmail - Marketing", "Gmail - Transaksi"
            </p>
          </div>

          {/* Provider Presets */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Provider Presets</label>
            <div className="flex flex-wrap gap-2">
              {PROVIDER_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    host === p.host && port === String(p.port)
                      ? "border-[#1f3c88] bg-[#eef2ff] text-[#1f3c88]"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Klik preset untuk auto-fill host & port. Sesuaikan username/password sesuai provider.
            </p>
          </div>

          {/* SMTP Fields */}
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">SMTP Host</label>
                <input
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Port</label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={secure}
                    onChange={(e) => setSecure(e.target.checked)}
                    className="rounded border-zinc-300 text-[#1f3c88] focus:ring-[#1f3c88]"
                  />
                  <span className="text-sm text-zinc-700">SSL / Secure</span>
                </label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Daily Limit</label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                />
              </div>
            </div>

            {/* Gmail specific info */}
            {host.includes("gmail.com") && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <div className="flex gap-2">
                  <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Cara setting Gmail:</p>
                    <ol className="mt-1 list-decimal pl-4 text-xs text-blue-700 space-y-0.5">
                      <li>Aktifkan <strong>2-Step Verification</strong> di Google Account &gt; Security</li>
                      <li>Buat <strong>App Password</strong>: Google Account &gt; Security &gt; App Passwords</li>
                      <li>Pilih app: <strong>Mail</strong>, device: <strong>Other (MWX Blast)</strong></li>
                      <li>Copy 16-digit App Password & paste ke field Password di bawah</li>
                      <li>Port: <strong>587 (TLS)</strong> — recommended. SSL (465) juga bisa.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Username *
                  {host.includes("gmail.com") && (
                    <span className="ml-1 text-xs text-zinc-400">(alamat Gmail kamu)</span>
                  )}
                </label>
                <input
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="contoh@gmail.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Password / App Password *
                  {editingId && (
                    <span className="ml-2 text-xs text-zinc-400">(kosongkan jika tidak diubah)</span>
                  )}
                </label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingId ? "********" : "Masukkan App Password"}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Sender Name</label>
                <input
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="MWX Market"
                />
                <p className="mt-1 text-xs text-zinc-400">Nama yang muncul di "From" recipient</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Sender Email *</label>
                <input
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#1f3c88] focus:outline-none"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="noreply@mwxmarket.ai"
                />
                <p className="mt-1 text-xs text-zinc-400">Alamat email pengirim</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="setActive"
                checked={setActive}
                onChange={(e) => setSetActive(e.target.checked)}
                className="rounded border-zinc-300 text-[#1f3c88] focus:ring-[#1f3c88]"
              />
              <label htmlFor="setActive" className="text-sm text-zinc-700">
                Set sebagai profile aktif (digunakan untuk kirim email)
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[#1f3c88] px-6 py-2 text-sm font-semibold text-white hover:bg-[#1f3c88]/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update Profile" : "Simpan Profile Baru"}
              </button>
              {editingId && (
                <button
                  onClick={startNew}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {/* Result */}
            {result && (
              <div className={`rounded-lg border p-3 ${
                resultType === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                resultType === "error" ? "bg-red-50 border-red-200 text-red-700" :
                "bg-blue-50 border-blue-200 text-blue-700"
              }`}>
                <p className="text-sm">{result}</p>
              </div>
            )}
          </div>
        </section>

        {/* Tips */}
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <h3 className="text-sm font-semibold text-zinc-700">💡 Tips Multiple SMTP Profiles</h3>
          <ul className="mt-2 space-y-1 text-xs text-zinc-600">
            <li>• Buat <strong>multiple profile</strong> untuk akun Gmail berbeda (marketing@, transaksi@, dll)</li>
            <li>• Hanya <strong>1 profile active</strong> yang digunakan untuk kirim email blast</li>
            <li>• Ganti profile active kapan saja tanpa kehilangan data profile lain</li>
            <li>• Untuk Gmail: wajib pakai <strong>App Password</strong> (bukan password biasa)</li>
            <li>• Daily limit membantu mencegah rate limiting dari Gmail (500/hari recommended)</li>
            <li>• Untuk testing: gunakan Mailtrap agar tidak terkirim ke email real</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
