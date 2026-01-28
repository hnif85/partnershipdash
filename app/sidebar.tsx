"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { activities } from "./activity/data";

const navItems = [
  { href: "/", label: "Activity Targets", tag: "Overview" },
  { href: "/weekly", label: "Weekly Overview", tag: "Funnel" },
  { href: "/customers", label: "Customers", tag: "Data" },
  { href: "/sales", label: "Sales", tag: "Finance" },
  { href: "/referral", label: "Referral", tag: "Analytics" },
  { href: "/setting/excludeMail", label: "Excluded Emails", tag: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

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

          {!isCollapsed && (
            <>
              <div className="border-t border-zinc-200 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Activity detail
                </p>
                <div className="flex flex-col gap-1">
                  {activities.map((activity) => {
                    const href = `/activity/${activity.slug}`;
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
      </div>
    </aside>
  );
}
