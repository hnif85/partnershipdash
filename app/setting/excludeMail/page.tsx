"use client";

import { useEffect, useState } from "react";

type ExcludedEmail = {
  email: string;
  reason: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ApiResponse = {
  emails?: ExcludedEmail[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  email?: ExcludedEmail;
  error?: string;
};

const formatDate = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
};

export default function ExcludeMailPage() {
  const [emails, setEmails] = useState<ExcludedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingEmail, setEditingEmail] = useState<ExcludedEmail | null>(null);
  const [formData, setFormData] = useState({ email: "", emails: "", reason: "", is_active: true });
  const [bulkMode, setBulkMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pageSize = 50;

  useEffect(() => {
    loadEmails();
  }, [page, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const loadEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        search: search.trim(),
      });

      const res = await fetch(`/api/setting/excludeMail?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = (await res.json()) as ApiResponse;
      if (!data.emails) throw new Error(data.error || "Payload kosong");
      setEmails(data.emails);
      setTotalCount(data.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate bulk mode
      if (bulkMode && !editingEmail) {
        const emailList = formData.emails.split('\n')
          .map(e => e.trim())
          .filter(e => e.length > 0);

        if (emailList.length === 0) {
          alert("Masukkan setidaknya satu email yang valid");
          return;
        }

        // Basic email validation
        const invalidEmails = emailList.filter(email =>
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        );

        if (invalidEmails.length > 0) {
          alert(`Email tidak valid: ${invalidEmails.join(', ')}`);
          return;
        }
      }

      const url = `/api/setting/excludeMail`;
      const method = editingEmail ? "PUT" : "POST";
      const body = editingEmail
        ? { oldEmail: editingEmail.email, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Operation failed");
      }

      setShowModal(false);
      setEditingEmail(null);
      setFormData({ email: "", emails: "", reason: "", is_active: true });
      setBulkMode(false);

      // Show detailed success message for bulk insert
      if (bulkMode && data.inserted !== undefined) {
        let message = `Berhasil menambahkan ${data.inserted} email`;
        if (data.skipped > 0) {
          message += `, ${data.skipped} email di-skip (sudah ada)`;
        }
        message += ` dari total ${data.total_processed} email yang diproses.`;

        if (data.duplicates && data.duplicates.length > 0) {
          message += `\n\nEmail yang sudah ada: ${data.duplicates.slice(0, 5).join(', ')}`;
          if (data.duplicates.length > 5) {
            message += `... dan ${data.duplicates.length - 5} lainnya`;
          }
        }

        alert(message);
      }

      loadEmails();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (email: ExcludedEmail) => {
    setEditingEmail(email);
    setFormData({
      email: email.email,
      emails: "",
      reason: email.reason,
      is_active: email.is_active,
    });
    setBulkMode(false);
    setShowModal(true);
  };

  const handleDelete = async (email: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus email ini?")) return;

    try {
      const res = await fetch(`/api/setting/excludeMail?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Delete failed");
      }

      loadEmails();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const openAddModal = () => {
    setEditingEmail(null);
    setFormData({ email: "", emails: "", reason: "", is_active: true });
    setBulkMode(false);
    setShowModal(true);
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-[#0f172a]">Demo Excluded Emails</h1>
            <p className="text-sm text-zinc-600">
              Kelola daftar email yang dikecualikan dari akun demo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={openAddModal}
              className="rounded-lg border border-green-600 bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 hover:border-green-700"
              type="button"
            >
              Tambah Email
            </button>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari email atau alasan..."
              className="w-full min-w-[240px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88] md:w-auto"
            />
          </div>
        </header>

        <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-500">Daftar Email</p>
              <h2 className="text-lg font-semibold text-[#0f172a]">Excluded Emails</h2>
            </div>
            <div className="text-sm text-zinc-500">
              Total: {totalCount} email
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-6 text-sm text-zinc-600">Memuat data...</div>
          ) : error ? (
            <div className="px-5 py-6 text-sm text-red-600">Gagal memuat: {error}</div>
          ) : !emails.length ? (
            <div className="px-5 py-6 text-sm text-zinc-600">Tidak ada data email yang cocok.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full table-fixed divide-y divide-zinc-200">
                <colgroup>
                  <col className="w-[25%]" />
                  <col className="w-[30%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                </colgroup>
                <thead className="bg-[#f9fafb]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Alasan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Dibuat
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {emails.map((email) => (
                    <tr key={email.email} className="hover:bg-[#f7f8fb]">
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <div className="font-semibold text-[#1f3c88]">{email.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <div>{email.reason}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          email.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {email.is_active ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <div>{formatDate(email.created_at)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(email)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(email.email)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-zinc-500">
            Menampilkan {(page - 1) * pageSize + 1} -{" "}
            {Math.min(page * pageSize, totalCount)} dari {totalCount} email
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                page === 1
                  ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                  : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400"
              }`}
            >
              Prev
            </button>
            <div className="text-sm font-semibold text-zinc-700">
              {page} / {Math.ceil(totalCount / pageSize)}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
              disabled={page === Math.ceil(totalCount / pageSize)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                page === Math.ceil(totalCount / pageSize)
                  ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                  : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">
              {editingEmail ? "Edit Email" : "Tambah Email"}
            </h3>
            {!editingEmail && (
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setBulkMode(false)}
                  className={`px-3 py-1 text-sm rounded ${!bulkMode ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}
                >
                  Single
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode(true)}
                  className={`px-3 py-1 text-sm rounded ${bulkMode ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}
                >
                  Bulk
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              {bulkMode && !editingEmail ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Emails (satu per baris) *
                  </label>
                  <textarea
                    value={formData.emails}
                    onChange={(e) => setFormData({ ...formData, emails: e.target.value })}
                    placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88] h-32 resize-none"
                    required
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Masukkan satu email per baris
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                    required
                  />
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Alasan *
                </label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                  required
                />
              </div>
              {editingEmail && (
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-zinc-700">Aktif</span>
                  </label>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 hover:border-blue-700"
                  disabled={submitting}
                >
                  {submitting ? "Menyimpan..." : (editingEmail ? "Update" : (bulkMode ? "Tambah Bulk" : "Tambah"))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
