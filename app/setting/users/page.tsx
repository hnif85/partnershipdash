"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "crm" });
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem("crm_user");
    if (!userStr) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(userStr);
    if (user.role !== "super_admin") {
      router.push("/");
      return;
    }

    setCurrentUser(user);
    loadUsers();
  }, [router]);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem("crm_token");
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_users", token }),
      });

      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const token = localStorage.getItem("crm_token");
    const action = editingUser ? "update_user" : "create_user";
    
    const body: any = { action, token };
    if (editingUser) {
      body.userId = editingUser.id;
    }
    if (formData.name) body.name = formData.name;
    if (formData.password) body.password = formData.password;
    if (formData.role) body.role = formData.role;
    if (!editingUser) {
      body.email = formData.email;
    }

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingUser(null);
        setFormData({ name: "", email: "", password: "", role: "crm" });
        loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save user");
      }
    } catch (error) {
      console.error("Failed to save user:", error);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    const token = localStorage.getItem("crm_token");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_user", token, userId }),
      });

      if (res.ok) {
        loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: "", role: user.role });
    setShowModal(true);
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: "bg-red-100 text-red-700",
      partnership: "bg-blue-100 text-blue-700",
      crm: "bg-green-100 text-green-700",
    };
    return colors[role] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1f3c88] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb] px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">Settings</p>
            <h1 className="text-2xl font-bold text-[#0f172a]">User Management</h1>
            <p className="text-sm text-zinc-600">Kelola user yang dapat mengakses CRM</p>
          </div>
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData({ name: "", email: "", password: "", role: "crm" });
              setShowModal(true);
            }}
            className="rounded-lg bg-[#1f3c88] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f3c88]/90"
          >
            + Tambah User
          </button>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Last Login</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{user.name}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-1 text-xs font-medium ${getRoleBadge(user.role)}`}>
                        {user.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-1 text-xs font-medium ${user.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(user)}
                        className="mr-2 rounded bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
                      >
                        Edit
                      </button>
                      {currentUser?.id !== user.id && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900">
                {editingUser ? "Edit User" : "Tambah User"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    required
                  />
                </div>
                {!editingUser && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    {editingUser ? "New Password (opsional)" : "Password"}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    placeholder={editingUser ? "Kosongkan jika tidak diubah" : "required"}
                    required={!editingUser}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="partnership">Partnership</option>
                    <option value="crm">CRM</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-[#1f3c88] py-2 text-sm font-medium text-white hover:bg-[#1f3c88]/90"
                  >
                    {editingUser ? "Update" : "Simpan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}