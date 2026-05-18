"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { activities } from "./activityTarget/data";

type User = {
  id: number;
  email: string;
  name: string;
  role: "super_admin" | "partnership" | "crm";
};

type NavItem = { href: string; label: string };
type NavGroup = { label: string; items: NavItem[] };

const crmItems: NavItem[] = [
  { href: "/crm", label: "CRM" },
  { href: "/crm/campaigns", label: "Campaigns" },
  { href: "/crm/auto-replies", label: "Auto Replies" },
  { href: "/crm/knowledge", label: "Knowledge Base" },
];

const activityItems: NavItem[] = activities.map((a) => ({
  href: `/activityTarget/${a.slug}`,
  label: a.title,
}));

const menuGroups: Record<User["role"], NavGroup[]> = {
  super_admin: [
    { label: "Overview", items: [{ href: "/", label: "Dashboard" }] },
    { label: "Data", items: [{ href: "/customers", label: "Customers" }] },
    { label: "Finance", items: [{ href: "/sales", label: "Sales" }] },
    { label: "Analytics", items: [{ href: "/referral", label: "Referral" }] },
    {
      label: "Targets",
      items: [{ href: "/activityTarget", label: "Activity Targets" }, ...activityItems],
    },
    { label: "Events", items: [{ href: "/events", label: "Events" }] },
    { label: "CRM", items: crmItems },
    {
      label: "Settings",
      items: [
        { href: "/setting/users", label: "User Management" },
        { href: "/setting/excludeMail", label: "Excluded Emails" },
      ],
    },
  ],
  partnership: [
    { label: "Overview", items: [{ href: "/", label: "Dashboard" }] },
    { label: "Data", items: [{ href: "/customers", label: "Customers" }] },
    { label: "Finance", items: [{ href: "/sales", label: "Sales" }] },
    { label: "Analytics", items: [{ href: "/referral", label: "Referral" }] },
    {
      label: "Targets",
      items: [{ href: "/activityTarget", label: "Activity Targets" }, ...activityItems],
    },
    { label: "Events", items: [{ href: "/events", label: "Events" }] },
  ],
  crm: [
    { label: "Overview", items: [{ href: "/crm", label: "Dashboard" }] },
    { label: "CRM", items: crmItems },
  ],
};

// Groups that start closed by default
const DEFAULT_CLOSED = new Set(["Settings"]);

function isItemActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const userStr = localStorage.getItem("crm_user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  // Auto-open groups that contain the active path; skip DEFAULT_CLOSED groups on initial mount
  useEffect(() => {
    if (!user) return;
    const groups = menuGroups[user.role];
    setOpenGroups((prev) => {
      const next = new Set(prev);
      groups.forEach((group) => {
        const hasActive = group.items.some((item) => isItemActive(item.href, pathname));
        if (hasActive) {
          next.add(group.label);
        } else if (!prev.has(group.label) && !DEFAULT_CLOSED.has(group.label)) {
          // Open non-Settings groups by default on first load
          next.add(group.label);
        }
      });
      return next;
    });
  }, [user, pathname]);

  const handleLogout = async () => {
    const token = localStorage.getItem("crm_token");
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout", token }),
    });
    localStorage.removeItem("crm_token");
    localStorage.removeItem("crm_user");
    router.push("/login");
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const groups = user ? menuGroups[user.role] : menuGroups.crm;

  return (
    <aside
      className={`sticky top-0 hidden h-screen flex-shrink-0 border-r border-zinc-200 bg-white/90 shadow-sm backdrop-blur transition-all duration-300 lg:flex ${
        isCollapsed ? "w-16 px-2" : "w-64 px-5"
      }`}
    >
      <div className="flex h-full w-full flex-col gap-6">
        {/* Logo */}
        <div className="flex items-center justify-between pt-5">
          <Link
            href="/"
            className={`space-y-1 ${isCollapsed ? "flex justify-center" : ""}`}
            title={isCollapsed ? "Partnership Growth Dashboard" : undefined}
          >
            {isCollapsed ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1f3c88] text-white font-bold text-sm">
                P
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
                  Partnership
                </p>
                <p className="text-lg font-semibold text-[#0f172a]">Growth Dashboard</p>
              </>
            )}
          </Link>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pb-2">
          {groups.map((group, gi) => {
            const isOpen = openGroups.has(group.label);
            const groupHasActive = group.items.some((item) => isItemActive(item.href, pathname));

            if (isCollapsed) {
              // Collapsed: flat items, no group headers
              return (
                <div key={group.label} className={gi > 0 ? "mt-1" : ""}>
                  {group.items.map((item) => {
                    const active = isItemActive(item.href, pathname);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={`mb-0.5 flex h-9 w-full items-center justify-center rounded-lg text-xs font-bold transition ${
                          active ? "bg-[#e8ecf8] text-[#1f3c88]" : "text-zinc-600 hover:bg-zinc-100"
                        }`}
                      >
                        {item.label.charAt(0).toUpperCase()}
                      </Link>
                    );
                  })}
                </div>
              );
            }

            return (
              <div key={group.label} className="mt-1">
                {/* Group header / toggle */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition hover:bg-zinc-50 ${
                    groupHasActive ? "text-[#1f3c88]" : "text-zinc-500"
                  }`}
                >
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      groupHasActive ? "text-[#1f3c88]" : "text-zinc-400"
                    }`}
                  >
                    {group.label}
                  </span>
                  <ChevronIcon open={isOpen} />
                </button>

                {/* Group items */}
                {isOpen && (
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const active = isItemActive(item.href, pathname);
                      // Sub-items (activity slugs) get slight indent
                      const isSub = item.href.startsWith("/activityTarget/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center rounded-lg py-2 text-sm font-medium transition ${
                            isSub ? "pl-5 pr-3" : "px-3"
                          } ${
                            active
                              ? "bg-[#e8ecf8] text-[#1f3c88]"
                              : "text-zinc-700 hover:bg-zinc-100"
                          }`}
                        >
                          {isSub && (
                            <span className="mr-2 h-1 w-1 flex-shrink-0 rounded-full bg-current opacity-40" />
                          )}
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User section */}
        {user && (
          <div className={`border-t border-zinc-200 pt-4 pb-4 ${isCollapsed ? "px-2" : "px-1"}`}>
            {isCollapsed ? (
              <button
                onClick={handleLogout}
                className="flex h-10 w-full items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                title="Logout"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-2">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#1f3c88] text-sm font-semibold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">{user.name}</p>
                    <p className="text-xs text-zinc-500 capitalize">{user.role.replace("_", " ")}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 rounded-lg border border-red-200 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
