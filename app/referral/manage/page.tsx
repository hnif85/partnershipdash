"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ReferralPartner {
  id: string;
  code: string;
  partner: string;
  is_gov: boolean;
  created_at: string;
  updated_at: string;
}

type NewReferral = {
  code: string;
  partner: string;
  is_gov: boolean;
};

export default function ReferralManagePage() {
  const [referralPartners, setReferralPartners] = useState<ReferralPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<ReferralPartner | null>(null);
  const [formData, setFormData] = useState<NewReferral>({ code: "", partner: "", is_gov: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReferralPartners = async () => {
    try {
      const res = await fetch('/api/referral/manage', { cache: "no-store" });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      setReferralPartners(data.partners || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferralPartners();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.partner.trim()) {
      setError("Code and partner name are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingPartner
        ? `/api/referral/manage/${editingPartner.id}`
        : '/api/referral/manage';

      const method = editingPartner ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Operation failed');
      }

      await loadReferralPartners();
      setShowForm(false);
      setFormData({ code: "", partner: "", is_gov: false });
      setEditingPartner(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (partner: ReferralPartner) => {
    setEditingPartner(partner);
    setFormData({
      code: partner.code || '',
      partner: partner.partner || '',
      is_gov: partner.is_gov || false
    });
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (partner: ReferralPartner) => {
    if (!confirm(`Are you sure you want to delete referral partner "${partner.partner}" (${partner.code})?`)) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/referral/manage/${partner.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      await loadReferralPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingPartner(null);
    setFormData({ code: "", partner: "", is_gov: false });
    setError(null);
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-[#0f172a]">Referral Partners Management</h1>
            <p className="text-sm text-zinc-600">
              Manage referral partner codes and information.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/referral" className="text-[#1f3c88] hover:underline">
                ← Back to Referral Dashboard
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowForm(true); setEditingPartner(null); setFormData({ code: "", partner: "", is_gov: false }); }}
              className="rounded-lg border border-green-600 bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 hover:border-green-700"
            >
              Add New Partner
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {showForm && (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">
              {editingPartner ? 'Edit Referral Partner' : 'Add New Referral Partner'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Referral Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                    placeholder="e.g., ABC123"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Partner Name *
                  </label>
                  <input
                    type="text"
                    value={formData.partner}
                    onChange={(e) => setFormData({...formData, partner: e.target.value})}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#1f3c88] focus:outline-none focus:ring-1 focus:ring-[#1f3c88]"
                    placeholder="Partner company name"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_gov"
                  checked={formData.is_gov}
                  onChange={(e) => setFormData({...formData, is_gov: e.target.checked})}
                  className="h-4 w-4 text-[#1f3c88] focus:ring-[#1f3c88] border-zinc-300 rounded"
                />
                <label htmlFor="is_gov" className="ml-2 text-sm text-zinc-700">
                  Government / BUMN partner
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg border border-green-600 bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 hover:border-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingPartner ? 'Update Partner' : 'Add Partner')}
                </button>
              </div>
            </form>
          </div>
        )}

        <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-500">Referral Partners</p>
              <h2 className="text-lg font-semibold text-[#0f172a]">Partner Management</h2>
            </div>
            <div className="text-sm text-zinc-500">
              Total {referralPartners.length} partners
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-6 text-sm text-zinc-600">Loading partners...</div>
          ) : !referralPartners.length ? (
            <div className="px-5 py-6 text-sm text-zinc-600">No referral partners found.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full table-fixed divide-y divide-zinc-200">
                <thead className="bg-[#f9fafb]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Partner
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {referralPartners.map((partner) => (
                    <tr key={partner.id} className="hover:bg-[#f7f8fb]">
                      <td className="px-4 py-3 text-sm font-semibold text-[#1f3c88]">
                        {partner.code}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <div className="font-semibold">{partner.partner}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          partner.is_gov
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {partner.is_gov ? 'BUMN/Gov' : 'Private'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        {new Date(partner.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(partner)}
                            className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(partner)}
                            className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
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
      </div>
    </main>
  );
}