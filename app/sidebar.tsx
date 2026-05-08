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

// Role-based menu configuration
const menuConfig = {
  super_admin: [
    { href: "/", label: "Dashboard", tag: "Overview" },
    { href: "/activityTarget", label: "Activity Targets", tag: "Targets" },
    { href: "/customers", label: "Customers", tag: "Data" },
    { href: "/sales", label: "Sales", tag: "Finance" },
    { href: "/referral", label: "Referral", tag: "Analytics" },
    { href: "/events", label: "Events", tag: "Events" },
    { href: "/crm", label: "CRM", tag: "Engagement" },
    //{ href: "/helpdesk/v2", label: "AI Helpdesk", tag: "Support" },
    { href: "/setting/users", label: "User Management", tag: "Settings" },
    { href: "/setting/excludeMail", label: "Excluded Emails", tag: "Settings" },
  ],
  partnership: [
    { href: "/", label: "Dashboard", tag: "Overview" },
    { href: "/activityTarget", label: "Activity Targets", tag: "Targets" },
    { href: "/customers", label: "Customers", tag: "Data" },
    { href: "/sales", label: "Sales", tag: "Finance" },
    { href: "/referral", label: "Referral", tag: "Analytics" },
    { href: "/events", label: "Events", tag: "Events" },
    //{ href: "/helpdesk/v2", label: "AI Helpdesk", tag: "Support" },
  ],
  crm: [
    //{ href: "/", label: "Dashboard", tag: "Overview" },
    { href: "/crm", label: "Dashboard", tag: "Engagement" },
    { href: "/helpdesk/v2", label: "AI Helpdesk", tag: "Support" },
  ],
};

const crmItems = [
  //{ href: "/helpdesk/v2", label: "WhatsApp Inbox" },
  { href: "/crm/campaigns", label: "Campaigns" },
  { href: "/crm/auto-replies", label: "Auto Replies" },
  { href: "/crm/knowledge", label: "Knowledge Base" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("crm_user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

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

  const navItems = user ? menuConfig[user.role] : menuConfig.crm;

  const showCrmSection = user && ["super_admin", "crm"].includes(user.role);

  return (
    <aside className={`sticky top-0 hidden h-screen flex-shrink-0 border-r border-zinc-200 bg-white/90 shadow-sm backdrop-blur transition-all duration-300 lg:flex ${
      isCollapsed ? 'w-16 px-2' : 'w-64 px-5'
    }`}>
      <div className="flex h-full w-full flex-col gap-8">
        <div className="flex items-center justify-between">
          <Link href="/" className={`space-y-1 ${isCollapsed ? 'flex justify-center' : ''}`} title={isCollapsed ? "Partnership Growth Dashboard" : undefined}>
            {isCollapsed ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1f3c88] text-white font-bold text-sm">
                P
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
                  Partnership
                </p>
                <p className="text-lg font-semibold text-[#0f172a]">
                  Growth Dashboard
                </p>
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

        <div className="flex flex-1 flex-col gap-4">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-center rounded-lg py-2 text-sm font-medium transition ${
                    active
                      ? "bg-[#e8ecf8] text-[#1f3c88]"
                      : "text-zinc-700 hover:bg-zinc-100"
                  } ${isCollapsed ? 'px-2' : 'px-3'}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  {isCollapsed ? (
                    <span className="text-xs font-bold">
                      {item.label.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <div className="flex w-full items-center justify-between">
                      <span>{item.label}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                        {item.tag}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {!isCollapsed && showCrmSection && (
            <>
              <div className="border-t border-zinc-200 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  CRM
                </p>
                <div className="flex flex-col gap-1">
                  {crmItems.map((item) => {
                    const href = item.href;
                    const active = pathname === href || pathname?.startsWith(`${href}/`);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                          active
                            ? "bg-[#e8ecf8] text-[#1f3c88] font-semibold"
                            : "text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Activity Targets
                </p>
                <div className="flex flex-col gap-1">
                  {activities.map((activity) => {
                    const href = `/activityTarget/${activity.slug}`;
                    const active =
                      pathname === href || pathname?.startsWith(`${href}`);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                          active
                            ? "bg-[#e8ecf8] text-[#1f3c88] font-semibold"
                            : "text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        <span className="truncate">{activity.title}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                          Target
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-zinc-200 bg-[#f7f8fb] px-3 py-3 text-sm text-zinc-600">
                <p className="font-semibold text-[#0f172a]">Need more views?</p>
                <p className="text-xs text-zinc-500">
                  Tambahkan halaman baru untuk cohort atau analitik transaksi detail.
                </p>
              </div>
            </>
          )}
        </div>

        {/* User Section */}
        {user && (
          <div className={`border-t border-zinc-200 pt-4 ${isCollapsed ? 'px-2' : 'px-3'}`}>
            {isCollapsed ? (
              <button
                onClick={handleLogout}
                className="flex h-10 w-full items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                title="Logout"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1f3c88] text-white font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{user.name}</p>
                    <p className="text-xs text-zinc-500 capitalize">{user.role.replace("_", " ")}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 rounded-lg border border-red-200 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
